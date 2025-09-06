import { useMemo, useReducer } from 'react'
import { Note } from '@/components/notes/note-item'

export interface SearchState {
  mode:
    | 'browsing'
    | 'search-opening'
    | 'search-empty'
    | 'search-typing'
    | 'search-loading'
    | 'search-results'
    | 'search-clearing'
  query: string
  results: Note[]
  isTransitioning: boolean
  transitionStartedAt: number | null
  error: string | null
}

type SearchAction =
  | { type: 'OPEN_SEARCH' }
  | { type: 'CLOSE_SEARCH' }
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'START_SEARCH' }
  | { type: 'SET_RESULTS'; payload: Note[] }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'COMPLETE_CLEAR' }
  | { type: 'SET_ERROR'; payload: string }

const searchStateReducer = (
  state: SearchState,
  action: SearchAction
): SearchState => {
  switch (action.type) {
    case 'OPEN_SEARCH':
      return {
        ...state,
        mode: 'search-opening',
        isTransitioning: true,
        transitionStartedAt: Date.now(),
        error: null,
      }

    case 'CLOSE_SEARCH':
      return {
        ...state,
        mode: state.query ? 'search-clearing' : 'browsing',
        isTransitioning: state.query ? true : false,
        transitionStartedAt: state.query ? Date.now() : null,
      }

    case 'SET_QUERY':
      const query = action.payload
      const trimmedQuery = query.trim()

      if (!trimmedQuery) {
        return {
          ...state,
          query: action.payload,
          mode: 'search-empty',
          error: null,
        }
      }

      return {
        ...state,
        query: action.payload,
        mode:
          trimmedQuery !== state.query.trim() ? 'search-typing' : state.mode,
        error: null,
      }

    case 'START_SEARCH':
      return {
        ...state,
        mode: 'search-loading',
        error: null,
        isTransitioning: true,
        transitionStartedAt: Date.now(),
      }

    case 'SET_RESULTS':
      return {
        ...state,
        mode: 'search-results',
        results: action.payload,
        isTransitioning: false,
        transitionStartedAt: null,
        error: null,
      }

    case 'CLEAR_SEARCH':
      return {
        ...state,
        mode: 'search-clearing',
        isTransitioning: true,
        transitionStartedAt: Date.now(),
      }

    case 'COMPLETE_CLEAR':
      return {
        ...state,
        mode: 'browsing',
        query: '',
        results: [],
        isTransitioning: false,
        transitionStartedAt: null,
        error: null,
      }

    case 'SET_ERROR':
      return {
        ...state,
        mode: 'browsing', // Return to browsing on error
        error: action.payload,
        isTransitioning: false,
        transitionStartedAt: null,
      }

    default:
      return state
  }
}

const initialState: SearchState = {
  mode: 'browsing',
  query: '',
  results: [],
  isTransitioning: false,
  transitionStartedAt: null,
  error: null,
}

export const useSearchState = () => {
  const [state, dispatch] = useReducer(searchStateReducer, initialState)

  const actions = useMemo(
    () => ({
      openSearch: () => dispatch({ type: 'OPEN_SEARCH' }),
      closeSearch: () => dispatch({ type: 'CLOSE_SEARCH' }),
      setQuery: (query: string) =>
        dispatch({ type: 'SET_QUERY', payload: query }),
      startSearch: () => dispatch({ type: 'START_SEARCH' }),
      setResults: (results: Note[]) =>
        dispatch({ type: 'SET_RESULTS', payload: results }),
      clearSearch: () => dispatch({ type: 'CLEAR_SEARCH' }),
      completeClear: () => dispatch({ type: 'COMPLETE_CLEAR' }),
      setError: (error: string) =>
        dispatch({ type: 'SET_ERROR', payload: error }),
    }),
    []
  )

  return useMemo(() => ({ state, ...actions }), [state, actions])
}

// Helper type export for components
export type SearchActions = ReturnType<typeof useSearchState>
