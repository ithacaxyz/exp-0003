//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// exp1
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x074C9c3273F31651a9dae896C1A1d68E868b6998)
 * -
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x29f45fc3ed1d0ffafb5e2af9cc6c3ab1555cd5a2)
 */

export const exp1Abi = [
  {
    inputs: [
      { internalType: 'string', name: 'name_', type: 'string' },
      { internalType: 'string', name: 'symbol_', type: 'string' },
      { internalType: 'uint256', name: 'scalar_', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { stateMutability: 'payable', type: 'fallback' },
  { stateMutability: 'payable', type: 'receive' },
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ internalType: 'bytes32', name: 'result', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: 'result', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: 'result', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'nonces',
    outputs: [{ internalType: 'uint256', name: 'result', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'target', type: 'address' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'swap',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: 'result', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  { inputs: [], name: 'AllowanceOverflow', type: 'error' },
  { inputs: [], name: 'AllowanceUnderflow', type: 'error' },
  { inputs: [], name: 'InsufficientAllowance', type: 'error' },
  { inputs: [], name: 'InsufficientBalance', type: 'error' },
  { inputs: [], name: 'InvalidPermit', type: 'error' },
  { inputs: [], name: 'Permit2AllowanceIsFixedAtInfinity', type: 'error' },
  { inputs: [], name: 'PermitExpired', type: 'error' },
  { inputs: [], name: 'TotalSupplyOverflow', type: 'error' },
] as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x074C9c3273F31651a9dae896C1A1d68E868b6998)
 * -
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x29f45fc3ed1d0ffafb5e2af9cc6c3ab1555cd5a2)
 */
export const exp1Address = {
  28404: '0x29F45fc3eD1d0ffaFb5e2af9Cc6C3AB1555cd5a2',
  84532: '0x29F45fc3eD1d0ffaFb5e2af9Cc6C3AB1555cd5a2',
} as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x074C9c3273F31651a9dae896C1A1d68E868b6998)
 * -
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x29f45fc3ed1d0ffafb5e2af9cc6c3ab1555cd5a2)
 */
export const exp1Config = { abi: exp1Abi, address: exp1Address } as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// exp2
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xFcc74F42621D03Fd234d5f40931D8B82923E4D29)
 * -
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x62a9d6de963a5590f6fba5119e937f167677bfe7)
 */
export const exp2Abi = [
  {
    inputs: [
      { internalType: 'string', name: 'name_', type: 'string' },
      { internalType: 'string', name: 'symbol_', type: 'string' },
      { internalType: 'uint256', name: 'scalar_', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { stateMutability: 'payable', type: 'fallback' },
  { stateMutability: 'payable', type: 'receive' },
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ internalType: 'bytes32', name: 'result', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: 'result', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: 'result', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'nonces',
    outputs: [{ internalType: 'uint256', name: 'result', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'target', type: 'address' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'swap',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: 'result', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  { inputs: [], name: 'AllowanceOverflow', type: 'error' },
  { inputs: [], name: 'AllowanceUnderflow', type: 'error' },
  { inputs: [], name: 'InsufficientAllowance', type: 'error' },
  { inputs: [], name: 'InsufficientBalance', type: 'error' },
  { inputs: [], name: 'InvalidPermit', type: 'error' },
  { inputs: [], name: 'Permit2AllowanceIsFixedAtInfinity', type: 'error' },
  { inputs: [], name: 'PermitExpired', type: 'error' },
  { inputs: [], name: 'TotalSupplyOverflow', type: 'error' },
] as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xFcc74F42621D03Fd234d5f40931D8B82923E4D29)
 * -
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x62a9d6de963a5590f6fba5119e937f167677bfe7)
 */
export const exp2Address = {
  28404: '0x502fF46e72C47b8c3183DB8919700377EED66d2E',
  84532: '0x62a9d6DE963a5590f6fbA5119e937F167677bfE7',
} as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xFcc74F42621D03Fd234d5f40931D8B82923E4D29)
 * -
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x62a9d6de963a5590f6fba5119e937f167677bfe7)
 */
export const exp2Config = { abi: exp2Abi, address: exp2Address } as const
