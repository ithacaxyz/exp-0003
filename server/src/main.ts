import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { porto } from './config.ts'
import { debugApp } from './debug.ts'
import { requestId } from 'hono/request-id'
import { Address, Json, type Hex } from 'ox'
import { ServerKeyPair } from './kv-keys.ts'
import { prettyJSON } from 'hono/pretty-json'
import { scheduledTask } from './scheduled.ts'
import { HTTPException } from 'hono/http-exception'
import { actions, buildActionCall } from './calls.ts'

const app = new Hono<{ Bindings: Env }>()

app.use(logger())
app.use(prettyJSON({ space: 2 }))
app.use('*', requestId({ headerName: 'EXP0003-Request-Id' }))
app.use(
  '*',
  cors({ origin: '*', allowMethods: ['GET', 'HEAD', 'OPTIONS', 'POST'] }),
)

app.get('/', (context) => context.text('gm'))

app.onError((error, context) => {
  console.info(error)
  if (error instanceof HTTPException) error.getResponse()
  return context.json({ error: error.message }, 500)
})

app.get('/keys/:address?', async (context) => {
  console.info('keys')
  const { address } = context.req.param()
  const { expiry } = context.req.query()

  console.info('address', address)
  console.info('expiry', expiry)

  if (!address || !Address.validate(address)) {
    return context.json({ error: 'Invalid address' }, 400)
  }

  const keyPair = await ServerKeyPair.generate(context.env, {
    expiry: expiry ? Number(expiry) : undefined,
  })

  context.executionCtx.waitUntil(
    ServerKeyPair.storeInKV(context.env, { address, keyPair }),
  )
  1
  const { publicKey, role, type } = keyPair

  return context.json({ type, publicKey, expiry, role })
})

app.post('/revoke', async (context) => {
  const permission = await context.req.json<{
    address: Address.Address
    id: Hex.Hex
  }>()

  if (permission.address && !Address.validate(permission.address)) {
    throw new HTTPException(400, {
      message: `Invalid address: ${JSON.stringify(permission, undefined, 2)}`,
    })
  }

  if (!permission.id) {
    throw new HTTPException(400, {
      message: `Invalid permission id: ${JSON.stringify(permission, undefined, 2)}`,
    })
  }

  const revokePermissions = await porto.provider.request({
    method: 'experimental_revokePermissions',
    params: [permission],
  })
})

/**
 * Schedules transactions to be executed at a later time
 * The transaction are sent by the key owner
 */
app.post('/schedule', async (context) => {
  const account = context.req.query('address')
  console.info('account', account)
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

  const storedKey = await ServerKeyPair.getFromKV(context.env, {
    address: account,
  })
  console.info('storedKey', storedKey)
  if (!storedKey) throw new HTTPException(400, { message: 'Key not found' })
  const { expiry, role } = storedKey
  if (expiry && expiry < Math.floor(Date.now() / 1000)) {
    throw new HTTPException(400, { message: 'Key expired' })
  }

  const calls = buildActionCall({ action, account })

  console.info('calls', calls)

  const insertSchedule = await context.env.DB.prepare(
    /* sql */ `
    INSERT INTO schedules ( address, schedule, action, calls ) VALUES ( ?, ?, ?, ? )`,
  )
    .bind(account.toLowerCase(), schedule, action, Json.stringify(calls))
    .all()

  if (!insertSchedule.success) {
    console.info('insertSchedule', insertSchedule)
    throw new HTTPException(500, { message: insertSchedule.error })
  }

  return context.json(insertSchedule.success)
})

app.route('/debug', debugApp)

export default {
  fetch: app.fetch,
  scheduled: async (event, env, context): Promise<void> => {
    context.waitUntil(scheduledTask(event, env, context))
  },
} satisfies ExportedHandler<Env>
