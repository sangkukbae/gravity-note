import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
// Import test utils first to ensure next/navigation is mocked before component import
import { renderWithProviders, mockRouter } from '../../utils/test-utils'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuthStore } from '@/lib/stores/auth'

// Mock the auth store
vi.mock('@/lib/stores/auth')
const mockUseAuthStore = vi.mocked(useAuthStore)

// Mock user data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' },
}

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouter.push.mockClear()
  })

  it('shows loading spinner when auth is not initialized', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      loading: false,
      initialized: false,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
      session: null,
    })

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('shows loading spinner when auth is loading', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      loading: true,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
      session: null,
    })

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
      session: { access_token: 'token', user: mockUser },
    })

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: /loading/i })
    ).not.toBeInTheDocument()
  })

  it('redirects to default signin page when user is not authenticated', async () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
      session: null,
    })

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/signin')
    })

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to custom redirect path when specified', async () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
      session: null,
    })

    renderWithProviders(
      <ProtectedRoute redirectTo='/custom-login'>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/custom-login')
    })

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('does not redirect when loading or not initialized', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      loading: true,
      initialized: false,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
      session: null,
    })

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Should not redirect during loading
    expect(mockRouter.push).not.toHaveBeenCalled()
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })

  it('returns null when user is null after loading completes', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
      session: null,
    })

    const { container } = renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Component should render nothing (null) when no user
    expect(container.firstChild).toBeNull()
  })

  it('handles auth state changes correctly', async () => {
    const mockStore = {
      user: null,
      loading: true,
      initialized: false,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
      session: null,
    } as any

    mockUseAuthStore.mockReturnValue(mockStore)

    const { rerender } = renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Initially loading
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()

    // Update mock to simulate auth initialization complete with user
    mockStore.user = mockUser
    mockStore.loading = false
    mockStore.initialized = true
    mockStore.session = { access_token: 'token', user: mockUser }

    rerender(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Should now show protected content
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: /loading/i })
    ).not.toBeInTheDocument()
  })

  it('handles user logout correctly', async () => {
    const mockStore = {
      user: mockUser,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
      session: { access_token: 'token', user: mockUser },
    } as any

    mockUseAuthStore.mockReturnValue(mockStore)

    const { rerender } = renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Initially showing protected content
    expect(screen.getByText('Protected Content')).toBeInTheDocument()

    // Simulate user logout
    mockStore.user = null
    mockStore.session = null

    rerender(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Should redirect to signin
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/signin')
    })
  })

  describe('Loading Component', () => {
    it('has correct accessibility attributes', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        loading: true,
        initialized: false,
        setUser: vi.fn(),
        setSession: vi.fn(),
        setLoading: vi.fn(),
        setInitialized: vi.fn(),
        signOut: vi.fn(),
        initialize: vi.fn(),
        session: null,
      })

      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      const loadingSpinner = screen.getByRole('status', { name: /loading/i })
      expect(loadingSpinner).toHaveClass('animate-spin')
      expect(loadingSpinner).toHaveClass('border-primary')
    })

    it('centers loading spinner correctly', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        loading: true,
        initialized: false,
        setUser: vi.fn(),
        setSession: vi.fn(),
        setLoading: vi.fn(),
        setInitialized: vi.fn(),
        signOut: vi.fn(),
        initialize: vi.fn(),
        session: null,
      })

      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      const container = screen.getByRole('status', {
        name: /loading/i,
      }).parentElement
      expect(container).toHaveClass(
        'min-h-screen',
        'flex',
        'items-center',
        'justify-center'
      )
    })
  })
})
