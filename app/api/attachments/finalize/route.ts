import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { moveToFinal } from '@/lib/uploads/storage-server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { userId, noteId, attachmentId, draftPath } = body

    // Verify the user owns this attachment
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('🔄 Server-side attachment finalization:', {
      userId: userId.slice(0, 8) + '...',
      noteId,
      attachmentId,
      draftPath,
    })

    // Move the file from draft to final location
    const { newPath } = await moveToFinal({
      userId,
      noteId,
      attachmentId,
      draftPath,
    })

    console.log('✅ Server-side finalization successful:', {
      draftPath,
      newPath,
    })

    return NextResponse.json({
      success: true,
      finalPath: newPath,
    })
  } catch (error: any) {
    console.error('❌ Server-side finalization failed:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Finalization failed' },
      { status: 400 }
    )
  }
}
