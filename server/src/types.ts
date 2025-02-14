import type { Hex } from 'ox'

interface BaseAttributes {
  id: number
  created_at: string
}

export type Transaction = Pretty<
  BaseAttributes & {
    address: string
    hash: Hex.Hex
    public_key: Hex.Hex
    role: 'session' | 'admin'
  }
>

export type Schedule = Pretty<
  BaseAttributes & {
    address: string
    schedule: string
    action: string
    calls: string
  }
>

export type KeyPair = Pretty<
  BaseAttributes & {
    address: string
    public_key: Hex.Hex
    private_key: Hex.Hex
    expiry: number
    type: 'p256'
    role: 'session' | 'admin'
  }
>

export type Pretty<T> = { [K in keyof T]: T[K] } & {}
