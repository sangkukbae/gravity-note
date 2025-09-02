type Counter = { count: number; resetAt: number }

const buckets = new Map<string, Counter>()

export interface RateLimitOptions {
  limit: number
  windowMs: number
}

export function rateLimit(
  key: string,
  opts: RateLimitOptions
): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const windowStart = now
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    const counter: Counter = { count: 1, resetAt: now + opts.windowMs }
    buckets.set(key, counter)
    return {
      allowed: true,
      remaining: opts.limit - 1,
      resetAt: counter.resetAt,
    }
  }

  if (existing.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: Math.max(0, opts.limit - existing.count),
    resetAt: existing.resetAt,
  }
}
