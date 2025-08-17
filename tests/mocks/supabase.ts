import { vi } from 'vitest'
import type { User, Session, AuthError } from '@supabase/supabase-js'

// Mock user data for testing
export const mockUser: User = {
  id: 'test-user-id',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2024-01-01T00:00:00.000Z',
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {
    provider: 'email',
    providers: ['email'],
  },
  user_metadata: {
    full_name: 'Test User',
  },
  identities: [],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

export const mockGoogleUser: User = {
  ...mockUser,
  id: 'google-user-id',
  email: 'testgoogle@example.com',
  app_metadata: {
    provider: 'google',
    providers: ['google'],
  },
  user_metadata: {
    full_name: 'Google Test User',
    picture: 'https://example.com/avatar.jpg',
  },
}

export const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
}

export const mockAuthError = {
  name: 'AuthError',
  message: 'Invalid login credentials',
  code: 'invalid_credentials',
  status: 400,
} as unknown as AuthError

// Create comprehensive Supabase client mock
export const createMockSupabaseClient = () => {
  const mockAuth = {
    getSession: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    getUser: vi.fn(),
    refreshSession: vi.fn(),
  }

  return {
    auth: mockAuth,
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
  }
}

// Mock implementation that can be configured for different test scenarios
export const configureMockAuth = (
  mockClient: ReturnType<typeof createMockSupabaseClient>,
  scenario: 'success' | 'error' | 'loading' | 'signed-out' = 'success'
) => {
  const { auth } = mockClient

  switch (scenario) {
    case 'success':
      auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      })
      auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })
      auth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com/oauth' },
        error: null,
      })
      auth.signOut.mockResolvedValue({ error: null })
      auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      break

    case 'error':
      auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })
      auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockAuthError,
      })
      auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockAuthError,
      })
      auth.signInWithOAuth.mockResolvedValue({
        data: { provider: null, url: null },
        error: mockAuthError,
      })
      auth.signOut.mockResolvedValue({ error: mockAuthError })
      auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: mockAuthError,
      })
      break

    case 'signed-out':
      auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })
      auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      })
      auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })
      auth.signOut.mockResolvedValue({ error: null })
      break

    case 'loading':
      auth.getSession.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  data: { session: mockSession },
                  error: null,
                }),
              100
            )
          )
      )
      break
  }

  // Mock auth state change listener
  auth.onAuthStateChange.mockImplementation(callback => {
    // Store callback for manual triggering in tests
    return {
      data: { subscription: { unsubscribe: vi.fn() } },
    }
  })

  return mockClient
}

// Export mock factory for easy use in tests
export const createMockAuthClient = (
  scenario?: Parameters<typeof configureMockAuth>[1]
) => {
  const client = createMockSupabaseClient()
  return configureMockAuth(client, scenario)
}
