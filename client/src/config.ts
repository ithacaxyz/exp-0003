import { Dialog, Mode, Porto } from 'porto'
import { baseSepolia } from 'porto/Chains'
import { porto as portoConnector } from 'porto/wagmi'
import { http, createConfig, createStorage } from 'wagmi'
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

export const porto = Porto.create()

const renderer =
  import.meta.env.VITE_DIALOG_RENDERER === 'popup'
    ? Dialog.popup()
    : Dialog.iframe()

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    portoConnector({
      announceProvider: false,
      mode: Mode.dialog({ renderer }),
    }),
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
      refetchOnReconnect: false, // Disable automatic refetch on reconnect to prevent popups
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
