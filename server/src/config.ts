import { http } from 'viem'
import { Porto, Storage } from 'porto'
import { baseSepolia } from 'porto/Chains'

export type TPorto = ReturnType<typeof getPorto>

export const getPorto = () =>
  Porto.create({
    chains: [baseSepolia],
    transports: {
      [baseSepolia.id]: http(),
    },
    storage: Storage.memory(),
  })
