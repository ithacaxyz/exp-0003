import { Hono } from 'hono'
import type { Address } from 'ox'
import type { Env } from './types'
import { showRoutes } from 'hono/dev'
import { ServerKeyPair } from './keys'
import { getConnInfo } from 'hono/cloudflare-workers'

const debugApp = new Hono<{ Bindings: Env }>()

/**
 * Debug stored keys, schedules and transactions
 * If `address` is provided, returns the values for the given address
 * Otherwise, returns all keys, schedules & transactions
 */
debugApp.get('/', async (context) => {
  if (context.env.ENVIRONMENT === 'development') {
    const verbose = context.req.query('verbose')
    if (verbose) {
      showRoutes(debugApp, {
        colorize: context.env.ENVIRONMENT === 'development',
      })
    }
  }
  const { remote } = getConnInfo(context)
  const address = context.req.query('address')

  if (address) {
    const key = await ServerKeyPair.getFromStore(context.env, { address })
    const statements = [
      context.env.DB.prepare(
        /* sql */ `SELECT * FROM transactions WHERE address = ?;`,
      ).bind(address.toLowerCase()),
      context.env.DB.prepare(
        /* sql */ `SELECT * FROM schedules WHERE address = ?;`,
      ).bind(address.toLowerCase()),
    ]
    const [transactions, schedules] = await context.env.DB.batch(statements)
    return context.json({
      remote,
      keys: key ? [key] : [],
      schedules: schedules?.results,
      transactions: transactions?.results,
    })
  }

  const keys = await ServerKeyPair['~listFromStore'](context.env)
  const statements = [
    context.env.DB.prepare(`SELECT * FROM transactions;`),
    context.env.DB.prepare(`SELECT * FROM schedules;`),
  ]
  const [transactions, schedules] = await context.env.DB.batch(statements)
  return context.json({
    remote,
    keys,
    schedules: schedules?.results,
    transactions: transactions?.results,
  })
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
    context.executionCtx.waitUntil(
      Promise.all([
        ServerKeyPair.deleteFromStore(context.env, { address }),
        context.env.DB.prepare(`DELETE FROM transactions WHERE address = ?;`)
          .bind(address.toLowerCase())
          .all(),
      ]),
    )

    return context.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : error
    console.error(errorMessage)
    return context.json({ error: errorMessage }, 500)
  }
})

// nuke all keys, schedules and transactions
debugApp.get('/nuke-everything', async (context) => {
  if (context.env.ENVIRONMENT !== 'development') {
    return context.json({ error: 'Not allowed in production' }, 403)
  }

  try {
    context.executionCtx.waitUntil(
      Promise.all([
        context.env.DB.prepare(`DELETE FROM keypairs;`).all(),
        context.env.DB.prepare(`DELETE FROM transactions;`).all(),
        context.env.DB.prepare(`DELETE FROM schedules;`).all(),
      ]),
    )
    return context.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : error
    console.error(errorMessage)
    return context.json({ success: false, error: errorMessage }, 500)
  }
})

export { debugApp }
