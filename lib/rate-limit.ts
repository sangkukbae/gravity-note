// Fallback rate limiting implementation for when @upstash packages are not available

// In-memory fallback for development/testing
const memoryStore = new Map<string, { count: number; reset: number }>()

class MemoryRatelimit {
  constructor(
    private config: {
      requests: number
      window: string
    }
  ) {}

  async limit(key: string) {
    const now = Date.now()
    const windowMs = this.parseWindow(this.config.window)
    const resetTime = now + windowMs

    const current = memoryStore.get(key)

    if (!current || now > current.reset) {
      // Reset or create new entry
      memoryStore.set(key, { count: 1, reset: resetTime })
      return {
        success: true,
        limit: this.config.requests,
        remaining: this.config.requests - 1,
        reset: resetTime,
      }
    }

    if (current.count >= this.config.requests) {
      return {
        success: false,
        limit: this.config.requests,
        remaining: 0,
        reset: current.reset,
      }
    }

    current.count++
    memoryStore.set(key, current)

    return {
      success: true,
      limit: this.config.requests,
      remaining: this.config.requests - current.count,
      reset: current.reset,
    }
  }

  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/)
    if (!match) throw new Error(`Invalid window format: ${window}`)

    const m = match as RegExpMatchArray
    const amount = m[1]!
    const unit = m[2]!
    const num = parseInt(amount, 10)

    switch (unit) {
      case 's':
        return num * 1000
      case 'm':
        return num * 60 * 1000
      case 'h':
        return num * 60 * 60 * 1000
      case 'd':
        return num * 24 * 60 * 60 * 1000
      default:
        throw new Error(`Unknown time unit: ${unit}`)
    }
  }
}

// Export rate limiter instance
export const ratelimit = new MemoryRatelimit({
  requests: 10,
  window: '1h',
})

// Utility function to create custom rate limiters
export function createRateLimit(config: { requests: number; window: string }) {
  return new MemoryRatelimit(config)
}

// Rate limiting presets
export const rateLimitPresets = {
  // For API endpoints
  api: {
    strict: createRateLimit({ requests: 10, window: '1m' }),
    moderate: createRateLimit({ requests: 60, window: '1m' }),
    lenient: createRateLimit({ requests: 300, window: '1m' }),
  },

  // For user actions
  user: {
    feedback: createRateLimit({ requests: 5, window: '1h' }),
    auth: createRateLimit({ requests: 10, window: '15m' }),
    search: createRateLimit({ requests: 100, window: '1m' }),
  },

  // For specific features
  features: {
    noteCreation: createRateLimit({ requests: 60, window: '1m' }),
    fileUpload: createRateLimit({ requests: 10, window: '5m' }),
    export: createRateLimit({ requests: 5, window: '1h' }),
  },
}

// Helper to get client IP from request
export function getClientIP(request: Request): string {
  // Try various headers for client IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'x-cluster-client-ip',
  ]

  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const first = value.split(',')[0]
      return (first ?? value).trim()
    }
  }

  return '127.0.0.1' // Fallback
}

// Middleware helper for rate limiting
export async function withRateLimit<T>(
  identifier: string,
  rateLimiter: MemoryRatelimit,
  fn: () => Promise<T>
): Promise<T> {
  const result = await rateLimiter.limit(identifier)

  if (!result.success) {
    const error = new Error('Rate limit exceeded')
    ;(error as any).status = 429
    ;(error as any).details = {
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
    throw error
  }

  return fn()
}

// Rate limit response helper
export function createRateLimitResponse(result: {
  success: boolean
  limit: number
  remaining: number
  reset: number
}) {
  const headers = new Headers({
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  })

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      }),
      {
        status: 429,
        headers: {
          ...Object.fromEntries(headers.entries()),
          'Content-Type': 'application/json',
        },
      }
    )
  }

  return { headers }
}
