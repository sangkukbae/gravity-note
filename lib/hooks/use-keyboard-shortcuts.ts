import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface KeyboardShortcut {
  key: string
  modifiers?: {
    ctrl?: boolean
    cmd?: boolean
    alt?: boolean
    shift?: boolean
  }
  action: () => void
  description: string
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  preventDefault?: boolean
}

/**
 * Hook to manage keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, preventDefault = true } = options

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Only allow certain shortcuts in input fields
        const allowedInInput = ['Escape', 'Tab']
        if (!allowedInInput.includes(event.key)) {
          return
        }
      }

      for (const shortcut of shortcuts) {
        const {
          key,
          modifiers = {},
          action,
          preventDefault: shortcutPreventDefault = preventDefault,
        } = shortcut

        // Check if the key matches
        if (event.key.toLowerCase() !== key.toLowerCase()) continue

        // Check modifiers
        const cmdOrCtrl = modifiers.cmd || modifiers.ctrl
        const hasCorrectModifiers =
          (!cmdOrCtrl || event.metaKey || event.ctrlKey) &&
          (!modifiers.alt || event.altKey) &&
          (!modifiers.shift || event.shiftKey) &&
          (cmdOrCtrl || !event.metaKey) &&
          (cmdOrCtrl || !event.ctrlKey) &&
          (!modifiers.alt || event.altKey) &&
          (!modifiers.shift || event.shiftKey)

        if (hasCorrectModifiers) {
          if (shortcutPreventDefault) {
            event.preventDefault()
            event.stopPropagation()
          }
          action()
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled, preventDefault])
}

/**
 * Hook for global application shortcuts
 */
export function useGlobalShortcuts() {
  const router = useRouter()

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      modifiers: { cmd: true },
      action: () => router.push('/dashboard/notes/new'),
      description: 'Create new note',
    },
    {
      key: 'k',
      modifiers: { cmd: true },
      action: () => {
        // Trigger search - this will be handled by components that implement search
        const searchEvent = new CustomEvent('trigger-search')
        document.dispatchEvent(searchEvent)
      },
      description: 'Open search',
    },
    {
      key: '/',
      action: () => {
        const searchEvent = new CustomEvent('trigger-search')
        document.dispatchEvent(searchEvent)
      },
      description: 'Open search',
    },
    {
      key: 'Escape',
      action: () => {
        // Close modals, search, etc.
        const escapeEvent = new CustomEvent('handle-escape')
        document.dispatchEvent(escapeEvent)
      },
      description: 'Close dialogs/search',
      preventDefault: false,
    },
    {
      key: 'd',
      modifiers: { cmd: true },
      action: () => router.push('/dashboard'),
      description: 'Go to dashboard',
    },
    {
      key: 'l',
      modifiers: { cmd: true },
      action: () => router.push('/dashboard/notes'),
      description: 'Go to notes list',
    },
  ]

  useKeyboardShortcuts(shortcuts)

  return shortcuts
}

/**
 * Hook for note editor shortcuts
 */
export function useEditorShortcuts(options: {
  onSave?: () => void
  onCancel?: () => void
  onBold?: () => void
  onItalic?: () => void
  onUndo?: () => void
  onRedo?: () => void
}) {
  const { onSave, onCancel, onBold, onItalic, onUndo, onRedo } = options

  const shortcuts: KeyboardShortcut[] = [
    ...(onSave
      ? [
          {
            key: 's',
            modifiers: { cmd: true },
            action: onSave,
            description: 'Save note',
          },
        ]
      : []),
    ...(onCancel
      ? [
          {
            key: 'Escape',
            action: onCancel,
            description: 'Cancel editing',
            preventDefault: false,
          },
        ]
      : []),
    ...(onBold
      ? [
          {
            key: 'b',
            modifiers: { cmd: true },
            action: onBold,
            description: 'Bold text',
          },
        ]
      : []),
    ...(onItalic
      ? [
          {
            key: 'i',
            modifiers: { cmd: true },
            action: onItalic,
            description: 'Italic text',
          },
        ]
      : []),
    ...(onUndo
      ? [
          {
            key: 'z',
            modifiers: { cmd: true },
            action: onUndo,
            description: 'Undo',
          },
        ]
      : []),
    ...(onRedo
      ? [
          {
            key: 'z',
            modifiers: { cmd: true, shift: true },
            action: onRedo,
            description: 'Redo',
          },
        ]
      : []),
  ]

  useKeyboardShortcuts(shortcuts)

  return shortcuts
}

/**
 * Hook for list navigation shortcuts
 */
export function useListShortcuts(options: {
  onSelectNext?: () => void
  onSelectPrevious?: () => void
  onOpenSelected?: () => void
  onDeleteSelected?: () => void
}) {
  const { onSelectNext, onSelectPrevious, onOpenSelected, onDeleteSelected } =
    options

  const shortcuts: KeyboardShortcut[] = [
    ...(onSelectNext
      ? [
          {
            key: 'ArrowDown',
            action: onSelectNext,
            description: 'Select next item',
          },
          {
            key: 'j',
            action: onSelectNext,
            description: 'Select next item (vim-style)',
          },
        ]
      : []),
    ...(onSelectPrevious
      ? [
          {
            key: 'ArrowUp',
            action: onSelectPrevious,
            description: 'Select previous item',
          },
          {
            key: 'k',
            action: onSelectPrevious,
            description: 'Select previous item (vim-style)',
          },
        ]
      : []),
    ...(onOpenSelected
      ? [
          {
            key: 'Enter',
            action: onOpenSelected,
            description: 'Open selected item',
          },
        ]
      : []),
    ...(onDeleteSelected
      ? [
          {
            key: 'Delete',
            action: onDeleteSelected,
            description: 'Delete selected item',
          },
          {
            key: 'Backspace',
            action: onDeleteSelected,
            description: 'Delete selected item',
          },
        ]
      : []),
  ]

  useKeyboardShortcuts(shortcuts)

  return shortcuts
}

/**
 * Hook to announce keyboard shortcuts to screen readers
 */
export function useShortcutAnnouncements() {
  const announceShortcut = useCallback((description: string) => {
    // Create a live region for screen reader announcements
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = description

    document.body.appendChild(announcement)

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, [])

  return { announceShortcut }
}

/**
 * Hook for focus management and accessibility
 */
export function useFocusManagement() {
  const focusableSelectors = [
    'button',
    'input',
    'textarea',
    'select',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ')

  const getFocusableElements = useCallback(
    (container: HTMLElement = document.body) => {
      return Array.from(container.querySelectorAll(focusableSelectors)).filter(
        el =>
          !el.hasAttribute('disabled') &&
          (el as HTMLElement).offsetParent !== null
      ) as HTMLElement[]
    },
    [focusableSelectors]
  )

  const trapFocus = useCallback(
    (container: HTMLElement) => {
      const focusableElements = getFocusableElements(container)
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault()
              lastElement?.focus()
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault()
              firstElement?.focus()
            }
          }
        }
      }

      container.addEventListener('keydown', handleKeyDown)

      // Focus first element
      firstElement?.focus()

      return () => {
        container.removeEventListener('keydown', handleKeyDown)
      }
    },
    [getFocusableElements]
  )

  const restoreFocus = useCallback((previousElement: HTMLElement | null) => {
    if (previousElement && document.contains(previousElement)) {
      previousElement.focus()
    }
  }, [])

  return {
    getFocusableElements,
    trapFocus,
    restoreFocus,
  }
}

/**
 * Hook for skip navigation links
 */
export function useSkipNavigation() {
  useEffect(() => {
    const skipLinks = document.querySelectorAll('[data-skip-to]')

    skipLinks.forEach(link => {
      const handleClick = (e: Event) => {
        e.preventDefault()
        const target = (e.target as HTMLElement).getAttribute('data-skip-to')
        const element = document.getElementById(target || '')

        if (element) {
          element.focus()
          // Scroll into view if needed
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }

      link.addEventListener('click', handleClick)
    })

    return () => {
      skipLinks.forEach(link => {
        link.removeEventListener('click', () => {})
      })
    }
  }, [])
}
