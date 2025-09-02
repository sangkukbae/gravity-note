import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadOutbox,
  clearOutbox,
  enqueue,
  createOutboxItem,
  flush,
} from '@/lib/offline/outbox'
import type { OutboxItem } from '@/types/offline'

const TEST_USER = 'test-user-1'

function makeItem(content: string, opts: { tempId?: string } = {}): OutboxItem {
  const options = opts.tempId !== undefined ? { tempId: opts.tempId } : {}
  return createOutboxItem('create', { content }, options)
}

describe('offline outbox', () => {
  beforeEach(() => {
    clearOutbox(TEST_USER)
  })

  it('enqueues and loads items', () => {
    expect(loadOutbox(TEST_USER).length).toBe(0)
    const item = makeItem('hello')
    enqueue(TEST_USER, item)
    const loaded = loadOutbox(TEST_USER)
    expect(loaded.length).toBe(1)
    expect((loaded[0] as any).payload.content).toBe('hello')
  })

  it('flush success removes items', async () => {
    enqueue(TEST_USER, makeItem('a'))
    enqueue(TEST_USER, makeItem('b'))
    const res = await flush(TEST_USER, async () => ({ status: 'success' }))
    expect(res.successIds.length).toBe(2)
    expect(loadOutbox(TEST_USER).length).toBe(0)
  })

  it('retry rotates then fails after cap', async () => {
    enqueue(TEST_USER, makeItem('x'))
    for (let i = 0; i < 7; i++) {
      await flush(
        TEST_USER,
        async () => ({ status: 'retry', errorMessage: 'temporary' }),
        { maxItemsPerRun: 10 }
      )
    }
    const res2 = await flush(TEST_USER, async () => ({ status: 'success' }), {
      maxItemsPerRun: 10,
    })
    expect(loadOutbox(TEST_USER).length).toBe(0)
  })
})
