import './main.css'
import { App } from './App.tsx'
import { StrictMode } from 'react'
import { WagmiProvider } from 'wagmi'
import { createRoot } from 'react-dom/client'
import { queryClient, wagmiConfig } from './config.ts'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const root = document.querySelector('div#root')
if (!root) throw new Error('Root not found')

createRoot(root).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
