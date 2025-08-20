import '@testing-library/jest-dom'
import { beforeAll, beforeEach, afterEach, vi, type Mock } from 'vitest'

// Global test setup
beforeAll(() => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  })

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000',
      hostname: 'localhost',
      port: '3000',
      protocol: 'http:',
      pathname: '/',
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    },
    writable: true,
  })

  // Mock crypto for secure random generation
  Object.defineProperty(window, 'crypto', {
    value: {
      randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substr(2, 9),
      getRandomValues: (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256)
        }
        return arr
      },
    },
    writable: true,
  })

  // Mock performance API
  Object.defineProperty(window, 'performance', {
    value: {
      now: () => Date.now(),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByName: vi.fn(() => []),
      getEntriesByType: vi.fn(() => []),
    },
    writable: true,
  })
})

// Setup for each test
beforeEach(() => {
  // Clear localStorage before each test
  localStorage.clear()

  // Clear sessionStorage before each test
  sessionStorage.clear()

  // Reset fetch mock if it exists
  if (global.fetch && vi.isMockFunction(global.fetch)) {
    ;(global.fetch as unknown as Mock).mockClear()
  }

  // Mock console methods to reduce noise in tests
  console.error = vi.fn()
  console.warn = vi.fn()
  console.log = vi.fn()
})

// Cleanup after each test
afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks()

  // Reset DOM
  document.body.innerHTML = ''
  document.head.innerHTML = ''

  // Clear timers
  vi.clearAllTimers()
})

// Enhanced localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
})

// Mock environment variables
process.env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  NODE_ENV: 'test',
}
