import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
      const forwardedHost = request.headers.get('x-forwarded-host')
      const forwardedProto = request.headers.get('x-forwarded-proto')
      const host = forwardedHost || request.headers.get('host') || url.host
      const protocol = forwardedProto || url.protocol.replace(':', '')

      return NextResponse.redirect(`${protocol}://${host}${next}`)
    }
  }

  // return the user to an error page with instructions
  const fallbackHost = request.headers.get('x-forwarded-host') || url.host
  const fallbackProto =
    request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '')
  return NextResponse.redirect(
    `${fallbackProto}://${fallbackHost}/auth/auth-code-error`
  )
}
