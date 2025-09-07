export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function isOptionalString(v: unknown): v is string | undefined {
  return v === undefined || typeof v === 'string'
}

export function assert(condition: any, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export interface CreateNoteBody {
  content: string
  clientId?: string
  title?: string | null
}

// Minimal, localized sanitizer to prevent invisible Unicode that breaks search
function normalizeForSearch(s: string): string {
  return s.replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
}

export function parseCreateNoteBody(body: any): CreateNoteBody {
  assert(body && typeof body === 'object', 'Invalid body')
  assert(isNonEmptyString(body.content), 'content is required')
  assert(isOptionalString(body.clientId), 'clientId must be a string')
  assert(
    body.title === undefined ||
      typeof body.title === 'string' ||
      body.title === null,
    'title must be string or null'
  )
  return {
    content: normalizeForSearch(body.content),
    clientId: body.clientId,
    title:
      body.title === undefined || body.title === null
        ? null
        : normalizeForSearch(body.title),
  }
}

export interface UpdateNoteBody {
  id: string
  updates: {
    content?: string
    title?: string | null
    is_rescued?: boolean
  }
}

export function parseUpdateNoteBody(body: any): UpdateNoteBody {
  assert(body && typeof body === 'object', 'Invalid body')
  assert(isNonEmptyString(body.id), 'id is required')
  const updates = body.updates ?? {}
  assert(typeof updates === 'object', 'updates must be object')
  if (updates.content !== undefined)
    assert(typeof updates.content === 'string', 'content must be string')
  if (updates.title !== undefined)
    assert(
      typeof updates.title === 'string' || updates.title === null,
      'title must be string or null'
    )
  if (updates.is_rescued !== undefined)
    assert(
      typeof updates.is_rescued === 'boolean',
      'is_rescued must be boolean'
    )
  // Apply normalization defensively on server as well
  const normalizedUpdates: UpdateNoteBody['updates'] = { ...updates }
  if (typeof normalizedUpdates.content === 'string') {
    normalizedUpdates.content = normalizeForSearch(normalizedUpdates.content)
  }
  if (typeof normalizedUpdates.title === 'string') {
    normalizedUpdates.title = normalizeForSearch(normalizedUpdates.title)
  }
  return { id: body.id, updates: normalizedUpdates }
}
