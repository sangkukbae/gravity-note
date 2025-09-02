import type {
  FlushOutcome,
  OutboxFlushResult,
  OutboxItem,
  OfflineMutationType,
} from '@/types/offline'

const MEMORY_OUTBOX = new Map<string, OutboxItem[]>()
const MAX_RETRIES = 5

function getOutboxKey(userId: string) {
  return `gn:outbox:${userId}`
}

function hasLocalStorage() {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined'
    )
  } catch {
    return false
  }
}

export function loadOutbox(userId: string): OutboxItem[] {
  if (!userId) return []
  if (hasLocalStorage()) {
    const raw = window.localStorage.getItem(getOutboxKey(userId))
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as OutboxItem[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return MEMORY_OUTBOX.get(userId) ?? []
}

export function saveOutbox(userId: string, items: OutboxItem[]) {
  if (!userId) return
  if (hasLocalStorage()) {
    window.localStorage.setItem(getOutboxKey(userId), JSON.stringify(items))
    return
  }
  MEMORY_OUTBOX.set(userId, items)
}

export function clearOutbox(userId: string) {
  if (!userId) return
  if (hasLocalStorage()) {
    window.localStorage.removeItem(getOutboxKey(userId))
    return
  }
  MEMORY_OUTBOX.delete(userId)
}

export function getOutboxCount(userId: string): number {
  return loadOutbox(userId).length
}

export function createOutboxItem<Payload = any>(
  type: OfflineMutationType,
  payload: Payload,
  options: { tempId?: string; idempotencyKey?: string } = {}
): OutboxItem<Payload> {
  const id = cryptoRandomId()
  return {
    id,
    type,
    payload,
    retries: 0,
    idempotencyKey: options.idempotencyKey ?? id,
    createdAt: new Date().toISOString(),
    ...(options.tempId !== undefined ? { tempId: options.tempId } : {}),
  }
}

export function enqueue<Payload = any>(
  userId: string,
  item: OutboxItem<Payload>
) {
  const items = loadOutbox(userId)
  items.push(item)
  saveOutbox(userId, items)
}

export function remove(userId: string, itemId: string) {
  const items = loadOutbox(userId)
  const next = items.filter(i => i.id !== itemId)
  saveOutbox(userId, next)
}

export function update(userId: string, item: OutboxItem) {
  const items = loadOutbox(userId)
  const idx = items.findIndex(i => i.id === item.id)
  if (idx >= 0) {
    items[idx] = item
    saveOutbox(userId, items)
  }
}

export function peek(userId: string): OutboxItem | null {
  const items = loadOutbox(userId)
  return items[0] ?? null
}

export interface FlushOptions {
  stopOnError?: boolean
  maxItemsPerRun?: number
}

export type FlushHandler = (item: OutboxItem) => Promise<FlushOutcome>

export async function flush(
  userId: string,
  handler: FlushHandler,
  options: FlushOptions = {}
): Promise<OutboxFlushResult> {
  const { stopOnError = false, maxItemsPerRun = 50 } = options
  const result: OutboxFlushResult = {
    successIds: [],
    failedIds: [],
    retriedIds: [],
    errors: {},
  }

  let processed = 0
  const outbox = loadOutbox(userId)

  while (outbox.length > 0 && processed < maxItemsPerRun) {
    const item = outbox[0]!
    try {
      const outcome = await handler(item)
      if (outcome.status === 'success') {
        // success: drop the item
        result.successIds.push(item.id)
        outbox.shift()
        saveOutbox(userId, outbox)
      } else if (outcome.status === 'retry') {
        // transient failure: bump retries and move to tail
        item.retries += 1
        if (item.retries > MAX_RETRIES) {
          result.failedIds.push(item.id)
          result.errors[item.id] =
            outcome.errorMessage ?? 'max retries exceeded'
          outbox.shift()
        } else {
          // rotate to tail
          outbox.shift()
          outbox.push(item)
          result.retriedIds.push(item.id)
        }
        saveOutbox(userId, outbox)
      } else {
        // hard fail: drop and record error
        result.failedIds.push(item.id)
        result.errors[item.id] = outcome.errorMessage ?? 'failed'
        outbox.shift()
        saveOutbox(userId, outbox)
        if (stopOnError) break
      }
    } catch (e: any) {
      // treat unexpected exception as retryable
      item.retries += 1
      if (item.retries > MAX_RETRIES) {
        result.failedIds.push(item.id)
        result.errors[item.id] = e?.message ?? 'exception during flush'
        outbox.shift()
      } else {
        outbox.shift()
        outbox.push(item)
        result.retriedIds.push(item.id)
      }
      saveOutbox(userId, outbox)
      if (stopOnError) break
    }

    processed += 1
  }

  return result
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID()
  return `outbox_${Math.random().toString(36).slice(2)}_${Date.now()}`
}
