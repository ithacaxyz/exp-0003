import { Value } from 'ox'

import { exp1Config } from '#contracts.ts'

export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.DEV
    ? 'http://localhost:6901'
    : 'https://exp-0003-server.evm.workers.dev')
export const permissions = () =>
  ({
    expiry: Math.floor(Date.now() / 1_000) + 60 * 60 * 24, // 1 day
    permissions: {
      calls: [
        {
          signature: 'approve(address,uint256)',
          to: exp1Config.address,
        },
        {
          signature: 'transfer(address,uint256)',
          to: exp1Config.address,
        },
        {
          signature: 'mint()',
          to: exp1Config.address,
        },
      ],
      spend: [
        {
          period: 'minute',
          limit: Value.fromEther('1000'),
          token: exp1Config.address,
        },
      ],
    },
  }) as const
