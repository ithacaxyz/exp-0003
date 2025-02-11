import { Chains } from 'Porto'
import { porto } from './config.ts'
import { Hex, Json, P256, Signature, type Address } from 'ox'

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

  if (!schedulesQuery.success) return console.error(schedulesQuery.error)

  const statements: Array<D1PreparedStatement> = []

  for (const scheduleTask of schedulesQuery.results) {
    const { id, address, schedule, action, calls, created_at } = scheduleTask
    try {
      if (schedule !== '* * * * *') {
        // we're only handling 'once every minute' schedules for now
        console.info('skipping schedule', schedule)
        continue
      }

      const storedKey = await env.KEYS_01.get(address.toLowerCase())
      if (!storedKey) {
        console.warn(`Key not found for: ${address}`)
        continue
      }
      console.info(Json.stringify(storedKey, undefined, 2))

      const { account, expiry, role, ...keyPair } = Json.parse(storedKey) as {
        expiry: number
        publicKey: Hex.Hex
        privateKey: Hex.Hex
        account: Address.Address
        role: 'session' | 'admin'
      }

      if (expiry < Math.floor(Date.now() / 1_000)) {
        console.info('key expired', expiry)
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
            version: '1',
            from: account,
            calls: Json.parse(calls),
            chainId: Hex.fromNumber(Chains.odysseyTestnet.id),
          },
        ],
      })

      const signature = Signature.toHex(
        P256.sign({
          payload: digest,
          privateKey: keyPair.privateKey,
        }),
      )

      const [sendPreparedCallsResult] = await porto.provider.request({
        method: 'wallet_sendPreparedCalls',
        params: [
          {
            ...request,
            signature: {
              type: 'p256',
              value: signature,
              publicKey: keyPair.publicKey,
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
      ).bind(address.toLowerCase(), hash, role, keyPair.publicKey)

      statements.push(statement)
    } catch (error) {
      if (error instanceof Error) {
        if (!error.message.includes('has not been authorized')) {
          console.info(error.message, `schedule for ${address} deleted`)

          const deleteQuery = await env.DB.prepare(
            /* sql */ `DELETE FROM schedules WHERE id = ?;`,
          )
            .bind(id)
            .run()
          if (!deleteQuery.success) return console.error(deleteQuery.error)
        }
      } else console.error(error)
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
