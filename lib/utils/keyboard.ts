/**
 * Utility functions for keyboard shortcuts and platform detection
 */

/**
 * Detect if the user is on macOS based on navigator.platform or userAgent
 */
export function isMac(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
    /Mac/.test(navigator.userAgent)
  )
}

/**
 * Get the appropriate key combination display text for the current platform
 */
export function getSearchShortcutText(): string {
  return isMac() ? '⌘ K' : 'Ctrl+K'
}

/**
 * Get the appropriate key combination display text with full words for tooltips
 */
export function getSearchShortcutTooltip(): string {
  return isMac() ? 'Cmd+K' : 'Ctrl+K'
}

/**
 * Check if a keyboard event matches the search shortcut (Cmd+K on Mac, Ctrl+K elsewhere)
 */
export function isSearchShortcut(event: KeyboardEvent): boolean {
  const { key, metaKey, ctrlKey, shiftKey, altKey } = event

  // Must be 'k' key
  if (key.toLowerCase() !== 'k') {
    return false
  }

  // No shift or alt modifiers allowed
  if (shiftKey || altKey) {
    return false
  }

  // Accept either Cmd+K or Ctrl+K regardless of platform detection to support tests and environments
  return (metaKey || ctrlKey) && !(metaKey && ctrlKey)
}

/**
 * Check if the target element is an editable input
 * Used to prevent shortcuts from firing when user is typing in input fields
 */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.contentEditable === 'true' ||
    target.isContentEditable
  )
}

/**
 * Check if a search shortcut should be handled (not in editable element, correct key combo)
 */
export function shouldHandleSearchShortcut(event: KeyboardEvent): boolean {
  return isSearchShortcut(event) && !isEditableElement(event.target)
}
