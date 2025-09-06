import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Enhanced URL resolution function with multiple fallbacks
function resolveCallbackUrl(
  request: NextRequest,
  url: URL
): { host: string; protocol: string } {
  // Step 1: Get forwarded headers (Vercel/proxy)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')

  // Step 2: Try forwarded headers first (most reliable in production)
  let host = forwardedHost || request.headers.get('host') || url.host
  let protocol = forwardedProto || url.protocol.replace(':', '')

  // Step 3: Production domain detection and HTTPS enforcement
  if (
    host.includes('vercel.app') ||
    host.includes('gravity-note.') ||
    host.includes('gravity-note-')
  ) {
    protocol = 'https'
  }

  // Step 4: Environment variable fallbacks
  if (!host || host === 'localhost:3000' || host.startsWith('localhost')) {
    // First try NEXT_PUBLIC_BASE_URL
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL

    // Fallback to VERCEL_URL (automatically set by Vercel)
    if (!baseUrl && process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    }

    if (baseUrl) {
      try {
        const parsedUrl = new URL(
          baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
        )
        host = parsedUrl.host
        protocol = parsedUrl.protocol.replace(':', '')
      } catch (error) {
        console.warn('Invalid base URL configuration:', baseUrl)
      }
    }
  }

  return { host, protocol }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const { searchParams } = url
  const code = searchParams.get('code')
  // Prevent open redirect: only allow same-origin paths
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next = rawNext.startsWith('/') ? rawNext : '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { host, protocol } = resolveCallbackUrl(request, url)
      return NextResponse.redirect(`${protocol}://${host}${next}`)
    }
  }

  // return the user to an error page with instructions
  const { host: fallbackHost, protocol: fallbackProto } = resolveCallbackUrl(
    request,
    url
  )
  return NextResponse.redirect(
    `${fallbackProto}://${fallbackHost}/auth/auth-code-error`
  )
}
