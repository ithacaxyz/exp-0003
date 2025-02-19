import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { porto } from './config.ts'
import { logger } from 'hono/logger'
import { debugApp } from './debug.ts'
import type { Env } from './types.ts'
import { ServerKeyPair } from './keys.ts'
import { Scheduler } from './scheduler.ts'
import { requestId } from 'hono/request-id'
import { Address, Json, type Hex } from 'ox'
import { prettyJSON } from 'hono/pretty-json'
import { HTTPException } from 'hono/http-exception'
import { getConnInfo } from 'hono/cloudflare-workers'
import { actions, buildActionCall } from './calls.ts'

const app = new Hono<{ Bindings: Env }>()

app.use(logger())

/* append `?pretty` to any request to get prettified JSON */
app.use(prettyJSON({ space: 2 }))

app.use('*', requestId({ headerName: 'EXP0003-Request-Id' }))

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS', 'POST'] }))

app.get('/', (context) =>
  context.text('gm. See code at https://github.com/ithacaxyz/exp-0003'),
)

app.onError((error, context) => {
  console.error(`[onError: ${context.req.url}]: ${error}`, context.error)
  if (error instanceof HTTPException) error.getResponse()
  const { remote } = getConnInfo(context)
  return context.json({ error: error.message, remote }, 500)
})

app.notFound((context) => {
  const errorMessage = `${context.req.url} is not a valid path.`
  const { remote } = getConnInfo(context)
  console.error(errorMessage, remote)
  return context.json({ error: errorMessage, remote }, 404)
})

app.get('/keys/:address', async (context) => {
  const { address } = context.req.param()
  const { expiry } = context.req.query()

  if (!address || !Address.validate(address)) {
    return context.json({ error: 'Invalid address' }, 400)
  }

  // check for existing key
  const storedKey = await ServerKeyPair.getFromStore(context.env, {
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

  const keyPair = await ServerKeyPair.generateAndStore(context.env, {
    address,
    expiry: expiry ? Number(expiry) : undefined,
  })

  console.info(`Key stored for ${address}`)

  const { public_key, role, type } = keyPair

  return context.json({ type, publicKey: public_key, expiry, role })
})

app.post('/revoke', async (context) => {
  const permission = await context.req.json<{
    address: Address.Address
    id: Hex.Hex
  }>()

  if (permission.address && !Address.validate(permission.address)) {
    throw new HTTPException(400, {
      message: `Invalid address: ${Json.stringify(permission, undefined, 2)}`,
    })
  }

  if (!permission.id) {
    throw new HTTPException(400, {
      message: `Invalid permission id: ${Json.stringify(permission, undefined, 2)}`,
    })
  }

  const [_, __, revokeSchedule] = await Promise.all([
    porto.provider.request({
      method: 'experimental_revokePermissions',
      params: [permission],
    }),
    ServerKeyPair.deleteFromStore(context.env, {
      address: permission.address.toLowerCase(),
    }),
    context.env.DB.prepare(/* sql */ `DELETE FROM schedules WHERE address = ?`)
      .bind(permission.address.toLowerCase())
      .all(),
  ])

  return context.json({ success: true })
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

  const storedKey = await ServerKeyPair.getFromStore(context.env, {
    address: account.toLowerCase(),
  })

  if (!storedKey) {
    throw new HTTPException(400, {
      message:
        'Key not found. Request a new key and grant permissions if the problem persists',
    })
  }

  if (storedKey?.expiry && storedKey?.expiry < Math.floor(Date.now() / 1_000)) {
    await ServerKeyPair.deleteFromStore(context.env, {
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

app.get('/init', async (context) => {
  const scheduler = context.env.SCHEDULER.idFromName('scheduler')
  const schedulerStub = context.env.SCHEDULER.get(scheduler)
  return await schedulerStub.fetch(context.req.raw)
})

app.route('/debug', debugApp)

export { Scheduler }

export default app satisfies ExportedHandler<Env>
