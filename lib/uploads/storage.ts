import { createClient } from '@/lib/supabase/client'
import { extensionFromMime } from './image'

const BUCKET = 'note-images'

function randomId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function buildDraftPath(
  userId: string,
  sessionId: string,
  localId: string,
  mime: string
) {
  const ext = extensionFromMime(mime)
  return `${userId}/drafts/${sessionId}/${localId}.${ext}`
}

export function buildFinalPath(
  userId: string,
  noteId: string,
  attachmentId: string,
  draftPathOrMime: string
) {
  const ext = draftPathOrMime.includes('.')
    ? draftPathOrMime.split('.').pop()!
    : extensionFromMime(draftPathOrMime)
  return `${userId}/${noteId}/${attachmentId}.${ext}`
}

export async function uploadDraft({
  userId,
  sessionId,
  localId,
  file,
}: {
  userId: string
  sessionId: string
  localId?: string
  file: File
}): Promise<{ path: string }> {
  const supabase = createClient()
  const id = localId || randomId()
  const path = buildDraftPath(userId, sessionId, id, file.type)
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return { path }
}

export async function removeObject(path: string) {
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(error.message)
}

export async function moveToFinal({
  userId,
  noteId,
  attachmentId,
  draftPath,
}: {
  userId: string
  noteId: string
  attachmentId: string
  draftPath: string
}): Promise<{ newPath: string }> {
  const supabase = createClient()
  const newPath = buildFinalPath(userId, noteId, attachmentId, draftPath)
  const { error } = await supabase.storage.from(BUCKET).move(draftPath, newPath)
  if (error) throw new Error(error.message)
  return { newPath }
}
