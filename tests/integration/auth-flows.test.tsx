import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// Import test utils first to ensure next/navigation is mocked before component imports
import { renderWithProviders, mockRouter } from '../utils/test-utils'
import { AuthForm } from '@/components/auth/auth-form'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/auth/user-menu'
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

// window.location is provided by tests/setup.ts

describe('Authentication Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouter.push.mockClear()
    localStorage.clear()

    // Reset auth store to initial state
    useAuthStore.setState({
      user: null,
      session: null,
      loading: true,
      initialized: false,
    })
  })

  describe('Complete Sign In Flow', () => {
    it('successfully signs in and shows protected content', async () => {
      // Mock successful sign in
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      // Render sign in form
      renderWithProviders(<AuthForm mode='signin' />)

      // Fill and submit form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Verify API call
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith(
          {
            email: 'test@example.com',
            password: 'password123',
          }
        )
      })

      // Verify redirect to dashboard
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('shows error message on sign in failure', async () => {
      // Mock failed sign in
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockAuthError,
      })

      renderWithProviders(<AuthForm mode='signin' />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(mockAuthError.message)).toBeInTheDocument()
      })

      // Should not redirect on error
      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })

  describe('Complete Sign Up Flow', () => {
    it('successfully signs up and shows confirmation message', async () => {
      // Mock successful sign up
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: mockUser, session: null },
        error: null,
      })

      renderWithProviders(<AuthForm mode='signup' />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })

      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'password123',
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      })

      await waitFor(() => {
        expect(
          screen.getByText(/check your email for the confirmation link/i)
        ).toBeInTheDocument()
      })
    })

    it('navigates between sign in and sign up forms', async () => {
      renderWithProviders(<AuthForm mode='signin' />)

      // Should show sign in form initially
      expect(
        screen.getByRole('heading', { name: /sign in/i })
      ).toBeInTheDocument()

      // Click sign up link
      const signUpLink = screen.getByRole('button', { name: /sign up/i })
      await user.click(signUpLink)

      expect(mockRouter.push).toHaveBeenCalledWith('/auth/signup')
    })
  })

  describe('Google OAuth Flow', () => {
    it('initiates Google OAuth successfully', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { provider: 'google', url: 'https://accounts.google.com/oauth' },
        error: null,
      })

      renderWithProviders(<AuthForm mode='signin' />)

      const googleButton = screen.getByRole('button', {
        name: /continue with google/i,
      })
      await user.click(googleButton)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      })
    })

    it('handles Google OAuth errors', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { provider: null, url: null },
        error: { ...mockAuthError, message: 'OAuth provider error' },
      })

      renderWithProviders(<AuthForm mode='signin' />)

      const googleButton = screen.getByRole('button', {
        name: /continue with google/i,
      })
      await user.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText(/oauth provider error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Protected Route Integration', () => {
    it('redirects unauthenticated users to sign in', async () => {
      // Mock unauthenticated state
      useAuthStore.setState({
        user: null,
        session: null,
        loading: false,
        initialized: true,
      })

      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      await waitFor(() => {
        // We now use router.replace to avoid history pollution
        expect(mockRouter.replace).toHaveBeenCalledWith('/auth/signin')
      })

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('shows protected content for authenticated users', () => {
      // Mock authenticated state
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        loading: false,
        initialized: true,
      })

      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('shows loading state during auth initialization', () => {
      // Mock loading state
      useAuthStore.setState({
        user: null,
        session: null,
        loading: true,
        initialized: false,
      })

      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      expect(
        screen.getByRole('status', { name: /loading/i })
      ).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })

  describe('User Menu Integration', () => {
    it('displays user information correctly', () => {
      // Mock authenticated state
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        loading: false,
        initialized: true,
      })

      renderWithProviders(<UserMenu />)

      expect(screen.getByText(mockUser.email!)).toBeInTheDocument()
      expect(
        screen.getByText(mockUser.user_metadata.full_name)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /sign out/i })
      ).toBeInTheDocument()
    })

    it('handles sign out from user menu', async () => {
      // Mock successful sign out
      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({ error: null })

      // Mock authenticated state
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        loading: false,
        initialized: true,
      })

      renderWithProviders(<UserMenu />)

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      await user.click(signOutButton)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1)
      })
    })

    it('does not render when user is not authenticated', () => {
      // Mock unauthenticated state
      useAuthStore.setState({
        user: null,
        session: null,
        loading: false,
        initialized: true,
      })

      const { container } = renderWithProviders(<UserMenu />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Auth State Persistence', () => {
    it('persists authentication state across sessions', () => {
      // Simulate authenticated state
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        loading: false,
        initialized: true,
      })

      // Check that state is persisted to localStorage
      const storedData = JSON.parse(localStorage.getItem('auth-store') || '{}')
      expect(storedData.state.user).toEqual(mockUser)
      expect(storedData.state.session).toEqual(mockSession)
    })

    it('restores authentication state on app restart', async () => {
      // Pre-populate localStorage with authenticated state
      const persistedState = {
        state: {
          user: mockUser,
          session: mockSession,
        },
        version: 0,
      }
      localStorage.setItem('auth-store', JSON.stringify(persistedState))

      // Create new store instance (simulating app restart)
      // Wait for persisted store to hydrate
      await waitFor(
        () => {
          const store = useAuthStore.getState()
          expect(store.user).toEqual(mockUser)
          expect(store.session).toEqual(mockSession)
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('recovers from network errors during sign in', async () => {
      // First attempt fails with network error
      mockSupabaseClient.auth.signInWithPassword
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { user: mockUser, session: mockSession },
          error: null,
        })

      renderWithProviders(<AuthForm mode='signin' />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      // First attempt
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/an unexpected error occurred/i)
        ).toBeInTheDocument()
      })

      // Clear form and try again
      await user.clear(emailInput)
      await user.clear(passwordInput)
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Second attempt should succeed
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('handles session expiration gracefully', async () => {
      // Start with authenticated state
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        loading: false,
        initialized: true,
      })

      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      // Initially shows protected content
      expect(screen.getByText('Protected Content')).toBeInTheDocument()

      // Simulate session expiration
      useAuthStore.setState({
        user: null,
        session: null,
        loading: false,
        initialized: true,
      })

      // Should redirect to sign in
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/auth/signin')
      })
    })
  })

  describe('Multiple Components Integration', () => {
    it('handles authentication state changes across multiple components', async () => {
      // Start unauthenticated
      useAuthStore.setState({
        user: null,
        session: null,
        loading: false,
        initialized: true,
      })

      const TestApp = () => (
        <div>
          <UserMenu />
          <ProtectedRoute>
            <div>Dashboard Content</div>
          </ProtectedRoute>
          <AuthForm mode='signin' />
        </div>
      )

      renderWithProviders(<TestApp />)

      // Should show auth form and protected route should redirect
      expect(
        screen.getByRole('heading', { name: /sign in/i })
      ).toBeInTheDocument()
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()

      // UserMenu should not render
      expect(
        screen.queryByRole('button', { name: /sign out/i })
      ).not.toBeInTheDocument()

      // Simulate successful authentication
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        loading: false,
        initialized: true,
      })

      // Should now show protected content and user menu
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
      expect(screen.getByText(mockUser.email!)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /sign out/i })
      ).toBeInTheDocument()
    })
  })
})
