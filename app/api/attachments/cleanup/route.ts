import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Deletes old draft attachment rows and storage objects for the current user.
// Only removes items older than the specified threshold (default: 48h) and with note_id IS NULL.
export async function POST() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const THRESHOLD_HOURS = 48
    const since = new Date(
      Date.now() - THRESHOLD_HOURS * 3600 * 1000
    ).toISOString()

    // Find orphan attachment rows
    const { data: rows, error } = await supabase
      .from('note_attachments')
      .select('id, storage_path')
      .eq('user_id', user.id)
      .is('note_id', null)
      .lt('created_at', since)

    if (error) throw error

    const paths = (rows || []).map(r => r.storage_path)

    // Delete rows first
    if (rows && rows.length > 0) {
      await supabase
        .from('note_attachments')
        .delete()
        .in(
          'id',
          rows.map(r => r.id)
        )
    }

    // Delete objects
    if (paths.length > 0) {
      const { error: removeErr } = await supabase.storage
        .from('note-images')
        .remove(paths)
      if (removeErr) throw removeErr
    }

    return NextResponse.json({ removed: paths.length })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Cleanup failed' },
      { status: 400 }
    )
  }
}
