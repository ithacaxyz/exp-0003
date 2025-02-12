import { Hono } from 'hono'
import { Address } from 'ox'
import { showRoutes } from 'hono/dev'
import { ServerKeyPair } from './kv-keys'
import { basicAuth } from 'hono/basic-auth'
import { getConnInfo } from 'hono/cloudflare-workers'

const debugApp = new Hono<{ Bindings: Env }>()

/**
 * Debug stored keys, schedules and transactions
 * If `address` is provided, returns the values for the given address
 * Otherwise, returns all keys, schedules & transactions
 */
// this path is `/debug`
debugApp.get('/', async (context) => {
  showRoutes(debugApp, { colorize: true })
  const { remote } = getConnInfo(context)
  const address = context.req.query('address')

    const keys = await ServerKeyPair['~listFromKV'](context.env)
    const statements = [
      context.env.DB.prepare(`SELECT * FROM transactions;`),
      context.env.DB.prepare(`SELECT * FROM schedules;`),
    ]
    const [transactions, schedules] = await context.env.DB.batch(statements)
    return context.json({
      transactions: transactions?.results,
      schedules: schedules?.results,
      keys,
      remote,
    })
})
.get('/:address?', async context => {
  const { address } = context.req.param()
  console.info('address', address)
  if (!address || !Address?.validate(address)) {
    return context.json({ error: 'Invalid address' }, 400)
  }
  const key = await ServerKeyPair.getFromKV(context.env, { address })
  return context.json({ key })
})
/**
 * Nuke a key
 * Deletes the key from the database and the KV store
 */
debugApp.post('/nuke', async (context) => {
  const { address } = await context.req.json<{
    publicKey: string
    address: Address.Address
  }>()
  try {
    await ServerKeyPair.deleteFromKV(context.env, { address })
    await context.env.DB.prepare(`DELETE FROM transactions WHERE address = ?`)
      .bind(address.toLowerCase())
      .all()

    return context.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : error
    console.error(errorMessage)
    return context.json({ error: errorMessage }, 500)
  }
})


// nuke all keys, schedules and transactions
debugApp.get(
  '/nuke-everything',
  basicAuth({
    username: 'admin',
    password: 'admin',
  }),
  async (context) => {
    context.executionCtx.waitUntil(
      Promise.all([
        ServerKeyPair.deleteAllFromKV(context.env),
        context.env.DB.prepare(`DELETE FROM transactions;`).all(),
        context.env.DB.prepare(`DELETE FROM schedules;`).all(),
      ]),
    )
    return context.json({ success: true })
  },
)

export { debugApp }
