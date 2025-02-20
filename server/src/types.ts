import type { Address, Hex } from 'ox'
import type { Params as WorkflowParams } from './workflow.ts'

export interface Env {
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
  ENVIRONMENT: 'development' | 'production'
  DB: D1Database
  WORKFLOW_01: Workflow<WorkflowParams>
}

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
    address: Address.Address
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
