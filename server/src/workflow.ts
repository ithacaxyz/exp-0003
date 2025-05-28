import {
  type WorkflowStep,
  WorkflowEntrypoint,
  type WorkflowEvent,
} from 'cloudflare:workers'
import { Chains } from 'porto'
import { Hex, Json, P256, Signature } from 'ox'
import { NonRetryableError } from 'cloudflare:workflows'

import { getPorto } from '#config.ts'
import type { Env, KeyPair, Schedule } from '#types.ts'

class TransactionInsertedFakeError extends Error {
  override readonly name = 'TransactionInsertedFakeError'
  constructor(message: string) {
    super(`[SUCCESS]: Transaction inserted\n${message}`)
  }
}

export type Params = {
  count: number
  keyPair: KeyPair
}

export class Exp3Workflow extends WorkflowEntrypoint<Env, Params> {
  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env)
  }

  async run(
    event: Readonly<WorkflowEvent<Params>>,
    step: WorkflowStep,
  ): Promise<void> {
    const scheduleResult = await step.do(
      'STEP_01: get schedule',
      { timeout: 3_000 },
      async () => {
        if (!event.payload) throw new NonRetryableError('missing payload')

        const schedule = await this.env.DB.prepare(
          /* sql */ `SELECT * FROM schedules WHERE address = ?;`,
        )
          .bind(event.payload.keyPair.address)
          .first<Schedule>()

        if (!schedule) throw new NonRetryableError('schedule not found')
        return schedule
      },
    )

    try {
      await step.do(
        'STEP_02: process transaction',
        {
          // accounting for processing time
          timeout: 1_000 * 60 * 5, // 5 minutes
          retries: {
            backoff: 'constant',
            delay: '10 seconds',
            limit: Math.min(event.payload.count - 1, 6),
          },
        },
        async () => {
          try {
            const { keyPair } = event.payload
            const { calls, address } = scheduleResult

            const porto = getPorto()

            const { digest, ...request } = await porto.provider.request({
              method: 'wallet_prepareCalls',
              params: [
                {
                  key: {
                    type: keyPair.type,
                    publicKey: keyPair.public_key,
                  },
                  from: address,
                  calls: Json.parse(calls),
                  chainId: Hex.fromNumber(Chains.baseSepolia.id),
                },
              ],
            })

            const signature = Signature.toHex(
              P256.sign({
                payload: digest,
                privateKey: keyPair.private_key,
              }),
            )

            const [sendPreparedCallsResult] = await porto.provider.request({
              method: 'wallet_sendPreparedCalls',
              params: [
                {
                  ...request,
                  signature,
                  key: {
                    type: keyPair.type,
                    publicKey: keyPair.public_key,
                  },
                },
              ],
            })

            const hash = sendPreparedCallsResult?.id
            if (!hash) {
              console.error(
                `failed to send prepared calls for ${address}. No hash returned from wallet_sendPreparedCalls`,
              )
              throw new NonRetryableError('failed to send prepared calls')
            }

            const insertQuery = await this.env.DB.prepare(
              /* sql */ `INSERT INTO transactions (address, hash, role, public_key) VALUES (?, ?, ?, ?)`,
            )
              .bind(address, hash, keyPair.role, keyPair.public_key)
              .run()

            if (!insertQuery.success) {
              throw new NonRetryableError('failed to insert transaction')
            }

            console.info(`transaction inserted: ${hash}`)

            // we will continue throwing an 'error' so that the workflow can be retried
            throw new TransactionInsertedFakeError('transaction inserted')
          } catch (error) {
            if (error instanceof Error) {
              console.warn('STEP_02: error')
              console.error(
                Json.stringify(
                  {
                    name: error.name,
                    cause: error.cause,
                    stack: error.stack,
                    errorMessage: error.message,
                  },
                  undefined,
                  2,
                ),
              )
            }
          }
        },
      )
    } catch (error) {
      if (error instanceof TransactionInsertedFakeError)
        console.info('transaction processing completed')
      else {
        if (error instanceof Error) {
          console.warn('STEP_03: error')
          console.error(
            Json.stringify(
              {
                name: error.name,
                cause: error.cause,
                stack: error.stack,
                errorMessage: error.message,
              },
              undefined,
              2,
            ),
          )
        } else console.error('rip', error)
      }
    }

    // cleanup
    await step.do('STEP_03: clean up', async () => {
      const deleteScheduleStatement = this.env.DB.prepare(
        /* sql */ `DELETE FROM schedules WHERE address = ?;`,
      ).bind(event.payload.keyPair.address)

      await this.env.DB.batch([deleteScheduleStatement])
    })
  }
}
