declare global {
  interface Window {
    Sentry?: typeof import('@sentry/nextjs')
  }
}

export {}
