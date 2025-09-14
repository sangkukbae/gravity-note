import { useState, useCallback, useRef, useEffect } from 'react'
import { getTextareaCaretRect } from '@/lib/dom/caret'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/auth'
import { createClient } from '@/lib/supabase/client'
import type { Note } from '@/lib/supabase/realtime'
import { createMentionToken } from '@/lib/mentions/parser'

interface UseMentionTriggerProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  onValueChange: (value: string) => void
  disabled?: boolean
}

interface MentionTriggerState {
  isActive: boolean
  startPos: number
  endPos: number
  search: string
}

interface MentionCandidate {
  id: string
  title: string
  content?: string
  updatedAt?: Date
}

export function useMentionTrigger({
  textareaRef,
  onValueChange,
  disabled = false,
}: UseMentionTriggerProps) {
  const { user } = useAuthStore()
  const supabase = createClient()

  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [triggerState, setTriggerState] = useState<MentionTriggerState>({
    isActive: false,
    startPos: 0,
    endPos: 0,
    search: '',
  })
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: Number.NaN,
    y: Number.NaN,
  })

  // Debounce position updates to prevent excessive calculations
  const positionUpdateTimeoutRef = useRef<NodeJS.Timeout>()

  // Define type for selected note fields
  type NoteForMentions = Pick<Note, 'id' | 'title' | 'content' | 'updated_at'>

  // Fetch notes for mention candidates
  const { data: notes = [], isLoading: isLoadingNotes } = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: async (): Promise<NoteForMentions[]> => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50) // Limit for performance

      if (error) {
        console.warn('Failed to fetch notes for mentions:', error)
        return []
      }

      return data || []
    },
    enabled: !!user?.id && isOpen, // Only fetch when mention dropdown is open
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Convert notes to mention candidates with search optimization
  const mentionCandidates: MentionCandidate[] = notes.map(note => ({
    id: note.id,
    title: note.title || 'Untitled Note',
    content: note.content,
    updatedAt: note.updated_at ? new Date(note.updated_at) : new Date(0),
  }))

  const updateMenuPosition = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || !triggerState.isActive) return

    try {
      // Measure caret using DOM Range mirror; returns viewport-relative rect
      // Anchor at the current caret position (end of trigger)
      const caret = getTextareaCaretRect(
        textarea,
        triggerState.endPos || triggerState.startPos
      )
      setMenuPosition({
        x: Math.round(caret.left),
        y: Math.round(caret.bottom + 4),
      })
    } catch (error) {
      console.warn('Failed to calculate caret position:', error)
      // Fallback to bottom-left of the textarea (viewport-relative)
      const rect = textarea.getBoundingClientRect()
      setMenuPosition({
        x: Math.round(rect.left),
        y: Math.round(rect.bottom + 4),
      })
    }
  }, [
    textareaRef,
    triggerState.isActive,
    triggerState.startPos,
    triggerState.endPos,
  ])

  // Avoid stale state on first trigger by computing with a provided state
  const updateMenuPositionFor = useCallback(
    (state: MentionTriggerState) => {
      const textarea = textareaRef.current
      if (!textarea || !state.isActive) return
      try {
        const caret = getTextareaCaretRect(
          textarea,
          state.endPos || state.startPos
        )
        setMenuPosition({
          x: Math.round(caret.left),
          y: Math.round(caret.bottom + 4),
        })
      } catch {
        const rect = textarea.getBoundingClientRect()
        setMenuPosition({
          x: Math.round(rect.left),
          y: Math.round(rect.bottom + 4),
        })
      }
    },
    [textareaRef]
  )

  const detectMentionTrigger = useCallback(
    (value: string, selectionStart: number): MentionTriggerState => {
      if (disabled) {
        return { isActive: false, startPos: 0, endPos: 0, search: '' }
      }

      // Check for active mention trigger
      if (triggerState.isActive) {
        const currentText = value.slice(triggerState.startPos, selectionStart)

        // Check if we're still in valid mention territory
        if (currentText.startsWith('@') && currentText.length > 1) {
          const searchTerm = currentText.slice(1)
          // Allow alphanumeric characters, spaces, and Korean characters for search
          if (/^[a-zA-Z0-9가-힣\s]*$/.test(searchTerm)) {
            return {
              isActive: true,
              startPos: triggerState.startPos,
              endPos: selectionStart,
              search: searchTerm,
            }
          }
        }

        // If we're no longer in valid territory, deactivate
        return { isActive: false, startPos: 0, endPos: 0, search: '' }
      }

      // Look for new mention trigger
      const textBeforeCursor = value.slice(0, selectionStart)

      // Check if the last character is '@' and it's at start of text, line, or after space
      if (textBeforeCursor.endsWith('@')) {
        const charBeforeAt = textBeforeCursor[textBeforeCursor.length - 2]
        if (!charBeforeAt || charBeforeAt === ' ' || charBeforeAt === '\n') {
          return {
            isActive: true,
            startPos: selectionStart - 1,
            endPos: selectionStart,
            search: '',
          }
        }
      }

      return { isActive: false, startPos: 0, endPos: 0, search: '' }
    },
    [disabled, triggerState.isActive, triggerState.startPos]
  )

  const insertMention = useCallback(
    (candidate: MentionCandidate) => {
      const textarea = textareaRef.current
      if (!textarea || !triggerState.isActive) return

      const value = textarea.value
      const beforeAt = value.slice(0, triggerState.startPos)
      const afterCursor = value.slice(triggerState.endPos)

      // Create mention token with title, ID, and content for smart title generation
      const mentionToken = createMentionToken(
        candidate.id,
        candidate.title,
        candidate.content
      )

      // Create new value with mention inserted
      const newValue = beforeAt + mentionToken + afterCursor

      // Calculate new cursor position (after the mention token)
      const newCursorPos = triggerState.startPos + mentionToken.length

      // Update textarea value
      textarea.value = newValue

      // Set cursor position and focus immediately
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()

      // Some menu components may steal focus on close; ensure it returns
      // to the textarea after the dropdown finishes its close cycle.
      const refocus = () => {
        const t = textareaRef.current
        if (!t) return
        t.focus()
        // restore caret, in case focus reset selection
        t.setSelectionRange(newCursorPos, newCursorPos)
      }
      requestAnimationFrame(refocus)
      setTimeout(refocus, 0)

      // Trigger change event for React
      const event = new Event('input', { bubbles: true })
      textarea.dispatchEvent(event)

      // Reset state
      setIsOpen(false)
      setSearch('')
      setTriggerState({ isActive: false, startPos: 0, endPos: 0, search: '' })

      // Notify parent component
      onValueChange(newValue)
    },
    [textareaRef, triggerState, onValueChange]
  )

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      const selectionStart = e.target.selectionStart

      const newTriggerState = detectMentionTrigger(value, selectionStart)
      setTriggerState(newTriggerState)

      if (newTriggerState.isActive) {
        // Compute position first to avoid initial paint at (0,0)
        if (!triggerState.isActive) {
          updateMenuPositionFor(newTriggerState)
        }

        // Defer opening to the next frame so position state is committed
        requestAnimationFrame(() => setIsOpen(true))
        setSearch(newTriggerState.search)

        // Debounce position updates for subsequent changes
        if (positionUpdateTimeoutRef.current) {
          clearTimeout(positionUpdateTimeoutRef.current)
        }
        positionUpdateTimeoutRef.current = setTimeout(updateMenuPosition, 5)
      } else {
        setIsOpen(false)
        setMenuPosition({ x: Number.NaN, y: Number.NaN })
        setSearch('')
      }
    },
    [
      detectMentionTrigger,
      updateMenuPosition,
      updateMenuPositionFor,
      triggerState.isActive,
    ]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isOpen || !triggerState.isActive) return false

      // Let the menu handle these keys
      if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
        e.preventDefault()
        return true // Indicates that we handled the key
      }

      // Close menu on Escape
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        setSearch('')
        setTriggerState({ isActive: false, startPos: 0, endPos: 0, search: '' })
        return true
      }

      // Close menu on space or tab (end of mention)
      if (e.key === ' ' || e.key === 'Tab') {
        setIsOpen(false)
        setSearch('')
        setTriggerState({ isActive: false, startPos: 0, endPos: 0, search: '' })
        return false // Let the default behavior happen
      }

      return false // We didn't handle the key
    },
    [isOpen, triggerState.isActive]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (positionUpdateTimeoutRef.current) {
        clearTimeout(positionUpdateTimeoutRef.current)
      }
    }
  }, [])

  // Reposition on window scroll/resize while active
  useEffect(() => {
    if (!isOpen || !triggerState.isActive) return
    const handler = () => updateMenuPosition()
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [isOpen, triggerState.isActive, updateMenuPosition])

  // Filter mention candidates based on search
  const filteredCandidates = search
    ? mentionCandidates.filter(candidate => {
        const searchLower = search.toLowerCase()
        return (
          candidate.title.toLowerCase().includes(searchLower) ||
          (candidate.content &&
            candidate.content.toLowerCase().includes(searchLower))
        )
      })
    : mentionCandidates.slice(0, 10) // Show top 10 recent notes by default

  return {
    isOpen,
    search,
    menuPosition,
    filteredCandidates,
    isLoadingCandidates: isLoadingNotes,
    handleTextareaChange,
    handleKeyDown,
    insertMention,
    isActive: triggerState.isActive,
    closeMenu: () => {
      setIsOpen(false)
      setSearch('')
      setTriggerState({ isActive: false, startPos: 0, endPos: 0, search: '' })
    },
  }
}
