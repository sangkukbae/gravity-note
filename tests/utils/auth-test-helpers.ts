import { vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '@/lib/stores/auth'
import { mockUser, mockSession, createMockAuthClient } from '../mocks/supabase'

// Helper to reset auth store to initial state
export const resetAuthStore = () => {
  useAuthStore.setState({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  })
}

// Helper to set authenticated state
export const setAuthenticatedState = (
  user = mockUser,
  session = mockSession
) => {
  useAuthStore.setState({
    user,
    session,
    loading: false,
    initialized: true,
  })
}

// Helper to set unauthenticated state
export const setUnauthenticatedState = () => {
  useAuthStore.setState({
    user: null,
    session: null,
    loading: false,
    initialized: true,
  })
}

// Helper to set loading state
export const setLoadingState = () => {
  useAuthStore.setState({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  })
}

// Helper to simulate authentication flow
export const simulateAuthFlow = async (
  scenario: 'success' | 'error' | 'signup-success' = 'success'
) => {
  const mockClient = createMockAuthClient(
    scenario === 'error' ? 'error' : 'success'
  )

  const { result } = renderHook(() => useAuthStore())

  // Start with loading state
  act(() => {
    setLoadingState()
  })

  // Initialize auth
  await act(async () => {
    await result.current.initialize()
  })

  // Simulate auth state change based on scenario
  if (scenario === 'success') {
    act(() => {
      setAuthenticatedState()
    })
  } else if (scenario === 'signup-success') {
    act(() => {
      useAuthStore.setState({
        user: null, // User not signed in until email confirmation
        session: null,
        loading: false,
        initialized: true,
      })
    })
  } else {
    act(() => {
      setUnauthenticatedState()
    })
  }

  return result
}

// Helper to test auth store actions
export const createAuthStoreTest = () => {
  const { result } = renderHook(() => useAuthStore())

  return {
    store: result,
    setUser: (user: any) => act(() => result.current.setUser(user)),
    setSession: (session: any) => act(() => result.current.setSession(session)),
    setLoading: (loading: boolean) =>
      act(() => result.current.setLoading(loading)),
    setInitialized: (initialized: boolean) =>
      act(() => result.current.setInitialized(initialized)),
    signOut: async () => await act(async () => await result.current.signOut()),
    initialize: async () =>
      await act(async () => await result.current.initialize()),
  }
}

// Helper to mock localStorage
export const mockLocalStorage = () => {
  const storage = new Map<string, string>()

  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) => storage.get(key) || null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: vi.fn((key: string) => storage.delete(key)),
      clear: vi.fn(() => storage.clear()),
      length: storage.size,
      key: vi.fn((index: number) => Array.from(storage.keys())[index] || null),
    },
    writable: true,
  })

  return {
    storage,
    getStoredAuth: () => {
      const stored = storage.get('auth-store')
      return stored ? JSON.parse(stored) : null
    },
    setStoredAuth: (authData: any) => {
      storage.set('auth-store', JSON.stringify(authData))
    },
    clearStorage: () => storage.clear(),
  }
}

// Helper to create auth form test data
export const createAuthFormTestData = () => ({
  validSignIn: {
    email: 'test@example.com',
    password: 'password123',
  },
  validSignUp: {
    email: 'newuser@example.com',
    password: 'password123',
  },
  invalidEmail: {
    email: 'invalid-email',
    password: 'password123',
  },
  shortPassword: {
    email: 'test@example.com',
    password: '12345',
  },
  emptyForm: {
    email: '',
    password: '',
  },
  googleUser: {
    id: 'google-user-id',
    email: 'google@example.com',
    user_metadata: {
      full_name: 'Google User',
      picture: 'https://example.com/avatar.jpg',
    },
    app_metadata: {
      provider: 'google',
      providers: ['google'],
    },
  },
})

// Helper to wait for auth state changes
export const waitForAuthStateChange = async (
  expectedState: 'authenticated' | 'unauthenticated' | 'loading',
  timeout = 5000
) => {
  const startTime = Date.now()

  return new Promise<void>((resolve, reject) => {
    const checkState = () => {
      const store = useAuthStore.getState()

      let stateMatches = false
      switch (expectedState) {
        case 'authenticated':
          stateMatches =
            !!store.user &&
            !!store.session &&
            !store.loading &&
            store.initialized
          break
        case 'unauthenticated':
          stateMatches =
            !store.user && !store.session && !store.loading && store.initialized
          break
        case 'loading':
          stateMatches = store.loading || !store.initialized
          break
      }

      if (stateMatches) {
        resolve()
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for auth state: ${expectedState}`))
      } else {
        setTimeout(checkState, 50)
      }
    }

    checkState()
  })
}

// Helper to mock auth provider context
export const createMockAuthProvider = (initialState = {}) => {
  const defaultState = {
    user: null,
    session: null,
    loading: false,
    initialized: true,
    ...initialState,
  }

  return {
    ...defaultState,
    setUser: vi.fn(),
    setSession: vi.fn(),
    setLoading: vi.fn(),
    setInitialized: vi.fn(),
    signOut: vi.fn(),
    initialize: vi.fn(),
  }
}

// Helper to test protected route behavior
export const testProtectedRouteScenarios = () => ({
  authenticated: () => setAuthenticatedState(),
  unauthenticated: () => setUnauthenticatedState(),
  loading: () => setLoadingState(),
  sessionExpired: () => {
    // Simulate session expiration
    setAuthenticatedState()
    setTimeout(() => setUnauthenticatedState(), 100)
  },
})

// Helper to create test user data variants
export const createTestUsers = () => ({
  standard: mockUser,
  withoutName: {
    ...mockUser,
    user_metadata: {},
  },
  googleUser: {
    ...mockUser,
    id: 'google-user-id',
    email: 'google@example.com',
    app_metadata: {
      provider: 'google',
      providers: ['google'],
    },
    user_metadata: {
      full_name: 'Google User',
      picture: 'https://example.com/avatar.jpg',
    },
  },
  longEmail: {
    ...mockUser,
    email: 'very.long.email.address@very.long.domain.name.example.com',
  },
})
