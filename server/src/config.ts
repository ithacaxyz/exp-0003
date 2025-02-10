import { Implementation, Porto } from 'Porto'
import { odysseyTestnet } from 'porto/Chains'

export const porto = Porto.create({
  chains: [odysseyTestnet],
  implementation: Implementation.local(),
})
