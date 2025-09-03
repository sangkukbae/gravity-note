import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// Import test utils first to ensure next/navigation is mocked before component import
import { renderWithProviders, mockRouter } from '../../utils/test-utils'
import { AuthForm } from '@/components/auth/auth-form'
import { createMockAuthClient, mockAuthError } from '../../mocks/supabase'

// Mock the Supabase client
const mockSupabaseClient = createMockAuthClient()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// window.location is provided by tests/setup.ts

describe('AuthForm Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouter.push.mockClear()
  })

  describe('Sign In Mode', () => {
    it('renders sign in form correctly', () => {
      renderWithProviders(<AuthForm mode='signin' />)

      expect(
        screen.getByRole('heading', { name: /sign in/i })
      ).toBeInTheDocument()
      expect(
        screen.getByText(/enter your credentials to access your account/i)
      ).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /sign in/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /continue with google/i })
      ).toBeInTheDocument()
    })

    it('shows sign up link for sign in mode', () => {
      renderWithProviders(<AuthForm mode='signin' />)

      expect(screen.getByText(/don't have an account?/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /sign up/i })
      ).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      renderWithProviders(<AuthForm mode='signin' />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Check HTML5 validation
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        /password/i
      ) as HTMLInputElement

      expect(emailInput.checkValidity()).toBe(false)
      expect(passwordInput.checkValidity()).toBe(false)
    })

    it('validates email format', async () => {
      renderWithProviders(<AuthForm mode='signin' />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      expect((emailInput as HTMLInputElement).checkValidity()).toBe(false)
    })

    it('validates password minimum length', async () => {
      renderWithProviders(<AuthForm mode='signin' />)

      const passwordInput = screen.getByLabelText(/password/i)
      await user.type(passwordInput, '12345') // Less than 6 characters

      expect((passwordInput as HTMLInputElement).checkValidity()).toBe(false)
    })

    it('submits form with valid credentials and redirects to dashboard', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'test-user' }, session: { access_token: 'token' } },
        error: null,
      })

      renderWithProviders(<AuthForm mode='signin' />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith(
          {
            email: 'test@example.com',
            password: 'password123',
          }
        )
      })

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('displays error message on sign in failure', async () => {
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
    })

    it('shows loading state during form submission', async () => {
      // Mock a delayed response
      mockSupabaseClient.auth.signInWithPassword.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    user: { id: 'test' },
                    session: { access_token: 'token' },
                  },
                  error: null,
                }),
              100
            )
          )
      )

      renderWithProviders(<AuthForm mode='signin' />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })
    })

    it('navigates to sign up page when sign up link clicked', async () => {
      renderWithProviders(<AuthForm mode='signin' />)

      const signUpLink = screen.getByRole('button', { name: /sign up/i })
      await user.click(signUpLink)

      expect(mockRouter.push).toHaveBeenCalledWith('/auth/signup')
    })
  })

  describe('Sign Up Mode', () => {
    it('renders sign up form correctly', () => {
      renderWithProviders(<AuthForm mode='signup' />)

      expect(
        screen.getByRole('heading', { name: /sign up/i })
      ).toBeInTheDocument()
      expect(
        screen.getByText(/create a new account to get started/i)
      ).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /sign up/i })
      ).toBeInTheDocument()
    })

    it('shows sign in link for sign up mode', () => {
      renderWithProviders(<AuthForm mode='signup' />)

      expect(screen.getByText(/already have an account?/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /sign in/i })
      ).toBeInTheDocument()
    })

    it('submits sign up form and shows confirmation message', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'test-user' }, session: null },
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

    it('displays error message on sign up failure', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { ...mockAuthError, message: 'Email already exists' },
      })

      renderWithProviders(<AuthForm mode='signup' />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })

      await user.type(emailInput, 'existing@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
      })
    })

    it('navigates to sign in page when sign in link clicked', async () => {
      renderWithProviders(<AuthForm mode='signup' />)

      const signInLink = screen.getByRole('button', { name: /sign in/i })
      await user.click(signInLink)

      expect(mockRouter.push).toHaveBeenCalledWith('/auth/signin')
    })
  })

  describe('Google OAuth', () => {
    it('initiates Google OAuth flow', async () => {
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

    it('displays error message on Google OAuth failure', async () => {
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

    it('shows loading state during Google OAuth', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    provider: 'google',
                    url: 'https://accounts.google.com/oauth',
                  },
                  error: null,
                }),
              100
            )
          )
      )

      renderWithProviders(<AuthForm mode='signin' />)

      const googleButton = screen.getByRole('button', {
        name: /continue with google/i,
      })
      await user.click(googleButton)

      expect(googleButton).toBeDisabled()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()

      await waitFor(() => {
        expect(googleButton).not.toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles unexpected errors gracefully', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValueOnce(
        new Error('Network error')
      )

      renderWithProviders(<AuthForm mode='signin' />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/an unexpected error occurred/i)
        ).toBeInTheDocument()
      })
    })

    it('clears error message when user starts typing', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockAuthError,
      })

      renderWithProviders(<AuthForm mode='signin' />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Trigger error
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(mockAuthError.message)).toBeInTheDocument()
      })

      // Clear error by modifying form
      await user.type(emailInput, 'a')

      expect(screen.queryByText(mockAuthError.message)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      renderWithProviders(<AuthForm mode='signin' />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('minLength', '6')
    })

    it('has proper button roles and names', () => {
      renderWithProviders(<AuthForm mode='signin' />)

      expect(screen.getByRole('button', { name: /sign in/i })).toHaveAttribute(
        'type',
        'submit'
      )
      expect(
        screen.getByRole('button', { name: /continue with google/i })
      ).toHaveAttribute('type', 'button')
      expect(screen.getByRole('button', { name: /sign up/i })).toHaveAttribute(
        'type',
        'button'
      )
    })
  })
})
