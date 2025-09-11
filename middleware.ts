import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Explicitly skip middleware for Next.js internal files
  const pathname = request.nextUrl.pathname

  // Skip all _next/ internal files (including app-build-manifest.json)
  if (pathname.startsWith('/_next/')) {
    return
  }

  // Skip static assets and service worker files
  if (
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/workbox-') ||
    pathname.startsWith('/worker-') ||
    pathname.match(
      /\.(svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2|eot|ttf|otf)$/
    )
  ) {
    return
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/ (all Next.js internal files including build manifests)
     * - favicon.ico (favicon file)
     * - public folder (static assets)
     * - sw.js and workbox files (service worker)
     */
    '/((?!_next/|favicon.ico|sw.js|workbox-.*|worker-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
