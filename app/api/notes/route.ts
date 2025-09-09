import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import { rateLimit } from '@/lib/api/rate-limit'
import {
  parseCreateNoteBody,
  parseUpdateNoteBody,
} from '@/lib/api/validation/notes'

// Basic constants for rate limiting
const CREATE_LIMIT = { limit: 60, windowMs: 60_000 } // 60/min
const MUTATION_LIMIT = { limit: 120, windowMs: 60_000 } // 120/min

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limiter = rateLimit(`create:${user.id}`, CREATE_LIMIT)
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetAt: limiter.resetAt },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const { content, clientId, title } = parseCreateNoteBody(body)

    const now = new Date().toISOString()
    const payload: TablesInsert<'notes'> = {
      user_id: user.id,
      content,
      title: title ?? null,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase
      .from('notes')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      id: data!.id,
      clientId,
      note: data,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limiter = rateLimit(`mutate:${user.id}`, MUTATION_LIMIT)
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetAt: limiter.resetAt },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const { id, updates } = parseUpdateNoteBody(body)

    const payload: TablesUpdate<'notes'> = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('notes')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ note: data })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limiter = rateLimit(`mutate:${user.id}`, MUTATION_LIMIT)
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetAt: limiter.resetAt },
      { status: 429 }
    )
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    // First, check if the note exists and belongs to the user
    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (noteError || !noteData) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Get all attachments for this note to clean up storage files
    const { data: attachments, error: attachmentsError } = await supabase
      .from('note_attachments')
      .select('id, storage_path')
      .eq('note_id', id)

    if (attachmentsError) {
      console.error(
        'Failed to fetch attachments for deletion:',
        attachmentsError
      )
      // Continue with note deletion even if attachment query fails
    }

    // Delete attachment files from storage if any exist
    if (attachments && attachments.length > 0) {
      const filesToDelete = attachments
        .filter(attachment => attachment.storage_path) // Only valid storage paths
        .map(attachment => attachment.storage_path)

      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('note-images')
          .remove(filesToDelete)

        if (storageError) {
          console.error(
            'Failed to delete attachment files from storage:',
            storageError
          )
          // Continue with database deletion even if storage cleanup fails
          // This prevents orphaned database records while allowing manual storage cleanup
        } else {
          console.log(
            `Successfully deleted ${filesToDelete.length} attachment files from storage`
          )
        }
      }
    }

    // Delete the note (this will cascade delete attachments due to FK constraints)
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    console.log(
      `Successfully deleted note ${id} with ${attachments?.length || 0} attachments`
    )
    return NextResponse.json({
      id,
      deletedAttachments: attachments?.length || 0,
    })
  } catch (error) {
    console.error('Unexpected error during note deletion:', error)
    return NextResponse.json(
      { error: 'Internal server error during deletion' },
      { status: 500 }
    )
  }
}
