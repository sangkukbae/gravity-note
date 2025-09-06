export const SEARCH_TRANSITIONS = {
  OPEN_DELAY: 100, // Delay before showing search input
  CLEAR_DELAY: 200, // Delay during search clearing
  DEBOUNCE_DELAY: 300, // Search query debounce
  ANIMATION_DURATION: 300, // CSS animation duration
  SHIMMER_DURATION: 1500, // Loading shimmer animation
} as const

export const SEARCH_STATES = {
  BROWSING: 'browsing',
  SEARCH_OPENING: 'search-opening',
  SEARCH_EMPTY: 'search-empty',
  SEARCH_TYPING: 'search-typing',
  SEARCH_LOADING: 'search-loading',
  SEARCH_RESULTS: 'search-results',
  SEARCH_CLEARING: 'search-clearing',
} as const

// Helper function to determine if a state should show loading UI
export const isLoadingState = (mode: string): boolean => {
  return mode === SEARCH_STATES.SEARCH_LOADING
}

// Helper function to determine if a state should show transition UI
export const isTransitionState = (mode: string): boolean => {
  return [SEARCH_STATES.SEARCH_OPENING, SEARCH_STATES.SEARCH_CLEARING].includes(
    mode as typeof SEARCH_STATES.SEARCH_OPENING
  )
}

// Helper function to determine if search is active
export const isSearchActive = (mode: string): boolean => {
  return [
    SEARCH_STATES.SEARCH_OPENING,
    SEARCH_STATES.SEARCH_EMPTY,
    SEARCH_STATES.SEARCH_TYPING,
    SEARCH_STATES.SEARCH_LOADING,
    SEARCH_STATES.SEARCH_RESULTS,
    SEARCH_STATES.SEARCH_CLEARING,
  ].includes(mode as typeof SEARCH_STATES.SEARCH_OPENING)
}
