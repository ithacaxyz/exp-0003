import { Json, P256, PublicKey, type Hex } from 'ox'

export interface GeneratedKeyPair {
  type: 'p256'
  expiry?: number
  publicKey: Hex.Hex
  privateKey: Hex.Hex
  role: 'session' | 'admin'
}

export const ServerKeyPair = {
  generate: async (
    env: Env,
    {
      expiry = Math.floor(Date.now() / 1_000) + 3_600, // 1 hour by default
    }: { expiry?: number },
  ) => {
    const privateKey = P256.randomPrivateKey()
    const publicKey = PublicKey.toHex(P256.getPublicKey({ privateKey }), {
      includePrefix: false,
    })

    return {
      privateKey,
      publicKey,
      role: 'admin',
      expiry,
      type: 'p256',
    } as const
  },

  storeInKV: async (
    env: Env,
    { address, keyPair }: { address: string; keyPair: GeneratedKeyPair },
  ): Promise<void> => {
    env.KEYS_01.put(address.toLowerCase(), Json.stringify(keyPair))
  },

  getFromKV: async (env: Env, { address }: { address: string }) => {
    const value = await env.KEYS_01.get(address.toLowerCase())
    if (!value) return undefined
    return Json.parse(value) as GeneratedKeyPair
  },

  deleteFromKV: async (
    env: Env,
    { address }: { address: string },
  ): Promise<void> => {
    await env.KEYS_01.delete(address.toLowerCase())
  },

  deleteAllFromKV: async (env: Env): Promise<void> => {
    const keys = await env.KEYS_01.list()
    for (const key of keys.keys) {
      await env.KEYS_01.delete(key.name)
    }
  },

  '~listFromKV': async (env: Env) => {
    const keys = await env.KEYS_01.list()
    const keyPairs = await Promise.all(
      keys.keys.map(async ({ name }) => {
        const value = await env.KEYS_01.get(name)
        if (!value) return undefined
        return Json.parse(value) as GeneratedKeyPair
      }),
    )
    return keyPairs.filter((keyPair) => keyPair !== undefined)
  },
}
