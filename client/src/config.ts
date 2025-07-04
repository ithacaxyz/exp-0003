import { Dialog, Mode, Porto } from 'porto'
import { baseSepolia } from 'porto/Chains'
import { porto as portoConnector } from 'porto/wagmi'
import { http, createConfig, createStorage } from 'wagmi'
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

export const porto = Porto.create()

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    portoConnector({ mode: Mode.dialog({ renderer: Dialog.popup() }) }),
  ],
  multiInjectedProviderDiscovery: false,
  storage: createStorage({ storage: window.localStorage }),
  transports: {
    [baseSepolia.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}

export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1_000 * 60 * 60, // 1 hour
      refetchOnReconnect: () => !queryClient.isMutating(),
    },
  },
  /**
   * https://tkdodo.eu/blog/react-query-error-handling#putting-it-all-together
   * note: only runs in development mode. Production unaffected.
   */
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (import.meta.env.MODE !== 'development') return
      if (query.state.data !== undefined) {
        console.error(error)
      }
    },
  }),
  mutationCache: new MutationCache({
    onSettled: () => {
      if (queryClient.isMutating() === 1) {
        return queryClient.invalidateQueries()
      }
    },
  }),
})
