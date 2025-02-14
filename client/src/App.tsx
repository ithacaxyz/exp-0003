import { parseEther } from 'viem'
import { Hooks } from 'porto/wagmi'
import { SERVER_URL } from './constants.ts'
import { porto, wagmiConfig } from './config.ts'
import { ExperimentERC20 } from './contracts.ts'
import { useAccount, useConnectors } from 'wagmi'
import { truncateHexString } from './utilities.ts'
import { type Errors, Hex, Json, Value } from 'ox'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useCallsStatus, useSendCalls } from 'wagmi/experimental'
import { useBalance, useClearLocalStorage, useDebug } from './hooks.ts'

const permissions = {
  expiry: Math.floor(Date.now() / 1_000) + 60 * 60, // 1 hour
  permissions: {
    calls: [
      {
        signature: 'mint(address,uint256)',
        to: ExperimentERC20.address[0],
      },
      {
        signature: 'approve(address,uint256)',
        to: ExperimentERC20.address[0],
      },
      {
        signature: 'transfer(address,uint256)',
        to: ExperimentERC20.address[0],
      },
    ],
    spend: [
      {
        period: 'minute',
        token: ExperimentERC20.address[0],
        limit: Hex.fromNumber(Value.fromEther('500000')),
      },
    ],
  },
} as const

export function App() {
  useClearLocalStorage()

  return (
    <main>
      <DebugLink />
      <hr className="h-px my-8 bg-gray-200 border-0 dark:bg-gray-700" />
      <details>
        <summary style={{ fontSize: '1.25rem' }}>State</summary>
        <State />
        <GetCapabilities />
      </details>
      <details>
        <summary style={{ fontSize: '1.25rem', marginTop: '1rem' }}>
          Events
        </summary>
        <Events />
      </details>
      <hr />
      <Connect />
      <hr />
      <RequestKey />
      <hr />
      <GrantPermissions />
      <hr />
      <Mint />
      <hr />
      <DemoCron />
    </main>
  )
}

function DebugLink() {
  const { address } = useAccount()

  const searchParams = new URLSearchParams({
    pretty: 'true',
    ...(address ? { address } : {}),
  })

  return (
    <a
      target="_blank"
      rel="noreferrer"
      href={`${SERVER_URL}/debug?${searchParams.toString()}`}
      style={{
        position: 'fixed',
        top: '0',
        right: '0',
        padding: '5px',
        backgroundColor: 'white',
        fontWeight: '700',
        fontSize: '1.25rem',
        textDecoration: 'none',
        zIndex: 1,
      }}
    >
      DEBUG
    </a>
  )
}

function Connect() {
  const label = `offline-tx-support-${Math.floor(Date.now() / 1_000)}`
  const [grantPermissions, setGrantPermissions] = useState<boolean>(true)

  const connectors = useConnectors()

  const connect = Hooks.useConnect()
  const disconnect = Hooks.useDisconnect()
  const permissions_ = Hooks.usePermissions()

  return (
    <div>
      <h3>[client] wallet_connect</h3>
      <p>
        <input
          type="checkbox"
          checked={grantPermissions}
          onChange={() => setGrantPermissions((x) => !x)}
        />
        Authorize a Session Key
      </p>
      {connectors
        .filter((x) => x.id === 'xyz.ithaca.porto')
        ?.map((connector) => (
          <div key={connector.uid} style={{ display: 'flex', gap: '10px' }}>
            <button
              key={connector.uid}
              onClick={() =>
                connect.mutate({
                  connector,
                  grantPermissions: grantPermissions ? permissions : undefined,
                })
              }
              type="button"
            >
              Login
            </button>
            <button
              onClick={async () => {
                await Promise.all(
                  connectors.map((c) => c.disconnect().catch(() => {})),
                )
                disconnect.mutateAsync({ connector }).then(() =>
                  connect.mutateAsync({
                    connector,
                    createAccount: { label },
                    grantPermissions: grantPermissions
                      ? permissions
                      : undefined,
                  }),
                )
              }}
              type="button"
            >
              Register
            </button>
            <button
              onClick={async () => {
                Promise.all(
                  connectors.map((connector) => {
                    disconnect.mutate({ connector })
                  }),
                )
              }}
              type="button"
            >
              Disconnect
            </button>
          </div>
        ))}
      <p>{connect.status}</p>
      <p>{connect.error?.message}</p>
      {JSON.stringify(connect.data, undefined, 2)}
      {permissions_.data?.map((permission) => (
        <details
          style={{ marginTop: '5px' }}
          key={permission.expiry + permission.id}
        >
          <summary>
            {truncateHexString({
              address: permission.key.publicKey,
              length: 12,
            })}
          </summary>
          <pre>{JSON.stringify(permission, undefined, 2)}</pre>
        </details>
      ))}
    </div>
  )
}

function RequestKey() {
  const [result, setResult] = useState<{
    type: 'p256'
    expiry: number
    publicKey: Hex.Hex
  } | null>(null)

  const { address } = useAccount()

  const { refetch } = useDebug({ enabled: result !== null, address })
  return (
    <div>
      <h3>[server] Request Key from Server (GET /keys/:address?expiry)</h3>
      <button
        onClick={async (_) => {
          const [account] = await porto.provider.request({
            method: 'eth_accounts',
          })

          console.info('account', account)

          const searchParams = new URLSearchParams({
            expiry: String(Math.floor(Date.now() / 1000) + 60 * 60),
          })
          const response = await fetch(
            `${SERVER_URL}/keys/${account}?${searchParams.toString()}`,
          )

          const result = await Json.parse(await response.text())

          wagmiConfig.storage?.setItem('keys', Json.stringify(result))
          setResult(result)
          refetch()
        }}
        type="button"
      >
        Request Key
      </button>
      {result ? (
        <details>
          <summary style={{ marginTop: '1rem' }}>
            {truncateHexString({ address: result?.publicKey, length: 12 })} -
            expires: {new Date(result.expiry * 1000).toLocaleString()}
          </summary>
          <pre>{JSON.stringify(result, undefined, 2)}</pre>
        </details>
      ) : null}
    </div>
  )
}

function GrantPermissions() {
  const grantPermissions = Hooks.useGrantPermissions()

  const { address } = useAccount()
  return (
    <div>
      <h3>
        [client] Grant Permissions to Server (experimental_grantPermissions)
      </h3>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          const key = Json.parse(
            (await wagmiConfig.storage?.getItem('keys')) || '{}',
          ) as { publicKey: Hex.Hex; type: 'p256'; expiry: number }

          // if `expry` is present in both `key` and `permissions`, pick the lower value
          const expiry = Math.min(key.expiry, permissions.expiry)

          grantPermissions.mutate({
            key,
            expiry,
            address,
            permissions: permissions.permissions,
          })
        }}
      >
        <button
          type="submit"
          style={{ marginBottom: '5px' }}
          disabled={grantPermissions.status === 'pending'}
        >
          {grantPermissions.status === 'pending'
            ? 'Authorizing…'
            : 'Grant Permissions'}
        </button>
        {grantPermissions.status === 'error' && (
          <p>{grantPermissions.error?.message}</p>
        )}
      </form>
      {grantPermissions.data ? (
        <details>
          <summary style={{ marginTop: '1rem' }}>
            {truncateHexString({
              address: grantPermissions.data?.key.publicKey,
              length: 12,
            })}
          </summary>
          <pre>{JSON.stringify(grantPermissions.data, undefined, 2)}</pre>
        </details>
      ) : null}
    </div>
  )
}

function Mint() {
  const { address } = useAccount()
  const { data: id, error, isPending, sendCalls } = useSendCalls()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useCallsStatus({
    id: id as string,
    query: {
      enabled: !!id,
      refetchInterval({ state }) {
        if (state.data?.status === 'CONFIRMED') return false
        return 1_000
      },
    },
  })

  const balance = useBalance()
  const [transactions, setTransactions] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (id) setTransactions((prev) => new Set([...prev, id]))
  }, [id])

  return (
    <div>
      <h3>[client] Mint EXP [balance: {balance}]</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          sendCalls({
            calls: [
              {
                functionName: 'mint',
                abi: ExperimentERC20.abi,
                to: ExperimentERC20.address[0],
                args: [address!, parseEther('100')],
              },
            ],
          })
        }}
      >
        <button
          type="submit"
          disabled={isPending}
          style={{ marginBottom: '5px' }}
        >
          {isPending ? 'Confirming...' : 'Mint 100 EXP'}
        </button>
      </form>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {Array.from(transactions).map((tx) => (
          <li key={tx}>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`https://odyssey-explorer.ithaca.xyz/tx/${tx}`}
            >
              {tx}
            </a>
          </li>
        ))}
      </ul>
      <p>{isConfirming && 'Waiting for confirmation...'}</p>
      <p>{isConfirmed && 'Transaction confirmed.'}</p>
      {error && (
        <div>
          Error: {(error as Errors.BaseError).shortMessage || error.message}
        </div>
      )}
    </div>
  )
}

const schedules = {
  'once every minute': '* * * * *',
  'once every hour': '0 * * * *',
  'once every day': '0 0 * * *',
  'once every week': '0 0 * * 0',
} as const

type Schedule = keyof typeof schedules

/* Check server activity */
function DemoCron() {
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'error' | 'success'
  >('idle')
  const [error, setError] = useState<string | null>(null)
  const { address } = useAccount()

  const { data: debugData } = useDebug({ address, enabled: !!address })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h3>[server] Schedule Transactions |</h3>
        {status !== 'idle' && (
          <span
            style={{
              marginLeft: '10px',
              color: status === 'error' ? '#F43F5E' : '#16A34A',
            }}
          >
            {status}
          </span>
        )}
      </div>
      <p style={{ fontStyle: 'italic', color: 'lightgray' }}>
        (wallet_prepareCalls {'->'} wallet_sendPreparedCalls)
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          try {
            setStatus('pending')

            if (!address) return setError('No address')

            const { expiry } = permissions

            if (expiry < Math.floor(Date.now() / 1000)) {
              setError('Key expired')
              throw new Error('Key expired')
            }

            const formData = new FormData(event.target as HTMLFormElement)

            const action =
              (formData.get('action') as string) ?? 'approve-transfer'
            const schedule = formData.get('schedule') as Schedule

            const cron = schedules[schedule]
            if (!cron) return setError('Invalid schedule')

            const searchParams = new URLSearchParams({ address })
            const url = `${SERVER_URL}/schedule?${searchParams.toString()}`
            const response = await fetch(url, {
              method: 'POST',
              body: Json.stringify({ action, schedule: cron }),
            })

            if (!response.ok) return setError(await response.text())

            const result = await Json.parse(await response.text())
            console.info('result success', result)
            setStatus('success')
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'unknown error'
            console.error(errorMessage)
            setError(errorMessage)
            setStatus('error')
          }
        }}
      >
        <p>Approve & Transfer 1 EXP</p>
        <select
          name="schedule"
          style={{ marginRight: '10px' }}
          defaultValue="once every minute"
        >
          <option value="once every minute">once every minute</option>
          <option value="once every hour" disabled>
            once every hour (coming soon)
          </option>
          <option value="once every day" disabled>
            once every day (coming soon)
          </option>
        </select>
        <button type="submit" disabled={status === 'pending'}>
          {status === 'pending' ? 'Submitting…' : 'Submit'}
        </button>
      </form>
      {error ? (
        <pre style={{ color: '#F43F5E' }}>{error}</pre>
      ) : (
        <pre style={{ color: 'lightgray' }}>No errors</pre>
      )}
      <ul style={{ paddingLeft: 10 }}>
        {debugData
          ? debugData?.transactions?.toReversed()?.map((transaction) => {
              return (
                <li key={transaction.id} style={{ marginBottom: '8px' }}>
                  <p style={{ margin: 3 }}>
                    🔑 PUBLIC KEY:{' '}
                    {truncateHexString({
                      address: transaction.public_key,
                      length: 12,
                    })}{' '}
                    | TYPE: {transaction.role}
                  </p>
                  <span>🔗 </span>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://odyssey-explorer.ithaca.xyz/tx/${transaction.hash}`}
                  >
                    {truncateHexString({
                      length: 26,
                      address: transaction.hash,
                    })}
                  </a>
                </li>
              )
            })
          : null}
      </ul>
    </div>
  )
}

function State() {
  const state = useSyncExternalStore(
    // @ts-ignore
    porto._internal.store.subscribe,
    // @ts-ignore
    () => porto._internal.store.getState(),
    // @ts-ignore
    () => porto._internal.store.getState(),
  )
  return (
    <div>
      <h3>State</h3>
      {state.accounts.length === 0 ? (
        <p>Disconnected</p>
      ) : (
        <>
          <p>Address: {state.accounts[0].address}</p>
          <p>Chain ID: {state.chain.id}</p>
          <div>
            Keys:{' '}
            <pre>{Json.stringify(state.accounts?.[0]?.keys, null, 2)}</pre>
          </div>
        </>
      )}
    </div>
  )
}

function Events() {
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  useEffect(() => {
    const handleResponse = (event: string) => (response: unknown) =>
      setResponses((responses) => ({
        ...responses,
        [event]: response,
      }))

    const handleAccountsChanged = handleResponse('accountsChanged')
    const handleChainChanged = handleResponse('chainChanged')
    const handleConnect = handleResponse('connect')
    const handleDisconnect = handleResponse('disconnect')
    const handleMessage = handleResponse('message')

    porto.provider.on('accountsChanged', handleAccountsChanged)
    porto.provider.on('chainChanged', handleChainChanged)
    porto.provider.on('connect', handleConnect)
    porto.provider.on('disconnect', handleDisconnect)
    porto.provider.on('message', handleMessage)
    return () => {
      porto.provider.removeListener('accountsChanged', handleAccountsChanged)
      porto.provider.removeListener('chainChanged', handleChainChanged)
      porto.provider.removeListener('connect', handleConnect)
      porto.provider.removeListener('disconnect', handleDisconnect)
      porto.provider.removeListener('message', handleMessage)
    }
  }, [])
  return (
    <div>
      <h3>Events</h3>
      <pre>{JSON.stringify(responses, null, 2)}</pre>
    </div>
  )
}

function GetCapabilities() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  return (
    <div>
      <h3>wallet_getCapabilities</h3>
      <button
        onClick={() =>
          porto.provider
            .request({ method: 'wallet_getCapabilities' })
            .then(setResult)
        }
        type="button"
      >
        Get Capabilities
      </button>
      {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : null}
    </div>
  )
}
