# Offline Support Foundation – Design

Last updated: 2025-09-01

## Goals

- Reliable note creation/edit/delete while offline
- Zero data loss with local backups of drafts and queued mutations
- Seamless reconnection with background sync and conflict safety

## Architecture

- Connectivity layer: `hooks/use-offline-status`
  - Tracks `isOnline` (browser) and `effectiveOnline` (ping)
  - Exposes `checkConnectivity()` and `registerBackgroundSync()`

- Local persistence
  - Drafts: `lib/offline/drafts.ts` in `localStorage` (20KB cap)
  - Outbox: `lib/offline/outbox.ts` queue per user in `localStorage` with in-memory SSR fallback

- Queue processing
  - App flush: on `online` event, manual trigger, or interval
  - SW background sync: `sync` event posts message to client to trigger flush
  - Idempotency per mutation item (`idempotencyKey`)

- Conflict strategy
  - LWW using `updated_at` (server canonical)
  - Temp IDs for offline creates; server ID mapping on success
  - Hard failures surfaced in UI with recovery action

## Data Model

`types/offline.ts`

- `OutboxItem` { id, type, payload, createdAt, retries, tempId?, idempotencyKey }
- `FlushOutcome` with `status: 'success'|'retry'|'fail'` and optional `mappedId`
- `OutboxFlushResult` aggregate for telemetry/UI

## Module Contracts

- `useOfflineStatus`
  - Input: `{ pingUrl?: string, pingIntervalMs?: number }`
  - Output: `{ isOnline, effectiveOnline, lastChangeAt, lastCheckedAt, checkConnectivity, registerBackgroundSync }`

- `lib/offline/drafts`
  - `saveDraft(userId, content)`, `loadDraft(userId)`, `clearDraft(userId)`

- `lib/offline/outbox`
  - Storage: `loadOutbox`, `saveOutbox`, `clearOutbox`
  - API: `createOutboxItem`, `enqueue`, `peek`, `remove`, `update`, `flush(handler, options)`
  - `flush` rotates retryable items with max retry guard

## Integration Points

- Note creation (offline)
  - Generate temp ID `temp_<uuid>` and enqueue create mutation
  - Insert optimistic note with `pending: true` into React Query cache
  - Save current input to `drafts` until confirmed

- Note update/delete
  - Enqueue mutation; update cache optimistically

- Reconnection
  - `online` event or SW `sync` → call `flush`
  - On success: if item had `tempId`, map to server ID and update cache

## Service Worker

- Current: `next-pwa` with generated `public/sw.js`
- Background Sync: move to custom `swSrc` when needed; minimal interim approach:
  - Handle `self.addEventListener('sync', ...)` in SW
  - Notify clients via `clients.matchAll` + `postMessage({ type: 'sync-outbox' })`
  - In app: window `message` listener triggers `flush`

## UI/UX

- Header indicator: online/offline dot with tooltip
- Pending badge on notes created offline
- Toasts: sync started/success/errors (batched)

## Testing

- Unit: Outbox enqueue/flush rotation, Drafts size guards
- Hook: `useOfflineStatus` event handling and ping fallback
- E2E: offline create → reload → restore → online → flush → server reflects

## Rollout

1. Ship non-invasive primitives (this change)
2. Integrate into mutations with feature flag
3. Add background sync and SW customization
4. Harden conflict resolution and telemetry
