import { Implementation, Porto } from 'porto'
import { odysseyTestnet } from 'wagmi/chains'
import { http, createConfig, createStorage } from 'wagmi'

const DISABLE_DIALOG = true // we're introducing dialog as own feature in own blog post

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
