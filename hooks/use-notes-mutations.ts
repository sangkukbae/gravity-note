'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import type { Note, NoteInsert, NoteUpdate } from '@/lib/supabase/realtime'

/**
 * Hook for note mutations (create, update, delete)
 * Will be enhanced with optimistic updates in Phase 2
 */
export function useNotesMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()

  const notesQueryKey = ['notes', user?.id]

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (content: string): Promise<Note> => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const noteData: NoteInsert = {
        user_id: user.id,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('notes')
        .insert(noteData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create note: ${error.message}`)
      }

      return data
    },
    onSuccess: newNote => {
      // Real-time will handle the update, but we can optionally invalidate
      // to ensure consistency if real-time is not working
      queryClient.setQueryData<Note[]>(notesQueryKey, (oldNotes = []) => {
        // Check if already exists (from real-time)
        const noteExists = oldNotes.some(note => note.id === newNote.id)
        if (noteExists) {
          return oldNotes
        }
        return [newNote, ...oldNotes]
      })
    },
  })

  // Update note mutation (for rescue functionality)
  const updateNoteMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: NoteUpdate
    }): Promise<Note> => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const updateData: NoteUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id) // Additional security check
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update note: ${error.message}`)
      }

      return data
    },
    onSuccess: updatedNote => {
      // Real-time will handle the update, but ensure local state is consistent
      queryClient.setQueryData<Note[]>(notesQueryKey, (oldNotes = []) => {
        const updatedNotes = oldNotes.map(note =>
          note.id === updatedNote.id ? updatedNote : note
        )

        // Re-sort by updated_at (most recent first) to maintain correct order
        return updatedNotes.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      })
    },
  })

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string): Promise<string> => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id) // Additional security check

      if (error) {
        throw new Error(`Failed to delete note: ${error.message}`)
      }

      return noteId
    },
    onSuccess: deletedNoteId => {
      // Real-time will handle the update, but ensure local state is consistent
      queryClient.setQueryData<Note[]>(notesQueryKey, (oldNotes = []) => {
        return oldNotes.filter(note => note.id !== deletedNoteId)
      })
    },
  })

  // Rescue note (bring to top) - special case of update
  const rescueNoteMutation = useMutation({
    mutationFn: async (noteId: string): Promise<Note> => {
      return updateNoteMutation.mutateAsync({
        id: noteId,
        updates: {
          updated_at: new Date().toISOString(),
          is_rescued: true,
        },
      })
    },
  })

  // Search notes function (not a mutation, but related)
  const searchNotes = async (query: string): Promise<Note[]> => {
    if (!user?.id || !query.trim()) {
      return []
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .ilike('content', `%${query}%`)
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to search notes: ${error.message}`)
    }

    return data || []
  }

  return {
    // Mutations
    createNote: createNoteMutation.mutate,
    createNoteAsync: createNoteMutation.mutateAsync,
    updateNote: updateNoteMutation.mutate,
    updateNoteAsync: updateNoteMutation.mutateAsync,
    deleteNote: deleteNoteMutation.mutate,
    deleteNoteAsync: deleteNoteMutation.mutateAsync,
    rescueNote: rescueNoteMutation.mutate,
    rescueNoteAsync: rescueNoteMutation.mutateAsync,

    // Search function
    searchNotes,

    // Loading states
    isCreating: createNoteMutation.isPending,
    isUpdating: updateNoteMutation.isPending,
    isDeleting: deleteNoteMutation.isPending,
    isRescuing: rescueNoteMutation.isPending,

    // Error states
    createError: createNoteMutation.error,
    updateError: updateNoteMutation.error,
    deleteError: deleteNoteMutation.error,
    rescueError: rescueNoteMutation.error,

    // Reset functions
    resetCreateError: createNoteMutation.reset,
    resetUpdateError: updateNoteMutation.reset,
    resetDeleteError: deleteNoteMutation.reset,
    resetRescueError: rescueNoteMutation.reset,
  }
}
