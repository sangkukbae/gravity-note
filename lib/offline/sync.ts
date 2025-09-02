import { flush } from '@/lib/offline/outbox'
import type { OutboxItem, OutboxFlushResult } from '@/types/offline'

export interface SyncOptions {
  maxAttempts?: number
  baseDelayMs?: number
  jitterMs?: number
  userId: string
  handler: (item: OutboxItem) => Promise<{
    status: 'success' | 'retry' | 'fail'
    mappedId?: string
    errorMessage?: string
  }>
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

export async function syncQueuedNotes(
  opts: SyncOptions
): Promise<OutboxFlushResult> {
  const {
    userId,
    handler,
    maxAttempts = 5,
    baseDelayMs = 500,
    jitterMs = 200,
  } = opts

  let attempt = 0
  let lastResult: OutboxFlushResult = {
    successIds: [],
    failedIds: [],
    retriedIds: [],
    errors: {},
  }

  while (attempt < maxAttempts) {
    const result = await flush(userId, handler, { maxItemsPerRun: 100 })
    // Merge results
    lastResult = {
      successIds: [...lastResult.successIds, ...result.successIds],
      failedIds: [...lastResult.failedIds, ...result.failedIds],
      retriedIds: [...lastResult.retriedIds, ...result.retriedIds],
      errors: { ...lastResult.errors, ...result.errors },
    }

    if (result.retriedIds.length === 0) break

    attempt += 1
    const backoff = baseDelayMs * Math.pow(2, attempt)
    const jitter = Math.floor(Math.random() * jitterMs)
    await sleep(backoff + jitter)
  }

  return lastResult
}
