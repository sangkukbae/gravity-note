import { useState, useCallback, useRef, useEffect } from 'react'
import { getTextareaCaretRect } from '@/lib/dom/caret'
import {
  MarkdownCommand,
  markdownCommands,
} from '@/components/slash-command/markdown-commands'

interface UseSlashCommandProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  onValueChange: (value: string) => void
  disabled?: boolean
}

interface SlashTriggerState {
  isActive: boolean
  startPos: number
  endPos: number
  search: string
}

export function useSlashCommand({
  textareaRef,
  onValueChange,
  disabled = false,
}: UseSlashCommandProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [triggerState, setTriggerState] = useState<SlashTriggerState>({
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
    (state: SlashTriggerState) => {
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

  const detectSlashTrigger = useCallback(
    (value: string, selectionStart: number): SlashTriggerState => {
      if (disabled) {
        return { isActive: false, startPos: 0, endPos: 0, search: '' }
      }

      // Check for active slash trigger
      if (triggerState.isActive) {
        const currentText = value.slice(triggerState.startPos, selectionStart)

        // Check if we're still in valid slash command territory
        if (currentText.startsWith('/') && currentText.length > 1) {
          const searchTerm = currentText.slice(1)
          // Allow only alphanumeric characters and Korean characters
          if (/^[a-zA-Z0-9가-힣]*$/.test(searchTerm)) {
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

      // Look for new slash trigger
      const textBeforeCursor = value.slice(0, selectionStart)
      const lines = textBeforeCursor.split('\n')
      const currentLine = lines[lines.length - 1] ?? ''

      // Check if the last character is '/' and it's at start of line or after space
      if (textBeforeCursor.endsWith('/')) {
        const charBeforeSlash = currentLine[currentLine.length - 2]
        if (!charBeforeSlash || charBeforeSlash === ' ') {
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

  const insertMarkdown = useCallback(
    (command: MarkdownCommand) => {
      const textarea = textareaRef.current
      if (!textarea || !triggerState.isActive) return

      const value = textarea.value
      const beforeSlash = value.slice(0, triggerState.startPos)
      const afterCursor = value.slice(triggerState.endPos)

      // Create new value with markdown inserted
      const newValue = beforeSlash + command.markdown + afterCursor

      // Calculate new cursor position
      const newCursorPos =
        triggerState.startPos +
        (command.cursorOffset || command.markdown.length)

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

      const newTriggerState = detectSlashTrigger(value, selectionStart)
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
      detectSlashTrigger,
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

      // Close menu on space or tab (end of slash command)
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

  // Filter commands based on search
  const filteredCommands = search
    ? markdownCommands.filter(
        command =>
          command.title.toLowerCase().includes(search.toLowerCase()) ||
          command.searchTerms.some(term =>
            term.toLowerCase().includes(search.toLowerCase())
          )
      )
    : markdownCommands

  return {
    isOpen,
    search,
    menuPosition,
    filteredCommands,
    handleTextareaChange,
    handleKeyDown,
    insertMarkdown,
    isActive: triggerState.isActive,
    closeMenu: () => {
      setIsOpen(false)
      setSearch('')
      setTriggerState({ isActive: false, startPos: 0, endPos: 0, search: '' })
    },
  }
}
