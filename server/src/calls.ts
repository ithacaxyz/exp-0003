import { AbiFunction, type Address, Value } from 'ox'

import { exp1Config } from '#contracts.ts'

export const actions = ['mint', 'approve-transfer']

export function buildActionCall({
  action,
  account,
}: {
  action: string
  account: Address.Address
}) {
  if (action === 'mint') {
    return <const>[
      {
        to: exp1Config.address[84532],
        data: AbiFunction.encodeData(
          AbiFunction.fromAbi(exp1Config.abi, 'mint'),
          [account, Value.fromEther('1')],
        ),
      },
    ]
  }

  if (action === 'approve-transfer') {
    return <const>[
      {
        to: exp1Config.address[84532],
        data: AbiFunction.encodeData(
          AbiFunction.fromAbi(exp1Config.abi, 'approve'),
          [account, Value.fromEther('1')],
        ),
      },
      {
        to: exp1Config.address[84532],
        data: AbiFunction.encodeData(
          AbiFunction.fromAbi(exp1Config.abi, 'transfer'),
          ['0x0000000000000000000000000000000000000000', Value.fromEther('1')],
        ),
      },
    ]
  }

  return <const>[
    { to: '0x0000000000000000000000000000000000000000', value: '0x0' },
    { to: '0x0000000000000000000000000000000000000000', value: '0x0' },
  ]
}
