import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Address, type Hex, Json, Value } from 'ox'
import * as React from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { SERVER_URL } from './constants.ts'
import { ExperimentERC20 } from './contracts.ts'

export function useBalance() {
  const { address } = useAccount()
  const { data: balance } = useReadContract({
    args: [address!],
    abi: ExperimentERC20.abi,
    functionName: 'balanceOf',
    address: ExperimentERC20.address.at(0),
    query: { enabled: !!address, refetchInterval: 2_000 },
  })

  return `${Value.formatEther(balance ?? 0n)} EXP`
}

export interface DebugData {
  transactions: Array<{
    id: number
    role: 'session' | 'admin'
    created_at: string
    address: Address.Address
    hash: Address.Address
    public_key: Hex.Hex
  }>
  key: {
    account: Address.Address
    privateKey: Address.Address
  }
}

export function useDebug({
  address,
  enabled = false,
}: {
  address?: Address.Address
  enabled?: boolean
}) {
  const { address: _address = address } = useAccount()
  return useQuery<DebugData>({
    queryKey: ['debug', address],
    refetchInterval: (_) => 5_000,
    enabled: !!address && Address.validate(address) && enabled,
    queryFn: async () => {
      const response = await fetch(`${SERVER_URL}/debug?address=${address}`)
      const result = await Json.parse(await response.text())
      return result as DebugData
    },
  })
}

export function useClearLocalStorage() {
  const queryClient = useQueryClient()

  // biome-ignore lint/correctness/useExhaustiveDependencies: no need
  React.useEffect(() => {
    // on `d` press
    window.addEventListener('keydown', (event) => {
      if (event.key === 'd') {
        // clear everything
        queryClient.clear()
        queryClient.resetQueries()
        queryClient.removeQueries()
        queryClient.invalidateQueries()
        queryClient.unmount()
        window.localStorage.clear()
        window.sessionStorage.clear()
        window.location.reload()
      }
    })
  }, [])
}
