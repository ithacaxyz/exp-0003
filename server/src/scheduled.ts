import { Chains } from 'porto'
import { porto } from './config.ts'
import { ServerKeyPair } from './keys.ts'
import type { Schedule } from './types.ts'
import { Address, Hex, Json, P256, Signature } from 'ox'

export async function scheduledTask(
  event: ScheduledController,
  env: Env,
  _context: ExecutionContext,
): Promise<void> {
  const scheduledAt = new Date(event.scheduledTime)
    .toISOString()
    .replaceAll('T', ' ')
    .replaceAll('Z', '')
  console.info(`Cron started - scheduled at: ${scheduledAt}`)

  try {
    const schedulesQuery = await env.DB.prepare(
      /* sql */ `SELECT * FROM schedules;`,
    ).all<Schedule>()

    if (!schedulesQuery.success) {
      console.error(schedulesQuery.error)
      return
    }

    const statements: Array<D1PreparedStatement> = []

    for (const scheduleTask of schedulesQuery.results) {
      const { id, address, schedule, action, calls, created_at } = scheduleTask

      try {
        if (schedule !== '* * * * *') {
          // we're only handling 'once every minute' schedules for now
          console.info('skipping schedule', schedule)
          continue
        }

        const storedKey = await ServerKeyPair.getFromStore(env, { address })

        if (
          !Address.validate(address) ||
          !storedKey ||
          Number(storedKey.expiry) <= Math.floor(Date.now() / 1_000)
        ) {
          console.warn(`Problematic key for: ${address}`, {
            keyExpired:
              Number(storedKey?.expiry) <= Math.floor(Date.now() / 1_000),
            address,
            storedKey,
          })
          // delete the schedule
          const deleteQuery = await env.DB.prepare(
            /* sql */ `DELETE FROM schedules WHERE id = ?;`,
          )
            .bind(id)
            .run()
          if (!deleteQuery.success) return console.error(deleteQuery.error)
          continue
        }

        const { digest, ...request } = await porto.provider.request({
          method: 'wallet_prepareCalls',
          params: [
            {
              from: address,
              calls: Json.parse(calls),
              chainId: Hex.fromNumber(Chains.odysseyTestnet.id),
            },
          ],
        })

        const signature = Signature.toHex(
          P256.sign({
            payload: digest,
            privateKey: storedKey.private_key,
          }),
        )

        const [sendPreparedCallsResult] = await porto.provider.request({
          method: 'wallet_sendPreparedCalls',
          params: [
            {
              ...request,
              signature: {
                value: signature,
                type: storedKey.type,
                publicKey: storedKey.public_key,
              },
            },
          ],
        })

        const hash = sendPreparedCallsResult?.id
        if (!hash) {
          console.error(
            `failed to send prepared calls for ${address}. No hash returned from wallet_sendPreparedCalls`,
          )
          continue
        }

        const statement = env.DB.prepare(
          /* sql */ `INSERT INTO transactions (address, hash, role, public_key) VALUES (?, ?, ?, ?)`,
        ).bind(
          address.toLowerCase(),
          hash,
          storedKey.role,
          storedKey.public_key,
        )

        statements.push(statement)
      } catch (error) {
        console.error(error)
        if (!(error instanceof Error)) continue
        console.error(`Error for ${address}: ${error.message}`)

        const deleteQuery = await env.DB.prepare(
          /* sql */ `DELETE FROM schedules WHERE id = ?;`,
        )
          .bind(id)
          .run()
        console.info(
          deleteQuery.success
            ? `schedule for ${address} deleted`
            : `Deletion failed for ${address}. Error: ${deleteQuery.error}`,
        )
      }
    }

    if (statements.length) {
      const batchResult = await env.DB.batch(statements)

      batchResult.map((item) => {
        console.info(`success: ${item.success}`)
        console.table(item.results)
      })
    }

    console.info(`Total schedules processed: ${schedulesQuery.results.length}`)
    console.info(`Total transactions inserted: ${statements.length}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : error
    console.error(`Cron failed - ${errorMessage}`)
  } finally {
    console.info(
      `Cron completed - total time taken: ${Date.now() - event.scheduledTime}ms`,
    )
  }
}
