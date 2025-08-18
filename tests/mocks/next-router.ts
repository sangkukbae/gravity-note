import { vi } from 'vitest'

// Enhanced router mock for more comprehensive testing
export const createMockRouter = (overrides = {}) => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/',
  basePath: '',
  isLocaleDomain: true,
  isReady: true,
  isPreview: false,
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
  ...overrides,
})

// Mock useRouter hook with different scenarios
export const mockUseRouter = (
  scenario: 'default' | 'signin' | 'signup' | 'dashboard' = 'default'
) => {
  const baseRouter = createMockRouter()

  switch (scenario) {
    case 'signin':
      return {
        ...baseRouter,
        pathname: '/auth/signin',
        asPath: '/auth/signin',
        route: '/auth/signin',
      }
    case 'signup':
      return {
        ...baseRouter,
        pathname: '/auth/signup',
        asPath: '/auth/signup',
        route: '/auth/signup',
      }
    case 'dashboard':
      return {
        ...baseRouter,
        pathname: '/dashboard',
        asPath: '/dashboard',
        route: '/dashboard',
      }
    default:
      return baseRouter
  }
}

// Mock for next/navigation hooks
export const mockNextNavigation = {
  useRouter: () => mockUseRouter(),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}

// Setup function to mock all Next.js navigation
export const setupNextNavigationMocks = () => {
  vi.mock('next/navigation', () => mockNextNavigation)
  vi.mock('next/router', () => ({
    useRouter: () => mockUseRouter(),
  }))
}
