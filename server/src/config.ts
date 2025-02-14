import { Implementation, Porto } from 'porto'
import { odysseyTestnet } from 'porto/Chains'

export const porto = Porto.create({
  chains: [odysseyTestnet],
  implementation: Implementation.local(),
})
