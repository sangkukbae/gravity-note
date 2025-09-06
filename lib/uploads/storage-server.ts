import { createClient } from '@/lib/supabase/server'
import { buildFinalPath } from './storage'

const BUCKET = 'note-images'

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

  console.log('🔄 Server-side moveToFinal:', {
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
    console.error(
      '❌ Server-side error checking if draft file exists:',
      existsError
    )
  } else {
    console.log('📋 Server-side draft file existence check:', {
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
    console.error('❌ Server-side moveToFinal failed:', {
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

  console.log('✅ Server-side moveToFinal successful:', {
    draftPath,
    newPath,
    moveData: data,
  })
  return { newPath }
}

export async function removeObject(path: string) {
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(error.message)
}
