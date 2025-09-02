export type OfflineMutationType = 'create' | 'update' | 'delete'

export interface OutboxItem<Payload = any> {
  id: string
  type: OfflineMutationType
  payload: Payload
  createdAt: string
  retries: number
  tempId?: string
  idempotencyKey: string
}

export type FlushOutcomeStatus = 'success' | 'retry' | 'fail'

export interface FlushOutcome {
  status: FlushOutcomeStatus
  mappedId?: string
  errorMessage?: string
}

export interface OutboxFlushResult {
  successIds: string[]
  failedIds: string[]
  retriedIds: string[]
  errors: Record<string, string>
}

export interface OfflineStatusSnapshot {
  isOnline: boolean
  effectiveOnline: boolean
  lastChangeAt: number | null
  lastCheckedAt: number | null
}
