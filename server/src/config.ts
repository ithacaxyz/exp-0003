import { http } from 'viem'
import { Porto } from 'porto'
import { baseSepolia } from 'porto/Chains'

export type TPorto = ReturnType<typeof getPorto>

export const getPorto = () =>
  Porto.create({
    chains: [baseSepolia],
    transports: {
      [baseSepolia.id]: http(),
    },
  })
