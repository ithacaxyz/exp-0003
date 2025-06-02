import { Hono } from 'hono'
import { cors } from 'hono/cors'
import crypto from 'node:crypto'
import { Address, Json } from 'ox'
import { logger } from 'hono/logger'
import { env } from 'cloudflare:workers'
import { requestId } from 'hono/request-id'
import { prettyJSON } from 'hono/pretty-json'
import { HTTPException } from 'hono/http-exception'
import { getConnInfo } from 'hono/cloudflare-workers'

import { debugApp } from '#debug.ts'
import type { Env } from '#types.ts'
import { ServerKeyPair } from '#keys.ts'
import wranglerJSON from '#wrangler.json'
import { Exp3Workflow } from '#workflow.ts'
import { actions, buildActionCall } from '#calls.ts'

const app = new Hono<{ Bindings: Env }>()

app.use(logger())
app.use(prettyJSON({ space: 2 })) // append `?pretty` to any request to get prettified JSON
app.use('*', requestId({ headerName: `${wranglerJSON.name}-Request-Id` }))
app.use(
  '*',
  cors({ origin: '*', allowMethods: ['GET', 'OPTIONS', 'POST', 'HEAD'] }),
)

app.onError((error, context) => {
  const { remote } = getConnInfo(context)
  const requestId = context.get('requestId')
  console.error(
    [
      `[${requestId}]`,
      `-[${remote.address}]`,
      `-[${context.req.url}]:\n`,
      `${error.message}`,
    ].join(''),
  )
  if (error instanceof HTTPException) return error.getResponse()
  return context.json({ remote, error: error.message, requestId }, 500)
})

app.notFound((context) => {
  throw new HTTPException(404, {
    cause: context.error,
    message: `${context.req.url} is not a valid path.`,
  })
})

app.get('/keys/:address', async (context) => {
  const { address } = context.req.param()
  const { expiry } = context.req.query()

  if (!address || !Address.validate(address)) {
    return context.json({ error: 'Invalid address' }, 400)
  }

  // check for existing key
  const storedKey = await ServerKeyPair.getFromStore({
    address,
  })

  const expired =
    storedKey?.expiry && storedKey.expiry < Math.floor(Date.now() / 1_000)

  if (!expired && storedKey) {
    return context.json({
      type: storedKey.type,
      publicKey: storedKey.public_key,
      expiry: storedKey.expiry,
      role: storedKey.role,
    })
  }

  const keyPair = await ServerKeyPair.generateAndStore({
    address,
    expiry: expiry ? Number(expiry) : undefined,
  })

  const { public_key, role, type } = keyPair
  return context.json({ type, publicKey: public_key, expiry, role })
})

/**
 * Schedules transactions to be executed at a later time
 * The transaction are sent by the key owner
 */
app.post('/schedule', async (context) => {
  const account = context.req.query('address')
  if (!account || !Address.validate(account)) {
    throw new HTTPException(400, { message: 'Invalid address' })
  }

  const { action, schedule } = await context.req.json<{
    action: string
    schedule: string
  }>()

  if (!action || !actions.includes(action)) {
    throw new HTTPException(400, { message: 'Invalid action' })
  }

  const storedKey = await ServerKeyPair.getFromStore({
    address: account.toLowerCase(),
  })

  if (!storedKey) {
    throw new HTTPException(400, {
      message:
        'Key not found. Request a new key and grant permissions if the problem persists',
    })
  }

  if (storedKey?.expiry && storedKey?.expiry < Math.floor(Date.now() / 1_000)) {
    await ServerKeyPair.deleteFromStore({
      address: account.toLowerCase(),
    })
    throw new HTTPException(400, { message: 'Key expired and deleted' })
  }

  const calls = buildActionCall({ action, account })

  const insertSchedule = await context.env.DB.prepare(
    /* sql */ `
    INSERT INTO schedules ( address, schedule, action, calls ) VALUES ( ?, ?, ?, ? )`,
  )
    .bind(account.toLowerCase(), schedule, action, Json.stringify(calls))
    .all()

  if (!insertSchedule.success) {
    console.info('insertSchedule error', insertSchedule)
    throw new HTTPException(500, { message: insertSchedule.error })
  }

  console.info('insertSchedule success', insertSchedule.success)

  return context.json({
    calls,
    action,
    schedule,
    address: account.toLowerCase(),
  })
})

app.post('/workflow/:address', async (context) => {
  const { address } = context.req.param()
  const { count = 6 } = context.req.query()

  if (!Address.validate(address)) {
    throw new HTTPException(400, { message: 'Invalid address' })
  }

  if (!count || Number(count) < 1 || Number(count) > 10) {
    throw new HTTPException(400, {
      message: `Count must be between 1 and 10. Received: ${count}`,
    })
  }

  const keyPair = await ServerKeyPair.getFromStore({ address })

  if (!keyPair) return context.json({ error: 'Key not found' }, 404)

  if (keyPair.expiry && keyPair.expiry < Math.floor(Date.now() / 1_000)) {
    await ServerKeyPair.deleteFromStore({ address })
    return context.json({ error: 'Key expired and deleted' }, 400)
  }

  console.info({
    id: crypto.randomUUID(),
    params: {
      keyPair,
      count: Number(count || 6),
    },
  })
  const instance = await env.EXP3_WORKFLOW.create({
    id: crypto.randomUUID(),
    params: {
      keyPair,
      count: Number(count || 6),
    },
  })

  console.info('Exp3Workflow instance created', instance.id)

  return context.json({ id: instance.id, details: await instance.status() })
})

app.route('/debug', debugApp)

export { Exp3Workflow }

export default app satisfies ExportedHandler<Env>
