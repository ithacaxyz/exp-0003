import { P256, PublicKey } from 'ox'

import type { KeyPair, Env } from '#types.ts'

type GeneratedKeyPair = Omit<KeyPair, 'private_key' | 'id' | 'created_at'>

export const ServerKeyPair = {
  generateAndStore: async (
    env: Env,
    {
      address,
      role = 'session',
      expiry = Math.floor(Date.now() / 1_000) + 60 * 2, // 2 minutes by default
    }: { address: string; expiry?: number; role?: 'session' | 'admin' },
  ): Promise<GeneratedKeyPair> => {
    const privateKey = P256.randomPrivateKey()
    const publicKey = PublicKey.toHex(P256.getPublicKey({ privateKey }), {
      includePrefix: false,
    })

    /**
     * you can have a setup where an address can have multiple keys
     * we are just doing 1 per address in this demo for simplicity
     */
    const deleteStatement = env.DB.prepare(
      /* sql */
      `DELETE FROM keypairs WHERE address = ?;`,
    ).bind(address.toLowerCase())

    const insertStatement = env.DB.prepare(
      /* sql */
      `INSERT INTO keypairs
      (address, public_key, private_key, role, type, expiry)
      VALUES (?, ?, ?, ?, ?, ?);`,
    ).bind(address.toLowerCase(), publicKey, privateKey, role, 'p256', expiry)

    const [, insertQuery] = await env.DB.batch<D1PreparedStatement>([
      deleteStatement,
      insertStatement,
    ])

    if (!insertQuery?.success) {
      console.error(`Failed to insert key pair for address: ${address}`, {
        error: insertQuery?.error,
      })
    }

    return {
      public_key: publicKey,
      role,
      expiry,
      address,
      type: 'p256',
    } as const
  },
  getFromStore: async (env: Env, { address }: { address: string }) => {
    const queryResult = await env.DB.prepare(
      /* sql */ `SELECT * FROM keypairs WHERE address = ?;`,
    )
      .bind(address.toLowerCase())
      .first<KeyPair>()

    if (queryResult) return queryResult

    console.info(`no keypair found for address: ${address}`)
    return undefined
  },

  deleteFromStore: async (env: Env, { address }: { address: string }) => {
    const deleteKeypair = env.DB.prepare(
      /* sql */
      `DELETE FROM keypairs WHERE address = ?;`,
    ).bind(address.toLowerCase())

    const deleteSchedule = env.DB.prepare(
      /* sql */
      `DELETE FROM schedules WHERE address = ?;`,
    ).bind(address.toLowerCase())

    return await env.DB.batch<D1PreparedStatement>([
      deleteKeypair,
      deleteSchedule,
    ])
  },

  deleteAllFromStore: async (env: Env) =>
    await env.DB.prepare(/* sql */ `DELETE FROM keypairs;`).run(),

  '~listFromStore': async (env: Env) => {
    const queryResult = await env.DB.prepare(
      /* sql */ `SELECT * FROM keypairs;`,
    ).all<KeyPair>()

    if (queryResult.success) return queryResult.results

    console.error(queryResult.error)
    return []
  },
}
