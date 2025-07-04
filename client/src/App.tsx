import {
  useAccount,
  useSendCalls,
  useDisconnect,
  useConnectors,
  useCallsStatus,
} from 'wagmi'
import * as React from 'react'
import { Hooks } from 'porto/wagmi'
import { useMutation } from '@tanstack/react-query'
import { useConnect } from 'porto/wagmi/Hooks'

import { type Errors, type Hex, Json, Value } from 'ox'

import {
  useDebug,
  useBalance,
  nukeEverything,
  useNukeEverything,
} from '#hooks.ts'
import { exp1Config } from '#contracts.ts'
import { porto, wagmiConfig } from '#config.ts'
import { StringFormatter } from '#utilities.ts'
import { SERVER_URL, permissions } from '#constants.ts'

export function App() {
  useNukeEverything()
  const balance = useBalance()

  return (
    <main>
      <DebugLink />
      <hr />
      <details>
        <summary style={{ fontSize: '1.25rem' }}>State</summary>
        <State />
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
      {balance ? (
        <Fund />
      ) : (
        <div style={{ opacity: 0.5 }}>
          <Mint />
        </div>
      )}
      <hr />
      <DemoScheduler />
    </main>
  )
}

function DebugLink() {
  const { address } = useAccount()
  const connectors = useConnectors()
  const disconnect = useDisconnect()

  const searchParams = new URLSearchParams({
    pretty: 'true',
    ...(address ? { address } : {}),
  })

  return (
    <div
      style={{
        top: 200,
        right: 0,
        padding: '0px',
        display: 'flex',
        position: 'fixed',
        paddingTop: '5px',
        flexDirection: 'column',
      }}
    >
      <a
        target="_blank"
        rel="noreferrer"
        href={`${SERVER_URL}/debug?${searchParams.toString()}`}
        style={{
          padding: '6px',
          color: 'white',
          width: '100%',
          fontWeight: '700',
          textDecoration: 'none',
          backgroundColor: 'black',
          borderColor: 'darkgray',
          borderWidth: '1px',
          borderStyle: 'solid',
        }}
      >
        DEBUG
      </a>
      <button
        hidden={!import.meta.env.DEV}
        disabled={!import.meta.env.DEV}
        onClick={async () => {
          await nukeEverything()
          await Promise.all(
            connectors.map((c) => disconnect.disconnectAsync({ connector: c })),
          )
        }}
        type="button"
        style={{
          padding: '6px',
          color: 'white',
          width: '100%',
          fontWeight: '700',
          textDecoration: 'none',
          backgroundColor: 'black',
          borderColor: 'darkgray',
          borderWidth: '1px',
          borderStyle: 'solid',
        }}
      >
        RESET RECORDS
      </button>
    </div>
  )
}

function Connect() {
  const [grantPermissions, setGrantPermissions] = React.useState<boolean>(true)

  const { address } = useAccount()

  const connect = useConnect()
  const disconnect = useDisconnect()
  const connectors = useConnectors()
  const [connector] = connectors

  const allPermissions_ = Hooks.usePermissions()
  const latestPermissions = allPermissions_.data?.at(-1)

  const disconnectFromAll = async () => {
    // await Promise.all(
    //   connect.contextconnectors.map((c) => c.disconnect().catch(() => {})),
    // )
    await disconnect.disconnectAsync()
  }

  const balance = useBalance()

  return (
    <div>
      <div
        style={{
          gap: '10px',
          display: 'flex',
          marginBottom: '0px',
          alignItems: 'flex-end',
        }}
      >
        <h3 style={{ marginBottom: '0px' }}>[client] wallet_connect</h3>|
        <p style={{ marginBottom: '0px' }}>{connect.status}</p>
      </div>
      <p>
        <input
          type="checkbox"
          checked={grantPermissions}
          onChange={() => setGrantPermissions((x) => !x)}
        />
        Grant Permissions
      </p>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          disabled={connect.status === 'pending'}
          onClick={async () =>
            connect.mutate({
              connector,
              createAccount: false,
              grantPermissions: permissions(),
            })
          }
          type="button"
        >
          Login
        </button>
        <button
          disabled={connect.status === 'pending'}
          onClick={async () =>
            connect.mutate({
              connector,
              createAccount: { label: `replace-me@with-your.email` },
              grantPermissions: grantPermissions ? permissions() : undefined,
            })
          }
          type="button"
        >
          Register
        </button>
        <button
          type="button"
          onClick={disconnectFromAll}
          disabled={
            connect.status === 'pending' ||
            disconnect.status === 'pending' ||
            !address
          }
        >
          Disconnect
        </button>
      </div>

      <p>{connect.error?.message}</p>
      {address && <p>Account: {address}</p>}

      <p>Balance: {balance ?? 0}</p>

      {address && latestPermissions && (
        <details
          style={{ marginTop: '5px' }}
          key={latestPermissions.expiry + latestPermissions.id}
        >
          <summary>
            <span style={{ marginRight: '8px' }}>Permissions:</span>
            {StringFormatter.truncateHexString({
              address: latestPermissions?.key.publicKey,
              length: 12,
            })}
          </summary>
          <pre>{Json.stringify(latestPermissions, undefined, 2)}</pre>
        </details>
      )}
    </div>
  )
}

interface Key {
  type: 'p256'
  expiry: number
  publicKey: Hex.Hex
  role: 'session' | 'admin'
}

function RequestKey() {
  const { address } = useAccount()

  // const { refetch } = useDebug({ enabled: !!address, address })

  const requestKeyMutation = useMutation<Key>({
    mutationFn: async () => {
      if (!address) return
      const searchParams = new URLSearchParams({
        expiry: permissions().expiry.toString(),
      })
      const url = `${SERVER_URL}/keys/${address.toLowerCase()}?${searchParams.toString()}`
      console.info(url)
      const response = await fetch(url)
      const result = await Json.parse(await response.text())
      await wagmiConfig.storage?.setItem(
        `${address.toLowerCase()}-keys`,
        Json.stringify(result),
      )
      return result
    },
  })

  return (
    <div>
      <h3>[server] Request Key from Server (GET /keys/:address)</h3>
      <button
        type="button"
        onClick={() => requestKeyMutation.mutate()}
        disabled={requestKeyMutation.status === 'pending'}
      >
        {requestKeyMutation.status === 'pending'
          ? 'Requesting key…'
          : 'Request Key'}
      </button>
      {requestKeyMutation.data ? (
        <details>
          <summary style={{ marginTop: '1rem' }}>
            {StringFormatter.truncateHexString({
              address: requestKeyMutation.data?.publicKey,
              length: 12,
            })}{' '}
            - expires:{' '}
            {new Date(requestKeyMutation.data.expiry * 1_000).toLocaleString()}{' '}
            (local time)
          </summary>
          <pre>{Json.stringify(requestKeyMutation.data, undefined, 2)}</pre>
        </details>
      ) : null}
    </div>
  )
}

function GrantPermissions() {
  const { address } = useAccount()
  const grantPermissions = Hooks.useGrantPermissions()
  return (
    <div>
      <h3>[client] Grant Permissions to Server (grantPermissions)</h3>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (!address) return

          const key = Json.parse(
            (await wagmiConfig.storage?.getItem(
              `${address.toLowerCase()}-keys`,
            )) || '{}',
          ) as Key

          // if `expry` is present in both `key` and `permissions`, pick the lower value
          const expiry = Math.min(key.expiry, permissions().expiry)

          grantPermissions.mutate({
            key,
            expiry,
            address,
            permissions: permissions().permissions,
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
            Permissions:{' '}
            {StringFormatter.truncateHexString({
              address: grantPermissions.data?.key.publicKey,
              length: 12,
            })}
          </summary>
          <pre>{Json.stringify(grantPermissions.data, undefined, 2)}</pre>
        </details>
      ) : null}
    </div>
  )
}

function Fund() {
  const { address, chain } = useAccount()
  const { data, error, isPending, sendCalls } = useSendCalls()
  const {
    data: txHashData,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useCallsStatus({
    id: data?.id as unknown as string,
    query: {
      enabled: !!data?.id,
      refetchInterval: ({ state }) => {
        if (state.data?.status === 'success') return false
        return 1_000
      },
    },
  })

  const blockExplorer = chain?.blockExplorers?.default?.url
  const transactionLink = (hash: string) =>
    blockExplorer ? `${blockExplorer}/tx/${hash}` : hash

  const balance = useBalance()

  const [transactions, setTransactions] = React.useState<Set<string>>(new Set())
  React.useEffect(() => {
    if (!txHashData?.id) return
    const hash = txHashData.receipts?.at(0)?.transactionHash
    if (!hash) return
    setTransactions((prev) => new Set([...prev, hash]))
  }, [txHashData?.id, txHashData?.receipts])

  return (
    <div>
      <h3>[client] Get Funded to Mint [balance: {balance}]</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          sendCalls({
            calls: [
              {
                functionName: 'mint',
                abi: exp1Config.abi,
                to: exp1Config.address,
                args: [address!, Value.fromEther('100')],
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
              href={transactionLink(tx)}
            >
              {StringFormatter.truncateHexString({
                length: 12,
                address: tx,
              })}
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

function Mint() {
  const { address, chain } = useAccount()
  const { data, error, isPending, sendCalls } = useSendCalls()
  const {
    data: txHashData,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useCallsStatus({
    id: data?.id as unknown as string,
    query: {
      enabled: !!data?.id,
      refetchInterval: ({ state }) => {
        if (state.data?.status === 'success') return false
        return 1_000
      },
    },
  })

  const blockExplorer = chain?.blockExplorers?.default?.url
  const transactionLink = (hash: string) =>
    blockExplorer ? `${blockExplorer}/tx/${hash}` : hash

  const balance = useBalance()

  const [transactions, setTransactions] = React.useState<Set<string>>(new Set())
  React.useEffect(() => {
    if (!txHashData?.id) return
    const hash = txHashData.receipts?.at(0)?.transactionHash
    if (!hash) return
    setTransactions((prev) => new Set([...prev, hash]))
  }, [txHashData?.id, txHashData?.receipts])

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
                abi: exp1Config.abi,
                to: exp1Config.address,
                args: [address!, Value.fromEther('100')],
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
              href={transactionLink(tx)}
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

function DemoScheduler() {
  const { address } = useAccount()
  const { data: debugData } = useDebug({ address, enabled: !!address })

  const scheduleTransactionMutation = useMutation({
    mutationFn: async ({
      count = 6,
      action,
      schedule,
    }: {
      count?: number
      action: string
      schedule: string
    }) => {
      if (!address) return

      const { expiry } = permissions()

      if (expiry < Math.floor(Date.now() / 1_000)) {
        throw new Error('Key expired')
      }

      const searchParams = new URLSearchParams({
        address: address.toLowerCase(),
      })
      const url = `${SERVER_URL}/schedule?${searchParams.toString()}`
      const response = await fetch(url, {
        method: 'POST',
        body: Json.stringify({ action, schedule }),
      })

      return { ...Json.parse(await response.text()), count }
    },
    onSuccess: (data) => {
      console.info('scheduleTransactionMutation onSuccess', data)
      startWorkflowMutation.mutate({ count: data.count })
    },
  })

  const startWorkflowMutation = useMutation({
    mutationFn: async ({ count }: { count: number }) => {
      if (!address) return
      console.info('startWorkflowMutation', count)

      const response = await fetch(
        `${SERVER_URL}/workflow/${address.toLowerCase()}?count=${count}`,
        { method: 'POST' },
      )
      return Json.parse(await response.text())
    },
  })

  const isPending =
    scheduleTransactionMutation.status === 'pending' ||
    startWorkflowMutation.status === 'pending'

  const error = scheduleTransactionMutation.error || startWorkflowMutation.error

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h3>[server] Schedule Transactions</h3>
        <p style={{ marginLeft: '6px' }}>
          | active schedules: {debugData?.schedules?.length || 0} |
        </p>
        {startWorkflowMutation.status !== 'idle' && (
          <span
            style={{
              marginLeft: '10px',
              color:
                startWorkflowMutation.status === 'error'
                  ? '#F43F5E'
                  : '#16A34A',
            }}
          >
            {startWorkflowMutation.status}
          </span>
        )}
      </div>
      <p style={{ fontStyle: 'italic', color: 'lightgray' }}>
        (wallet_prepareCalls {'->'} wallet_sendPreparedCalls)
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault()

          const formData = new FormData(event.target as HTMLFormElement)

          const action =
            (formData.get('action') as string) ?? 'approve-transfer'
          const count = Number(formData.get('count') as string) || 6

          const schedule = '*/10 * * * * *'

          scheduleTransactionMutation.mutate({ action, schedule, count })
        }}
      >
        <p>Approve & Transfer 1 EXP</p>
        <p>once every 10 seconds</p>
        <div
          style={{
            margin: '10px 0',
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <span style={{ margin: 'auto 0', fontSize: '' }}>
            Total Transactions
          </span>
          <input
            min={1}
            max={6}
            name="count"
            type="number"
            placeholder="6"
            defaultValue={6}
            style={{ width: '40px', margin: '0 20px' }}
          />

          <button
            type="submit"
            disabled={isPending}
            style={{ width: '75px', textAlign: 'center' }}
          >
            {isPending ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
      {error && (
        <pre style={{ color: '#F43F5E' }}>
          {error instanceof Error
            ? error.message
            : Json.stringify(error, null, 2)}
          <br />
          Try again in a few seconds
        </pre>
      )}
      <ul style={{ paddingLeft: 10 }}>
        {debugData
          ? debugData?.transactions?.toReversed()?.map((transaction) => {
              return (
                <li key={transaction.id} style={{ marginBottom: '8px' }}>
                  <p style={{ margin: 3 }}>
                    🔑 PUBLIC KEY:{' '}
                    {StringFormatter.truncateHexString({
                      address: transaction.public_key,
                      length: 6,
                    })}{' '}
                    | TYPE: {transaction.role}
                  </p>
                  <span>🔗 TX HASH: </span>
                  <TxHash id={transaction.hash} />
                </li>
              )
            })
          : null}
      </ul>
    </div>
  )
}

function TxHash({ id }: { id: string }) {
  const { chain } = useAccount()
  const callStatus = useCallsStatus({
    id,
    scopeKey: `tx-${id}`,
    query: {
      enabled: !!id,
      refetchInterval: ({ state }) => {
        if (state.data?.status === 'success') return false
        return 1_000
      },
    },
  })

  const hash = callStatus.data?.receipts?.at(0)?.transactionHash
  if (!hash || callStatus.status === 'pending') return <span>pending...</span>

  const blockExplorer = chain?.blockExplorers?.default?.url
  const transactionLink = (hash: string) =>
    blockExplorer ? `${blockExplorer}/tx/${hash}` : hash
  return (
    <a target="_blank" rel="noreferrer" href={transactionLink(hash)}>
      {StringFormatter.truncateHexString({
        length: 12,
        address: hash,
      })}
    </a>
  )
}

function State() {
  const state = React.useSyncExternalStore(
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
          <p>Address: {state?.accounts?.[0]?.address}</p>
          <p>Chain ID: {state?.chainId}</p>
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
  const [responses, setResponses] = React.useState<Record<string, unknown>>({})

  React.useEffect(() => {
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
      <pre>{Json.stringify(responses, null, 2)}</pre>
    </div>
  )
}
