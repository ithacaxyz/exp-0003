import { Chains } from 'porto'
import { porto } from './config.ts'
import { ServerKeyPair } from './keys.ts'
import type { Schedule, Env } from './types.ts'
import { DurableObject } from 'cloudflare:workers'
import { Address, Hex, Json, P256, Signature } from 'ox'

const SECOND = 1_000
const ALARM_PERIOD = 10 // seconds

const ALLOWED_SCHEDULES = [
  '* * * * *', // every minute
  '*/10 * * * * *', // every 10 seconds
]

export class Scheduler extends DurableObject<Env> {
  constructor(context: DurableObjectState, env: Env) {
    super(context, env)
    this.ctx.blockConcurrencyWhile(async () => {
      const runCount = await this.#getRunCountValue()
      console.info(`Run count: ${runCount}`)
    })
  }

  async #getRunCountValue() {
    const count = await this.ctx.storage.get<number>('RUN_COUNT')
    return count || 0
  }

  async #incrementRunCount() {
    let count = await this.#getRunCountValue()
    count += 1
    await this.ctx.storage.put('RUN_COUNT', count)
    return count
  }

  async #deleteAlarm(all = true) {
    try {
      if (all) await this.ctx.storage.deleteAll()
      else await this.ctx.storage.deleteAlarm()
      console.info('Alarm deleted')
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error
      console.error('Error deleting alarm', errorMessage)
      return false
    }
  }

  async #setAlarm() {
    try {
      const timer = Date.now() + ALARM_PERIOD * SECOND
      this.ctx.storage.setAlarm(timer)
      console.info(`Next alarm: ${new Date(timer).toISOString()}`)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error
      console.error('Error setting alarm', errorMessage)
      return false
    }
  }

  async #getAlarm() {
    try {
      const existingAlarm = await this.ctx.storage.getAlarm()
      return existingAlarm
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error
      console.error('Error getting alarm', errorMessage)
      return null
    }
  }

  async fetch(_request: Request): Promise<Response> {
    const existingAlarm = await this.#getAlarm()

    if (!existingAlarm) {
      const success = await this.#setAlarm()
      return Response.json({ success })
    }

    // delete outdated alarms and set a new one
    if (existingAlarm < Date.now() + ALARM_PERIOD * SECOND) {
      const deleteSuccess = await this.#deleteAlarm()
      if (!deleteSuccess) return Response.json({ success: false })
      const setSuccess = await this.#setAlarm()
      return Response.json({ success: setSuccess })
    }

    return Response.json({ success: true })
  }

  async alarm(alarmInfo: AlarmInvocationInfo) {
    await this.#incrementRunCount()

    if (alarmInfo?.retryCount !== 0) {
      console.info(
        `This alarm event has been attempted ${alarmInfo?.retryCount} times before.`,
      )
    }

    try {
      const schedulesQuery = await this.env.DB.prepare(
        /* sql */ `SELECT * FROM schedules;`,
      ).all<Schedule>()

      if (!schedulesQuery.success) {
        console.error(schedulesQuery.error)
        return
      }

      console.info(`Found ${schedulesQuery.results.length} schedules`)

      const statements: Array<D1PreparedStatement> = []

      for (const scheduledTask of schedulesQuery.results) {
        const { id, address, schedule, calls, created_at } = scheduledTask

        try {
          if (!ALLOWED_SCHEDULES.includes(schedule)) {
            console.info(`Skipping schedule ${schedule} for ${address}`)
            const deleteQuery = this.env.DB.prepare(
              /* sql */ `DELETE FROM schedules WHERE id = ?;`,
            ).bind(id)
            statements.push(deleteQuery)
            continue
          }

          const storedKey = await ServerKeyPair.getFromStore(this.env, {
            address,
          })

          if (
            !Address.validate(address) ||
            !storedKey ||
            Number(storedKey.expiry) <= Math.floor(Date.now() / 1_000)
          ) {
            console.warn(`Problematic key for: ${address}`)
            // delete the schedule
            const deleteQuery = this.env.DB.prepare(
              /* sql */ `DELETE FROM schedules WHERE id = ?;`,
            ).bind(id)

            console.info(`schedule for ${address} will be deleted`)
            statements.push(deleteQuery)
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

          const statement = this.env.DB.prepare(
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
          const deleteQuery = this.env.DB.prepare(
            /* sql */ `DELETE FROM schedules WHERE id = ?;`,
          ).bind(id)

          statements.push(deleteQuery)
          console.info(`schedule for ${address} will be deleted`)
        }
      }

      if (statements.length > 0) {
        const batchResult = await this.env.DB.batch(statements)

        console.info(`Processed ${statements.length} statements`)
      }
    } finally {
      const existingAlarm = await this.#getAlarm()
      if (!existingAlarm) await this.#setAlarm()
    }
  }
}
