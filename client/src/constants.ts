import { Hex, Value } from 'ox'
import { ExperimentERC20 } from './contracts.ts'

export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.PROD
    ? 'https://exp-0003-server.evm.workers.dev'
    : 'http://localhost:6900')

export const permissions = {
  expiry: Math.floor(Date.now() / 1_000) + 60 * 60, // 1 hour
  permissions: {
    calls: [
      {
        signature: 'mint(address,uint256)',
        to: ExperimentERC20.address[0],
      },
      {
        signature: 'approve(address,uint256)',
        to: ExperimentERC20.address[0],
      },
      {
        signature: 'transfer(address,uint256)',
        to: ExperimentERC20.address[0],
      },
    ],
    spend: [
      {
        period: 'minute',
        token: ExperimentERC20.address[0],
        limit: Hex.fromNumber(Value.fromEther('500000')),
      },
    ],
  },
} as const
