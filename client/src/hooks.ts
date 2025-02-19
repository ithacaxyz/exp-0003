import * as React from 'react'
import { queryClient } from './config.ts'
import { SERVER_URL } from './constants.ts'
import { ExperimentERC20 } from './contracts.ts'
import { useQuery } from '@tanstack/react-query'
import { useAccount, useReadContract } from 'wagmi'
import { Address, type Hex, Json, Value } from 'ox'

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
  schedules: Array<{
    id: number
    created_at: string
    address: Address.Address
    schedule: string
    action: string
    calls: string
  }>
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
      const response = await fetch(
        `${SERVER_URL}/debug?address=${address?.toLowerCase()}`,
      )
      const result = await Json.parse(await response.text())
      return result as DebugData
    },
  })
}

export function useClearLocalStorage() {
  React.useEffect(() => {
    // on `d` press
    window.addEventListener('keydown', (event) => {
      if (event.key === 'd') nukeEverything()
    })
  }, [])
}

export function nukeEverything() {
  if (import.meta.env.MODE !== 'development') return
  // clear everything
  return fetch(`${SERVER_URL}/debug/nuke-everything`)
    .then(() => {
      queryClient.clear()
      queryClient.resetQueries()
      queryClient.removeQueries()
      queryClient.invalidateQueries()
      queryClient.unmount()
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
    .catch(() => {})
}
