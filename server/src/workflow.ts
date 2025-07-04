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
import { exp1Config } from '#contracts.ts'

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

    let transactionsProcessed = 0
    const targetCount = event.payload.count

    while (transactionsProcessed < targetCount) {
      try {
        const result = await step.do(
          `STEP_02: process transaction ${transactionsProcessed + 1}`,
          {
            timeout: 1_000 * 60 * 5, // 5 minutes
            retries: {
              backoff: 'constant',
              delay: '10 seconds',
              limit: 3,
            },
          },
          async () => {
            const { keyPair } = event.payload
            const { calls, address } = scheduleResult

            const porto = getPorto()

            const prepareResult = await porto.provider.request({
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

            const { digest, ...request } = prepareResult

            const signature = Signature.toHex(
              P256.sign({
                payload: digest,
                privateKey: keyPair.private_key,
              }),
            )

            const sendResult = await porto.provider.request({
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

            const [sendPreparedCallsResult] = sendResult

            // Dispose any RPC stubs if they exist
            if (
              prepareResult &&
              typeof prepareResult === 'object' &&
              Symbol.dispose in prepareResult
            ) {
              ;(prepareResult as any)[Symbol.dispose]()
            }
            if (
              sendResult &&
              typeof sendResult === 'object' &&
              Symbol.dispose in sendResult
            ) {
              ;(sendResult as any)[Symbol.dispose]()
            }

            const bundleId = sendPreparedCallsResult?.id
            if (!bundleId) {
              console.error(
                `failed to send prepared calls for ${address}. No bundleId returned from wallet_sendPreparedCalls`,
              )
              throw new Error('failed to send prepared calls')
            }

            const insertQuery = await this.env.DB.prepare(
              /* sql */ `INSERT INTO transactions (address, hash, role, public_key) VALUES (?, ?, ?, ?)`,
            )
              .bind(address, bundleId, keyPair.role, keyPair.public_key)
              .run()

            if (!insertQuery.success) {
              throw new Error('failed to insert transaction')
            }

            console.info(`transaction inserted: ${bundleId}`)
            return {
              success: true,
              hash: bundleId,
              transactionNumber: transactionsProcessed + 1,
            }
          },
        )

        if (result.success) {
          transactionsProcessed++
          console.info(
            `Transaction ${transactionsProcessed}/${targetCount} completed: ${result.hash}`,
          )
        }
      } catch (error) {
        console.error(
          `Error processing transaction ${transactionsProcessed + 1}:`,
          error,
        )

        if (error instanceof NonRetryableError) {
          throw error
        }

        // For retryable errors, the step.do will handle retries automatically
        // If we reach here after all retries are exhausted, we should fail
        throw new NonRetryableError(
          `Failed to process transaction after retries: ${error instanceof Error ? error.message : 'unknown error'}`,
        )
      }

      // Add 10 second delay between transactions as per schedule
      if (transactionsProcessed < targetCount) {
        await step.sleep('delay between transactions', '10 seconds')
      }
    }

    // cleanup
    await step.do('STEP_03: clean up', async () => {
      const deleteScheduleStatement = this.env.DB.prepare(
        /* sql */ `DELETE FROM schedules WHERE address = ?;`,
      ).bind(event.payload.keyPair.address)

      await this.env.DB.batch([deleteScheduleStatement])
      console.info(
        `Cleanup completed for address: ${event.payload.keyPair.address}`,
      )
    })

    console.info(
      `Workflow completed successfully. Processed ${transactionsProcessed}/${targetCount} transactions.`,
    )
  }
}
