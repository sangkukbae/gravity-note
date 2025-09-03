import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuthStore } from '@/lib/stores/auth'
import {
  createMockAuthClient,
  mockUser,
  mockSession,
  mockAuthError,
} from '../mocks/supabase'

// Mock the Supabase client
const mockSupabaseClient = createMockAuthClient()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock console to avoid noise in tests
const originalConsole = console
beforeEach(() => {
  console.error = vi.fn()
  console.warn = vi.fn()
  console.log = vi.fn()
})

afterEach(() => {
  console.error = originalConsole.error
  console.warn = originalConsole.warn
  console.log = originalConsole.log
})

describe('Auth Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage before each test
    localStorage.clear()
    // Reset the store state
    useAuthStore.setState({
      user: null,
      session: null,
      loading: true,
      initialized: false,
    })
  })

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useAuthStore())

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.loading).toBe(true)
      expect(result.current.initialized).toBe(false)
    })

    it('provides all required actions', () => {
      const { result } = renderHook(() => useAuthStore())

      expect(typeof result.current.setUser).toBe('function')
      expect(typeof result.current.setSession).toBe('function')
      expect(typeof result.current.setLoading).toBe('function')
      expect(typeof result.current.setInitialized).toBe('function')
      expect(typeof result.current.signOut).toBe('function')
      expect(typeof result.current.initialize).toBe('function')
    })
  })

  describe('State Actions', () => {
    it('updates user state correctly', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setUser(mockUser)
      })

      expect(result.current.user).toEqual(mockUser)
    })

    it('updates session state correctly', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setSession(mockSession)
      })

      expect(result.current.session).toEqual(mockSession)
    })

    it('updates loading state correctly', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setLoading(false)
      })

      expect(result.current.loading).toBe(false)
    })

    it('updates initialized state correctly', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setInitialized(true)
      })

      expect(result.current.initialized).toBe(true)
    })
  })

  describe('Initialize Function', () => {
    it('initializes with existing session successfully', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      })

      // Mock onAuthStateChange to return subscription
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValueOnce({
        data: { subscription: { unsubscribe: vi.fn() } },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.user).toEqual(mockSession.user)
      expect(result.current.session).toEqual(mockSession)
      expect(result.current.loading).toBe(false)
      expect(result.current.initialized).toBe(true)
    })

    it('initializes without session correctly', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValueOnce({
        data: { subscription: { unsubscribe: vi.fn() } },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.initialized).toBe(true)
    })

    it('handles initialization errors gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValueOnce(
        new Error('Network error')
      )

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.initialized).toBe(true)
      expect(console.error).toHaveBeenCalledWith(
        'Error initializing auth:',
        expect.any(Error)
      )
    })

    it('sets up auth state change listener', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      const mockCallback = vi.fn()
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation(callback => {
        mockCallback.mockImplementation(callback)
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        }
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.initialize()
      })

      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      )

      // Test auth state change callback
      act(() => {
        mockCallback('SIGNED_IN', mockSession)
      })

      expect(result.current.user).toEqual(mockSession.user)
      expect(result.current.session).toEqual(mockSession)
      expect(result.current.loading).toBe(false)

      // Test sign out callback
      act(() => {
        mockCallback('SIGNED_OUT', null)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
    })
  })

  describe('Sign Out Function', () => {
    it('signs out successfully', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({ error: null })

      const { result } = renderHook(() => useAuthStore())

      // Set initial authenticated state
      act(() => {
        result.current.setUser(mockUser)
        result.current.setSession(mockSession)
        result.current.setLoading(false)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1)
      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.loading).toBe(false)
    })

    it('handles sign out errors gracefully', async () => {
      // Current implementation treats a resolved response with error as success
      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({
        error: mockAuthError,
      })

      const { result } = renderHook(() => useAuthStore())

      // Set initial authenticated state
      act(() => {
        result.current.setUser(mockUser)
        result.current.setSession(mockSession)
        result.current.setLoading(false)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      // Store resets state and does not throw
      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.loading).toBe(false)
    })

    it('shows loading state during sign out', async () => {
      let resolveSignOut: (value: any) => void
      const signOutPromise = new Promise(resolve => {
        resolveSignOut = resolve
      })

      mockSupabaseClient.auth.signOut.mockReturnValueOnce(signOutPromise)

      const { result } = renderHook(() => useAuthStore())

      // Set initial authenticated state
      act(() => {
        result.current.setUser(mockUser)
        result.current.setSession(mockSession)
        result.current.setLoading(false)
      })

      // Start sign out (don't await yet)
      act(() => {
        result.current.signOut()
      })

      // Should be loading
      expect(result.current.loading).toBe(true)

      // Complete sign out
      await act(async () => {
        resolveSignOut!({ error: null })
        await signOutPromise
      })

      expect(result.current.loading).toBe(false)
    })

    it('handles sign out network errors', async () => {
      mockSupabaseClient.auth.signOut.mockRejectedValueOnce(
        new Error('Network error')
      )

      const { result } = renderHook(() => useAuthStore())

      // Set initial authenticated state
      act(() => {
        result.current.setUser(mockUser)
        result.current.setSession(mockSession)
        result.current.setLoading(false)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(console.error).toHaveBeenCalledWith(
        'Error signing out:',
        expect.any(Error)
      )
      expect(result.current.loading).toBe(false)
    })
  })

  describe('Persistence', () => {
    it('persists user and session to localStorage', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setUser(mockUser)
        result.current.setSession(mockSession)
      })

      const storedData = JSON.parse(localStorage.getItem('auth-store') || '{}')
      expect(storedData.state.user).toEqual(mockUser)
      expect(storedData.state.session).toEqual(mockSession)
    })

    it('restores state from localStorage on initialization', async () => {
      // Pre-populate localStorage
      const persistedState = {
        state: {
          user: mockUser,
          session: mockSession,
        },
        version: 0,
      }
      localStorage.setItem('auth-store', JSON.stringify(persistedState))

      // Create new hook instance (simulating app restart)
      const { result } = renderHook(() => useAuthStore())

      // Hydration is async; wait for state to rehydrate
      await waitFor(
        () => {
          expect(result.current.user).toEqual(mockUser)
          expect(result.current.session).toEqual(mockSession)
        },
        { timeout: 3000 }
      )
    })

    it('only persists specified state properties', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setUser(mockUser)
        result.current.setSession(mockSession)
        result.current.setLoading(false)
        result.current.setInitialized(true)
      })

      const storedData = JSON.parse(localStorage.getItem('auth-store') || '{}')

      // Should persist user and session
      expect(storedData.state.user).toEqual(mockUser)
      expect(storedData.state.session).toEqual(mockSession)

      // Should not persist loading and initialized states
      expect(storedData.state.loading).toBeUndefined()
      expect(storedData.state.initialized).toBeUndefined()
    })
  })

  describe('Integration Scenarios', () => {
    it('handles complete authentication flow', async () => {
      const { result } = renderHook(() => useAuthStore())

      // Start with no session
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      let authStateCallback: (event: string, session: any) => void
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation(callback => {
        authStateCallback = callback
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        }
      })

      // Initialize
      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.initialized).toBe(true)

      // Simulate successful sign in
      act(() => {
        authStateCallback('SIGNED_IN', mockSession)
      })

      expect(result.current.user).toEqual(mockSession.user)
      expect(result.current.session).toEqual(mockSession)

      // Simulate sign out
      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({ error: null })

      await act(async () => {
        await result.current.signOut()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
    })

    it('handles session refresh', async () => {
      const { result } = renderHook(() => useAuthStore())

      let authStateCallback: (event: string, session: any) => void
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation(callback => {
        authStateCallback = callback
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        }
      })

      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      })

      await act(async () => {
        await result.current.initialize()
      })

      // Simulate token refresh
      const refreshedSession = {
        ...mockSession,
        access_token: 'new-access-token',
      }

      act(() => {
        authStateCallback('TOKEN_REFRESHED', refreshedSession)
      })

      expect(result.current.session?.access_token).toBe('new-access-token')
    })
  })
})
