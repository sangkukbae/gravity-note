import { describe, it, expect, beforeEach } from 'vitest'
import { saveDraft, loadDraft, clearDraft } from '@/lib/offline/drafts'

const TEST_USER = 'user-123'

describe('offline drafts', () => {
  beforeEach(() => {
    clearDraft(TEST_USER)
  })

  it('saves and loads draft', () => {
    expect(loadDraft(TEST_USER)).toBeNull()
    saveDraft(TEST_USER, 'hello world')
    const draft = loadDraft(TEST_USER)
    expect(draft?.content).toBe('hello world')
  })

  it('clears draft', () => {
    saveDraft(TEST_USER, 'to be removed')
    clearDraft(TEST_USER)
    expect(loadDraft(TEST_USER)).toBeNull()
  })
})
