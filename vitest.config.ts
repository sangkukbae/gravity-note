import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    css: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        '.next/',
        'tests/',
        'e2e/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'public/',
        'docs/',
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
        '**/mocks/**',
        '**/test-utils/**',
      ],
      include: ['app/**/*', 'components/**/*', 'lib/**/*', 'middleware.ts'],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 80,
          statements: 80,
        },
        // More strict thresholds for auth components
        './components/auth/**/*': {
          branches: 85,
          functions: 85,
          lines: 90,
          statements: 90,
        },
        './lib/stores/auth.ts': {
          branches: 85,
          functions: 85,
          lines: 90,
          statements: 90,
        },
      },
    },
    // Organize tests by type
    include: ['tests/**/*.test.{ts,tsx}', 'tests/**/*.spec.{ts,tsx}'],
    exclude: ['e2e/**/*', 'node_modules/**/*', '.next/**/*'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
