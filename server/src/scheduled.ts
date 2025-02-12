import { Chains } from 'Porto'
import { porto } from './config.ts'
import { ServerKeyPair } from './kv-keys.ts'
import { Address, Hex, Json, P256, Signature } from 'ox'

export interface Schedule {
  id: number
  created_at: string
  address: string
  schedule: string
  action: string
  calls: string
}

export async function scheduledTask(
  event: ScheduledController,
  env: Env,
  context: ExecutionContext,
): Promise<void> {
  const scheduledAt = new Date(event.scheduledTime)
    .toISOString()
    .replaceAll('T', ' ')
    .replaceAll('Z', '')
  console.info(`Cron started - scheduled at: ${scheduledAt}`)

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

    console.info('address', address)

    try {
      if (schedule !== '* * * * *') {
        // we're only handling 'once every minute' schedules for now
        console.info('skipping schedule', schedule)
        continue
      }

      const storedKey = await ServerKeyPair.getFromKV(env, { address })
      console.info('stordKeye')
      console.info(storedKey)
      if (
        !Address.validate(address) ||
        !storedKey ||
        Number(storedKey.expiry) < Math.floor(Date.now() / 1_000)
      ) {
        console.warn(`Problematic key for: ${address}`)
        // delete the schedule
        const deleteQuery = await env.DB.prepare(
          /* sql */ `DELETE FROM schedules WHERE id = ?;`,
        )
          .bind(id)
          .run()
        if (!deleteQuery.success) return console.error(deleteQuery.error)
        continue
      }

      console.info('preparing calls')
      console.info(calls)
      const { digest, ...request } = await porto.provider.request({
        method: 'wallet_prepareCalls',
        params: [
          {
            calls: Json.parse(calls),
            chainId: Hex.fromNumber(Chains.odysseyTestnet.id),
          },
        ],
      })
      console.info('digest')
      console.info(digest)
      console.info('request')
      console.info(request)

      const signature = Signature.toHex(
        P256.sign({
          payload: digest,
          privateKey: storedKey.privateKey,
        }),
      )

      console.info('signature', signature)

      const [sendPreparedCallsResult] = await porto.provider.request({
        method: 'wallet_sendPreparedCalls',
        params: [
          {
            ...request,
            signature: {
              value: signature,
              type: storedKey.type,
              publicKey: storedKey.publicKey,
            },
          },
        ],
      })
      console.info('sendPreparedCallsResult')
      console.info(sendPreparedCallsResult)

      const hash = sendPreparedCallsResult?.id
      if (!hash) {
        console.error(
          `failed to send prepared calls for ${address}. No hash returned from wallet_sendPreparedCalls`,
        )
        continue
      }

      const statement = env.DB.prepare(
        /* sql */ `INSERT INTO transactions (address, hash, role, public_key) VALUES (?, ?, ?, ?)`,
      ).bind(address.toLowerCase(), hash, storedKey.role, storedKey.publicKey)

      statements.push(statement)
    } catch (error) {
      if (!(error instanceof Error)) {
        console.error(error)
        continue
      }

      if (error.message.includes('has not been authorized')) {
        console.info(error.message, `schedule for ${address} deleted`)

        const deleteQuery = await env.DB.prepare(
          /* sql */ `DELETE FROM schedules WHERE id = ?;`,
        )
          .bind(id)
          .run()
        if (!deleteQuery.success) return console.error(deleteQuery.error)
      }
    }
  }

  if (statements.length) {
    const batchResult = await env.DB.batch(statements)

    batchResult.map((item) => {
      console.info(`success: ${item.success}`)
      console.table(item.results)
    })
  }

  console.info(
    `Cron completed - total time taken: ${Date.now() - event.scheduledTime}ms`,
  )
  console.info(`Total schedules processed: ${schedulesQuery.results.length}`)
  console.info(`Total transactions inserted: ${statements.length}`)
}
