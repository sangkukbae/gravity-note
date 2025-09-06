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

  console.log('🚀 Starting draft upload:', {
    path,
    fileSize: file.size,
    fileName: file.name,
    mimeType: file.type,
    userId: userId.slice(0, 8) + '...',
    sessionId: sessionId.slice(0, 8) + '...',
  })

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    console.error('❌ Draft upload failed:', error)
    throw new Error(error.message)
  }

  console.log('✅ Draft upload successful:', { path, uploadData: data })
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

  console.log('🔄 Starting moveToFinal:', {
    draftPath,
    newPath,
    noteId,
    attachmentId,
    userId: userId.slice(0, 8) + '...',
  })

  // First, let's verify the draft file exists before attempting to move
  const { data: existsData, error: existsError } = await supabase.storage
    .from(BUCKET)
    .list(draftPath.split('/').slice(0, -1).join('/'), {
      search: draftPath.split('/').pop() ?? '',
    })

  if (existsError) {
    console.error('❌ Error checking if draft file exists:', existsError)
  } else {
    console.log('📋 Draft file existence check:', {
      searchPath: draftPath.split('/').slice(0, -1).join('/'),
      searchFilename: draftPath.split('/').pop(),
      foundFiles: existsData?.map(f => f.name) || [],
      targetExists:
        existsData?.some(f => f.name === draftPath.split('/').pop()) || false,
    })
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .move(draftPath, newPath)

  if (error) {
    console.error('❌ moveToFinal failed:', {
      error,
      draftPath,
      newPath,
      errorDetails: {
        message: error.message,
        statusCode: (error as any)?.statusCode,
        error: (error as any)?.error,
      },
    })
    throw new Error(error.message)
  }

  console.log('✅ moveToFinal successful:', {
    draftPath,
    newPath,
    moveData: data,
  })
  return { newPath }
}
