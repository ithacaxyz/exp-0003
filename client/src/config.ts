import { Implementation, Porto } from 'porto'
import { createClient, custom } from 'viem'
import { http, createConfig, createStorage } from 'wagmi'
import { odysseyTestnet } from 'wagmi/chains'

const DISABLE_DIALOG = import.meta.env.VITE_DISABLE_DIALOG === 'true'

const implementation = DISABLE_DIALOG
  ? Implementation.local()
  : Implementation.dialog({
      host: import.meta.env.VITE_DIALOG_HOST ?? `https://exp.porto.sh/dialog`,
    })

export const porto = Porto.create({ implementation })

export const wagmiConfig = createConfig({
  chains: [odysseyTestnet],
  storage: createStorage({ storage: window.localStorage }),
  transports: {
    [odysseyTestnet.id]: http(),
  },
})

export const client = createClient({
  transport: custom(porto.provider),
})
