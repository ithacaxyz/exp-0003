import { Hex, Value } from 'ox'

import { exp1Config } from '#contracts.ts'

export const SERVER_URL = import.meta.env.DEV
  ? 'http://localhost:6900'
  : 'https://exp-0003-server.evm.workers.dev'

export const permissions = ({ chainId }: { chainId: number }) =>
  ({
    expiry: Math.floor(Date.now() / 1_000) + 60 * 60 * 24 * 30, // 1 month
    permissions: {
      calls: [
        {
          signature: 'approve(address,uint256)',
          to: exp1Config.address[chainId as keyof typeof exp1Config.address],
        },
        {
          signature: 'transfer(address,uint256)',
          to: exp1Config.address[chainId as keyof typeof exp1Config.address],
        },
      ],
      spend: [
        {
          period: 'minute',
          limit: Hex.fromNumber(Value.fromEther('1000')),
          token: exp1Config.address[chainId as keyof typeof exp1Config.address],
        },
      ],
    },
  }) as const
