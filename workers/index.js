/* eslint-disable no-undef */
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import {
  NetworkFirst,
  StaleWhileRevalidate,
  CacheFirst,
} from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

self.skipWaiting()
clientsClaim()

// Precache
precacheAndRoute(self.__WB_MANIFEST || [])
cleanupOutdatedCaches()

// Runtime caching rules (mirrors next.config.js runtimeCaching)

// Google Fonts stylesheets
registerRoute(
  ({ url }) => /^https:\/\/fonts\.googleapis\.com\/.*/i.test(url.href),
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 4,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
    ],
  })
)

// Google Fonts static files
registerRoute(
  ({ url }) => /^https:\/\/fonts\.gstatic\.com\/.*/i.test(url.href),
  new CacheFirst({
    cacheName: 'google-fonts-static',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 4,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
    ],
  })
)

// Fonts
registerRoute(
  ({ url }) =>
    /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'static-font-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
)

// Images
registerRoute(
  ({ url }) => /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'static-image-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
)

// Next Image
registerRoute(
  ({ url }) => /\/_next\/image\?url=.+$/i.test(url.pathname + url.search),
  new StaleWhileRevalidate({
    cacheName: 'next-image',
    plugins: [
      new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
)

// Audio
registerRoute(
  ({ url }) => /\.(?:mp3|wav|ogg)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'static-audio-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
)

// Video
registerRoute(
  ({ url }) => /\.(?:mp4)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'static-video-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
)

// JS
registerRoute(
  ({ url }) => /\.(?:js)$/i.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'static-js-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
)

// CSS
registerRoute(
  ({ url }) => /\.(?:css|less)$/i.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'static-style-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
)

// Next data
registerRoute(
  ({ url }) => /\/_next\/data\/.+\/.+\.json$/i.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'next-data',
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
)

// Static data
registerRoute(
  ({ url }) => /\.(?:json|xml|csv)$/i.test(url.pathname),
  new NetworkFirst({
    cacheName: 'static-data-assets',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
)

// Same-origin API (exclude auth/webhooks)
registerRoute(
  ({ url }) => {
    const isSameOrigin = self.origin === url.origin
    if (!isSameOrigin) return false
    const pathname = url.pathname
    if (
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/webhooks')
    )
      return false
    return pathname.startsWith('/api/')
  },
  new NetworkFirst({
    cacheName: 'apis',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
)

// Other same-origin
registerRoute(
  ({ url }) => self.origin === url.origin,
  new NetworkFirst({
    cacheName: 'others',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
)

// Cross-origin
registerRoute(
  ({ url }) => self.origin !== url.origin,
  new NetworkFirst({
    cacheName: 'cross-origin',
    networkTimeoutSeconds: 10,
    plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 })],
  })
)

// Background Sync bridge → notify clients to flush outbox
self.addEventListener('sync', function (event) {
  try {
    if (event && event.tag === 'gravity-sync') {
      event.waitUntil(
        (async function () {
          try {
            const clientList = await self.clients.matchAll({
              type: 'window',
              includeUncontrolled: true,
            })
            clientList.forEach(c => {
              try {
                c.postMessage({ type: 'sync-outbox' })
              } catch (e) {}
            })
          } catch (e) {}
        })()
      )
    }
  } catch (e) {}
})
