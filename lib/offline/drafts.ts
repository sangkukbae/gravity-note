const MAX_DRAFT_BYTES = 20 * 1024

function getDraftKey(userId: string) {
  return `gn:draft:${userId}`
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

export function saveDraft(userId: string, content: string) {
  if (!userId) return
  const value = JSON.stringify({ content, updatedAt: Date.now() })
  if (new Blob([value]).size > MAX_DRAFT_BYTES) return
  if (hasLocalStorage()) window.localStorage.setItem(getDraftKey(userId), value)
}

export function loadDraft(
  userId: string
): { content: string; updatedAt: number } | null {
  if (!userId) return null
  if (!hasLocalStorage()) return null
  const raw = window.localStorage.getItem(getDraftKey(userId))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { content: string; updatedAt: number }
    if (typeof parsed?.content === 'string') return parsed
  } catch {}
  return null
}

export function clearDraft(userId: string) {
  if (!userId) return
  if (hasLocalStorage()) window.localStorage.removeItem(getDraftKey(userId))
}
