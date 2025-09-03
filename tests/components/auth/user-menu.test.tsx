import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserMenu } from '@/components/auth/user-menu'
import { renderWithProviders } from '../../utils/test-utils'
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

const mockUserWithoutName = {
  id: 'test-user-id-2',
  email: 'noname@example.com',
  user_metadata: {},
}

const mockGoogleUser = {
  id: 'google-user-id',
  email: 'google@example.com',
  user_metadata: {
    full_name: 'Google User',
    picture: 'https://example.com/avatar.jpg',
  },
}

describe('UserMenu Component', () => {
  const mockSignOut = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSignOut.mockClear()
  })

  it('renders nothing when user is not logged in', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: mockSignOut,
      initialize: vi.fn(),
      session: null,
    })

    const { container } = renderWithProviders(<UserMenu />)

    expect(container.firstChild).toBeNull()
  })

  it('renders user menu when user is logged in', async () => {
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: mockSignOut,
      initialize: vi.fn(),
      session: { access_token: 'token', user: mockUser },
    })

    renderWithProviders(<UserMenu />)
    // Open dropdown menu
    await user.click(screen.getByRole('button', { name: /user menu/i }))

    expect(await screen.findByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText(/sign out/i)).toBeInTheDocument()
  })

  it('shows "User" as fallback when full_name is not available', async () => {
    mockUseAuthStore.mockReturnValue({
      user: mockUserWithoutName,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: mockSignOut,
      initialize: vi.fn(),
      session: { access_token: 'token', user: mockUserWithoutName },
    })

    renderWithProviders(<UserMenu />)
    await user.click(screen.getByRole('button', { name: /user menu/i }))

    expect(await screen.findByText('noname@example.com')).toBeInTheDocument()
    expect(screen.getByText('User')).toBeInTheDocument()
  })

  it('handles user with Google profile correctly', async () => {
    mockUseAuthStore.mockReturnValue({
      user: mockGoogleUser,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: mockSignOut,
      initialize: vi.fn(),
      session: { access_token: 'token', user: mockGoogleUser },
    })

    renderWithProviders(<UserMenu />)
    await user.click(screen.getByRole('button', { name: /user menu/i }))

    expect(await screen.findByText('google@example.com')).toBeInTheDocument()
    expect(screen.getByText('Google User')).toBeInTheDocument()
  })

  it('calls signOut when sign out button is clicked', async () => {
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: mockSignOut,
      initialize: vi.fn(),
      session: { access_token: 'token', user: mockUser },
    })

    renderWithProviders(<UserMenu />)
    await user.click(screen.getByRole('button', { name: /user menu/i }))
    const signOutButton = await screen.findByText(/sign out/i)
    await user.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('has correct layout and styling', async () => {
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: mockSignOut,
      initialize: vi.fn(),
      session: { access_token: 'token', user: mockUser },
    })

    renderWithProviders(<UserMenu />)
    await user.click(screen.getByRole('button', { name: /user menu/i }))

    // Check the main container has correct classes
    const container = (await screen.findByText('test@example.com')).closest(
      'div'
    )
    expect(container?.parentElement).toHaveClass(
      'flex',
      'items-center',
      'gap-4',
      'p-4',
      'border-b'
    )

    // Check user avatar placeholder
    const avatar = container?.parentElement?.querySelector('.rounded-full')
    expect(avatar).toHaveClass(
      'h-8',
      'w-8',
      'rounded-full',
      'bg-primary/10',
      'flex',
      'items-center',
      'justify-center'
    )

    // Check user info layout
    const userInfo = (await screen.findByText('test@example.com')).parentElement
    expect(userInfo).toHaveClass('flex', 'flex-col')

    // Check email styling
    expect(await screen.findByText('test@example.com')).toHaveClass(
      'text-sm',
      'font-medium'
    )

    // Check name styling
    expect(await screen.findByText('Test User')).toHaveClass(
      'text-xs',
      'text-muted-foreground'
    )
  })

  it('displays user icon in avatar placeholder', async () => {
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: mockSignOut,
      initialize: vi.fn(),
      session: { access_token: 'token', user: mockUser },
    })

    renderWithProviders(<UserMenu />)
    await user.click(screen.getByRole('button', { name: /user menu/i }))

    // Check that User icon is present (when no full_name)
    const userIcon = document.querySelector('svg')
    expect(userIcon).toBeInTheDocument()
    expect(userIcon).toHaveClass('h-4', 'w-4')
  })

  it('has correct sign out button styling and icon', async () => {
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      loading: false,
      initialized: true,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setLoading: vi.fn(),
      setInitialized: vi.fn(),
      signOut: mockSignOut,
      initialize: vi.fn(),
      session: { access_token: 'token', user: mockUser },
    })

    renderWithProviders(<UserMenu />)
    await user.click(screen.getByRole('button', { name: /user menu/i }))
    const signOutButton = await screen.findByText(/sign out/i)
    expect(signOutButton).toHaveClass('flex', 'items-center', 'gap-2')

    // Check that LogOut icon is present
    const logOutIcon = signOutButton.querySelector('svg')
    expect(logOutIcon).toBeInTheDocument()
    expect(logOutIcon).toHaveClass('h-4', 'w-4')
  })

  describe('Accessibility', () => {
    it('has proper button role and accessible name', async () => {
      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        loading: false,
        initialized: true,
        setUser: vi.fn(),
        setSession: vi.fn(),
        setLoading: vi.fn(),
        setInitialized: vi.fn(),
        signOut: mockSignOut,
        initialize: vi.fn(),
        session: { access_token: 'token', user: mockUser },
      })

      renderWithProviders(<UserMenu />)
      await user.click(screen.getByRole('button', { name: /user menu/i }))
      const signOutButton = await screen.findByText(/sign out/i)
      expect(signOutButton).toBeInTheDocument()
    })

    it('maintains keyboard accessibility', async () => {
      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        loading: false,
        initialized: true,
        setUser: vi.fn(),
        setSession: vi.fn(),
        setLoading: vi.fn(),
        setInitialized: vi.fn(),
        signOut: mockSignOut,
        initialize: vi.fn(),
        session: { access_token: 'token', user: mockUser },
      })

      renderWithProviders(<UserMenu />)
      await user.click(screen.getByRole('button', { name: /user menu/i }))
      const signOutButton = await screen.findByText(/sign out/i)

      // Test keyboard navigation
      signOutButton.focus()
      expect(signOutButton).toHaveFocus()

      // Test Enter key activation
      await user.keyboard('{Enter}')
      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty user metadata gracefully', async () => {
      const userWithEmptyMetadata = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: null,
      }

      mockUseAuthStore.mockReturnValue({
        user: userWithEmptyMetadata,
        loading: false,
        initialized: true,
        setUser: vi.fn(),
        setSession: vi.fn(),
        setLoading: vi.fn(),
        setInitialized: vi.fn(),
        signOut: mockSignOut,
        initialize: vi.fn(),
        session: { access_token: 'token', user: userWithEmptyMetadata },
      })

      renderWithProviders(<UserMenu />)
      await user.click(screen.getByRole('button', { name: /user menu/i }))
      expect(await screen.findByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('User')).toBeInTheDocument()
    })

    it('handles very long email addresses', async () => {
      const userWithLongEmail = {
        id: 'test-user-id',
        email:
          'very.long.email.address.that.might.overflow@verylongdomainname.example.com',
        user_metadata: { full_name: 'Test User' },
      }

      mockUseAuthStore.mockReturnValue({
        user: userWithLongEmail,
        loading: false,
        initialized: true,
        setUser: vi.fn(),
        setSession: vi.fn(),
        setLoading: vi.fn(),
        setInitialized: vi.fn(),
        signOut: mockSignOut,
        initialize: vi.fn(),
        session: { access_token: 'token', user: userWithLongEmail },
      })

      renderWithProviders(<UserMenu />)
      await user.click(screen.getByRole('button', { name: /user menu/i }))
      expect(
        await screen.findByText(userWithLongEmail.email)
      ).toBeInTheDocument()
    })

    it('handles sign out errors gracefully', async () => {
      mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'))

      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        loading: false,
        initialized: true,
        setUser: vi.fn(),
        setSession: vi.fn(),
        setLoading: vi.fn(),
        setInitialized: vi.fn(),
        signOut: mockSignOut,
        initialize: vi.fn(),
        session: { access_token: 'token', user: mockUser },
      })

      renderWithProviders(<UserMenu />)
      await user.click(screen.getByRole('button', { name: /user menu/i }))
      const signOutButton = await screen.findByText(/sign out/i)
      await user.click(signOutButton)

      // Component should not crash even if signOut fails
      expect(await screen.findByText('test@example.com')).toBeInTheDocument()
    })
  })
})
