import { Porto } from 'porto'
import { baseSepolia } from 'porto/Chains'
import { http, createWalletClient } from 'viem'

export type TPorto = ReturnType<typeof getPorto>

export const getPorto = () =>
  Porto.create({
    chains: [baseSepolia],
    transports: {
      [baseSepolia.id]: http(),
    },
  })

export const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: http(),
})
