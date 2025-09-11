;(() => {
  'use strict'
  var e = [
      ,
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            _private: () => a._private,
            cacheNames: () => a.cacheNames,
            clientsClaim: () => a.clientsClaim,
            copyResponse: () => a.copyResponse,
            registerQuotaErrorCallback: () => a.registerQuotaErrorCallback,
            setCacheNameDetails: () => a.setCacheNameDetails,
            skipWaiting: () => a.skipWaiting,
          }))
        var a = r(2)
      },
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            _private: () => n,
            cacheNames: () => s.cacheNames,
            clientsClaim: () => i.clientsClaim,
            copyResponse: () => o.copyResponse,
            registerQuotaErrorCallback: () => a.registerQuotaErrorCallback,
            setCacheNameDetails: () => c.setCacheNameDetails,
            skipWaiting: () => l.skipWaiting,
          }))
        var a = r(3),
          n = r(11),
          s = r(23),
          o = r(24),
          i = r(25),
          c = r(26),
          l = r(27)
        ;(r(5), r(28))
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { registerQuotaErrorCallback: () => n }))
        ;(r(4), r(6))
        var a = r(10)
        r(5)
        function n(e) {
          a.quotaErrorCallbacks.add(e)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { logger: () => a }))
        r(5)
        const a = null
      },
      () => {
        try {
          self['workbox:core:7.2.0'] && _()
        } catch (e) {}
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { assert: () => a }))
        ;(r(7), r(5))
        const a = null
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { WorkboxError: () => n }))
        var a = r(8)
        r(5)
        class n extends Error {
          constructor(e, t) {
            ;(super((0, a.messageGenerator)(e, t)),
              (this.name = e),
              (this.details = t))
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { messageGenerator: () => a }))
        ;(r(9), r(5))
        const a = (e, ...t) => {
          let r = e
          return (t.length > 0 && (r += ` :: ${JSON.stringify(t)}`), r)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { messages: () => a }))
        r(5)
        const a = {
          'invalid-value': ({
            paramName: e,
            validValueDescription: t,
            value: r,
          }) => {
            if (!e || !t)
              throw new Error("Unexpected input to 'invalid-value' error.")
            return `The '${e}' parameter was given a value with an unexpected value. ${t} Received a value of ${JSON.stringify(r)}.`
          },
          'not-an-array': ({
            moduleName: e,
            className: t,
            funcName: r,
            paramName: a,
          }) => {
            if (!(e && t && r && a))
              throw new Error("Unexpected input to 'not-an-array' error.")
            return `The parameter '${a}' passed into '${e}.${t}.${r}()' must be an array.`
          },
          'incorrect-type': ({
            expectedType: e,
            paramName: t,
            moduleName: r,
            className: a,
            funcName: n,
          }) => {
            if (!(e && t && r && n))
              throw new Error("Unexpected input to 'incorrect-type' error.")
            return `The parameter '${t}' passed into '${r}.${a ? `${a}.` : ''}${n}()' must be of type ${e}.`
          },
          'incorrect-class': ({
            expectedClassName: e,
            paramName: t,
            moduleName: r,
            className: a,
            funcName: n,
            isReturnValueProblem: s,
          }) => {
            if (!e || !r || !n)
              throw new Error("Unexpected input to 'incorrect-class' error.")
            const o = a ? `${a}.` : ''
            return s
              ? `The return value from '${r}.${o}${n}()' must be an instance of class ${e}.`
              : `The parameter '${t}' passed into '${r}.${o}${n}()' must be an instance of class ${e}.`
          },
          'missing-a-method': ({
            expectedMethod: e,
            paramName: t,
            moduleName: r,
            className: a,
            funcName: n,
          }) => {
            if (!(e && t && r && a && n))
              throw new Error("Unexpected input to 'missing-a-method' error.")
            return `${r}.${a}.${n}() expected the '${t}' parameter to expose a '${e}' method.`
          },
          'add-to-cache-list-unexpected-type': ({ entry: e }) =>
            `An unexpected entry was passed to 'workbox-precaching.PrecacheController.addToCacheList()' The entry '${JSON.stringify(e)}' isn't supported. You must supply an array of strings with one or more characters, objects with a url property or Request objects.`,
          'add-to-cache-list-conflicting-entries': ({
            firstEntry: e,
            secondEntry: t,
          }) => {
            if (!e || !t)
              throw new Error(
                "Unexpected input to 'add-to-cache-list-duplicate-entries' error."
              )
            return `Two of the entries passed to 'workbox-precaching.PrecacheController.addToCacheList()' had the URL ${e} but different revision details. Workbox is unable to cache and version the asset correctly. Please remove one of the entries.`
          },
          'plugin-error-request-will-fetch': ({ thrownErrorMessage: e }) => {
            if (!e)
              throw new Error(
                "Unexpected input to 'plugin-error-request-will-fetch', error."
              )
            return `An error was thrown by a plugins 'requestWillFetch()' method. The thrown error message was: '${e}'.`
          },
          'invalid-cache-name': ({ cacheNameId: e, value: t }) => {
            if (!e)
              throw new Error(
                "Expected a 'cacheNameId' for error 'invalid-cache-name'"
              )
            return `You must provide a name containing at least one character for setCacheDetails({${e}: '...'}). Received a value of '${JSON.stringify(t)}'`
          },
          'unregister-route-but-not-found-with-method': ({ method: e }) => {
            if (!e)
              throw new Error(
                "Unexpected input to 'unregister-route-but-not-found-with-method' error."
              )
            return `The route you're trying to unregister was not  previously registered for the method type '${e}'.`
          },
          'unregister-route-route-not-registered': () =>
            "The route you're trying to unregister was not previously registered.",
          'queue-replay-failed': ({ name: e }) =>
            `Replaying the background sync queue '${e}' failed.`,
          'duplicate-queue-name': ({ name: e }) =>
            `The Queue name '${e}' is already being used. All instances of backgroundSync.Queue must be given unique names.`,
          'expired-test-without-max-age': ({ methodName: e, paramName: t }) =>
            `The '${e}()' method can only be used when the '${t}' is used in the constructor.`,
          'unsupported-route-type': ({
            moduleName: e,
            className: t,
            funcName: r,
            paramName: a,
          }) =>
            `The supplied '${a}' parameter was an unsupported type. Please check the docs for ${e}.${t}.${r} for valid input types.`,
          'not-array-of-class': ({
            value: e,
            expectedClass: t,
            moduleName: r,
            className: a,
            funcName: n,
            paramName: s,
          }) =>
            `The supplied '${s}' parameter must be an array of '${t}' objects. Received '${JSON.stringify(e)},'. Please check the call to ${r}.${a}.${n}() to fix the issue.`,
          'max-entries-or-age-required': ({
            moduleName: e,
            className: t,
            funcName: r,
          }) =>
            `You must define either config.maxEntries or config.maxAgeSecondsin ${e}.${t}.${r}`,
          'statuses-or-headers-required': ({
            moduleName: e,
            className: t,
            funcName: r,
          }) =>
            `You must define either config.statuses or config.headersin ${e}.${t}.${r}`,
          'invalid-string': ({ moduleName: e, funcName: t, paramName: r }) => {
            if (!r || !e || !t)
              throw new Error("Unexpected input to 'invalid-string' error.")
            return `When using strings, the '${r}' parameter must start with 'http' (for cross-origin matches) or '/' (for same-origin matches). Please see the docs for ${e}.${t}() for more info.`
          },
          'channel-name-required': () =>
            'You must provide a channelName to construct a BroadcastCacheUpdate instance.',
          'invalid-responses-are-same-args': () =>
            'The arguments passed into responsesAreSame() appear to be invalid. Please ensure valid Responses are used.',
          'expire-custom-caches-only': () =>
            "You must provide a 'cacheName' property when using the expiration plugin with a runtime caching strategy.",
          'unit-must-be-bytes': ({ normalizedRangeHeader: e }) => {
            if (!e)
              throw new Error("Unexpected input to 'unit-must-be-bytes' error.")
            return `The 'unit' portion of the Range header must be set to 'bytes'. The Range header provided was "${e}"`
          },
          'single-range-only': ({ normalizedRangeHeader: e }) => {
            if (!e)
              throw new Error("Unexpected input to 'single-range-only' error.")
            return `Multiple ranges are not supported. Please use a  single start value, and optional end value. The Range header provided was "${e}"`
          },
          'invalid-range-values': ({ normalizedRangeHeader: e }) => {
            if (!e)
              throw new Error(
                "Unexpected input to 'invalid-range-values' error."
              )
            return `The Range header is missing both start and end values. At least one of those values is needed. The Range header provided was "${e}"`
          },
          'no-range-header': () =>
            'No Range header was found in the Request provided.',
          'range-not-satisfiable': ({ size: e, start: t, end: r }) =>
            `The start (${t}) and end (${r}) values in the Range are not satisfiable by the cached response, which is ${e} bytes.`,
          'attempt-to-cache-non-get-request': ({ url: e, method: t }) =>
            `Unable to cache '${e}' because it is a '${t}' request and only 'GET' requests can be cached.`,
          'cache-put-with-no-response': ({ url: e }) =>
            `There was an attempt to cache '${e}' but the response was not defined.`,
          'no-response': ({ url: e, error: t }) => {
            let r = `The strategy could not generate a response for '${e}'.`
            return (t && (r += ` The underlying error is ${t}.`), r)
          },
          'bad-precaching-response': ({ url: e, status: t }) =>
            `The precaching request for '${e}' failed` +
            (t ? ` with an HTTP status of ${t}.` : '.'),
          'non-precached-url': ({ url: e }) =>
            `createHandlerBoundToURL('${e}') was called, but that URL is not precached. Please pass in a URL that is precached instead.`,
          'add-to-cache-list-conflicting-integrities': ({ url: e }) =>
            `Two of the entries passed to 'workbox-precaching.PrecacheController.addToCacheList()' had the URL ${e} with different integrity values. Please remove one of them.`,
          'missing-precache-entry': ({ cacheName: e, url: t }) =>
            `Unable to find a precached response in ${e} for ${t}.`,
          'cross-origin-copy-response': ({ origin: e }) =>
            `workbox-core.copyResponse() can only be used with same-origin responses. It was passed a response with origin ${e}.`,
          'opaque-streams-source': ({ type: e }) => {
            const t = `One of the workbox-streams sources resulted in an '${e}' response.`
            return 'opaqueredirect' === e
              ? `${t} Please do not use a navigation request that results in a redirect as a source.`
              : `${t} Please ensure your sources are CORS-enabled.`
          },
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { quotaErrorCallbacks: () => a }))
        r(5)
        const a = new Set()
      },
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            Deferred: () => l.Deferred,
            WorkboxError: () => m.WorkboxError,
            assert: () => a.assert,
            cacheMatchIgnoreParams: () => s.cacheMatchIgnoreParams,
            cacheNames: () => n.cacheNames,
            canConstructReadableStream: () => o.canConstructReadableStream,
            canConstructResponseFromBodyStream: () =>
              i.canConstructResponseFromBodyStream,
            dontWaitFor: () => c.dontWaitFor,
            executeQuotaErrorCallbacks: () => u.executeQuotaErrorCallbacks,
            getFriendlyURL: () => h.getFriendlyURL,
            logger: () => d.logger,
            resultingClientExists: () => p.resultingClientExists,
            timeout: () => g.timeout,
            waitUntil: () => f.waitUntil,
          }))
        var a = r(6),
          n = r(12),
          s = r(13),
          o = r(14),
          i = r(15),
          c = r(16),
          l = r(17),
          u = r(18),
          h = r(19),
          d = r(4),
          p = r(20),
          g = r(21),
          f = r(22),
          m = r(7)
        r(5)
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { cacheNames: () => s }))
        r(5)
        const a = {
            googleAnalytics: 'googleAnalytics',
            precache: 'precache-v2',
            prefix: 'workbox',
            runtime: 'runtime',
            suffix:
              'undefined' != typeof registration ? registration.scope : '',
          },
          n = e =>
            [a.prefix, e, a.suffix].filter(e => e && e.length > 0).join('-'),
          s = {
            updateDetails: e => {
              ;(e => {
                for (const t of Object.keys(a)) e(t)
              })(t => {
                'string' == typeof e[t] && (a[t] = e[t])
              })
            },
            getGoogleAnalyticsName: e => e || n(a.googleAnalytics),
            getPrecacheName: e => e || n(a.precache),
            getPrefix: () => a.prefix,
            getRuntimeName: e => e || n(a.runtime),
            getSuffix: () => a.suffix,
          }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { cacheMatchIgnoreParams: () => n }))
        r(5)
        function a(e, t) {
          const r = new URL(e)
          for (const e of t) r.searchParams.delete(e)
          return r.href
        }
        async function n(e, t, r, n) {
          const s = a(t.url, r)
          if (t.url === s) return e.match(t, n)
          const o = Object.assign(Object.assign({}, n), { ignoreSearch: !0 }),
            i = await e.keys(t, o)
          for (const t of i) {
            if (s === a(t.url, r)) return e.match(t, n)
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { canConstructReadableStream: () => n }))
        r(5)
        let a
        function n() {
          if (void 0 === a)
            try {
              ;(new ReadableStream({ start() {} }), (a = !0))
            } catch (e) {
              a = !1
            }
          return a
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { canConstructResponseFromBodyStream: () => n }))
        r(5)
        let a
        function n() {
          if (void 0 === a) {
            const e = new Response('')
            if ('body' in e)
              try {
                ;(new Response(e.body), (a = !0))
              } catch (e) {
                a = !1
              }
            a = !1
          }
          return a
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { dontWaitFor: () => a }))
        r(5)
        function a(e) {
          e.then(() => {})
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { Deferred: () => a }))
        r(5)
        class a {
          constructor() {
            this.promise = new Promise((e, t) => {
              ;((this.resolve = e), (this.reject = t))
            })
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { executeQuotaErrorCallbacks: () => n }))
        r(4)
        var a = r(10)
        r(5)
        async function n() {
          for (const e of a.quotaErrorCallbacks) await e()
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { getFriendlyURL: () => a }))
        r(5)
        const a = e =>
          new URL(String(e), location.href).href.replace(
            new RegExp(`^${location.origin}`),
            ''
          )
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { resultingClientExists: () => s }))
        var a = r(21)
        r(5)
        const n = 2e3
        async function s(e) {
          if (!e) return
          let t = await self.clients.matchAll({ type: 'window' })
          const r = new Set(t.map(e => e.id))
          let s
          const o = performance.now()
          for (
            ;
            performance.now() - o < n &&
            ((t = await self.clients.matchAll({ type: 'window' })),
            (s = t.find(t => (e ? t.id === e : !r.has(t.id)))),
            !s);

          )
            await (0, a.timeout)(100)
          return s
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { timeout: () => a }))
        r(5)
        function a(e) {
          return new Promise(t => setTimeout(t, e))
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { waitUntil: () => a }))
        r(5)
        function a(e, t) {
          const r = t()
          return (e.waitUntil(r), r)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { cacheNames: () => n }))
        var a = r(12)
        r(5)
        const n = {
          get googleAnalytics() {
            return a.cacheNames.getGoogleAnalyticsName()
          },
          get precache() {
            return a.cacheNames.getPrecacheName()
          },
          get prefix() {
            return a.cacheNames.getPrefix()
          },
          get runtime() {
            return a.cacheNames.getRuntimeName()
          },
          get suffix() {
            return a.cacheNames.getSuffix()
          },
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { copyResponse: () => s }))
        var a = r(15),
          n = r(7)
        r(5)
        async function s(e, t) {
          let r = null
          if (e.url) {
            r = new URL(e.url).origin
          }
          if (r !== self.location.origin)
            throw new n.WorkboxError('cross-origin-copy-response', {
              origin: r,
            })
          const s = e.clone(),
            o = {
              headers: new Headers(s.headers),
              status: s.status,
              statusText: s.statusText,
            },
            i = t ? t(o) : o,
            c = (0, a.canConstructResponseFromBodyStream)()
              ? s.body
              : await s.blob()
          return new Response(c, i)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { clientsClaim: () => a }))
        r(5)
        function a() {
          self.addEventListener('activate', () => self.clients.claim())
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { setCacheNameDetails: () => n }))
        r(6)
        var a = r(12)
        ;(r(7), r(5))
        function n(e) {
          a.cacheNames.updateDetails(e)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { skipWaiting: () => a }))
        ;(r(4), r(5))
        function a() {
          self.skipWaiting()
        }
      },
      (e, t, r) => {
        r.r(t)
        r(5)
      },
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            PrecacheController: () => a.PrecacheController,
            PrecacheFallbackPlugin: () => a.PrecacheFallbackPlugin,
            PrecacheRoute: () => a.PrecacheRoute,
            PrecacheStrategy: () => a.PrecacheStrategy,
            addPlugins: () => a.addPlugins,
            addRoute: () => a.addRoute,
            cleanupOutdatedCaches: () => a.cleanupOutdatedCaches,
            createHandlerBoundToURL: () => a.createHandlerBoundToURL,
            getCacheKeyForURL: () => a.getCacheKeyForURL,
            matchPrecache: () => a.matchPrecache,
            precache: () => a.precache,
            precacheAndRoute: () => a.precacheAndRoute,
          }))
        var a = r(30)
      },
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            PrecacheController: () => h.PrecacheController,
            PrecacheFallbackPlugin: () => g.PrecacheFallbackPlugin,
            PrecacheRoute: () => d.PrecacheRoute,
            PrecacheStrategy: () => p.PrecacheStrategy,
            addPlugins: () => a.addPlugins,
            addRoute: () => n.addRoute,
            cleanupOutdatedCaches: () => s.cleanupOutdatedCaches,
            createHandlerBoundToURL: () => o.createHandlerBoundToURL,
            getCacheKeyForURL: () => i.getCacheKeyForURL,
            matchPrecache: () => c.matchPrecache,
            precache: () => l.precache,
            precacheAndRoute: () => u.precacheAndRoute,
          }))
        var a = r(31),
          n = r(44),
          s = r(56),
          o = r(58),
          i = r(59),
          c = r(60),
          l = r(61),
          u = r(62),
          h = r(33),
          d = r(53),
          p = r(40),
          g = r(63)
        ;(r(35), r(64))
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { addPlugins: () => n }))
        var a = r(32)
        r(35)
        function n(e) {
          ;(0, a.getOrCreatePrecacheController)().strategy.plugins.push(...e)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { getOrCreatePrecacheController: () => s }))
        var a = r(33)
        r(35)
        let n
        const s = () => (n || (n = new a.PrecacheController()), n)
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { PrecacheController: () => u }))
        r(6)
        var a = r(12),
          n = (r(4), r(7)),
          s = r(22),
          o = r(34),
          i = r(36),
          c = r(37),
          l = (r(38), r(39), r(40))
        r(35)
        class u {
          constructor({
            cacheName: e,
            plugins: t = [],
            fallbackToNetwork: r = !0,
          } = {}) {
            ;((this._urlsToCacheKeys = new Map()),
              (this._urlsToCacheModes = new Map()),
              (this._cacheKeysToIntegrities = new Map()),
              (this._strategy = new l.PrecacheStrategy({
                cacheName: a.cacheNames.getPrecacheName(e),
                plugins: [
                  ...t,
                  new c.PrecacheCacheKeyPlugin({ precacheController: this }),
                ],
                fallbackToNetwork: r,
              })),
              (this.install = this.install.bind(this)),
              (this.activate = this.activate.bind(this)))
          }
          get strategy() {
            return this._strategy
          }
          precache(e) {
            ;(this.addToCacheList(e),
              this._installAndActiveListenersAdded ||
                (self.addEventListener('install', this.install),
                self.addEventListener('activate', this.activate),
                (this._installAndActiveListenersAdded = !0)))
          }
          addToCacheList(e) {
            const t = []
            for (const r of e) {
              'string' == typeof r
                ? t.push(r)
                : r && void 0 === r.revision && t.push(r.url)
              const { cacheKey: e, url: a } = (0, o.createCacheKey)(r),
                s = 'string' != typeof r && r.revision ? 'reload' : 'default'
              if (
                this._urlsToCacheKeys.has(a) &&
                this._urlsToCacheKeys.get(a) !== e
              )
                throw new n.WorkboxError(
                  'add-to-cache-list-conflicting-entries',
                  { firstEntry: this._urlsToCacheKeys.get(a), secondEntry: e }
                )
              if ('string' != typeof r && r.integrity) {
                if (
                  this._cacheKeysToIntegrities.has(e) &&
                  this._cacheKeysToIntegrities.get(e) !== r.integrity
                )
                  throw new n.WorkboxError(
                    'add-to-cache-list-conflicting-integrities',
                    { url: a }
                  )
                this._cacheKeysToIntegrities.set(e, r.integrity)
              }
              if (
                (this._urlsToCacheKeys.set(a, e),
                this._urlsToCacheModes.set(a, s),
                t.length > 0)
              ) {
                const e = `Workbox is precaching URLs without revision info: ${t.join(', ')}\nThis is generally NOT safe. Learn more at https://bit.ly/wb-precache`
                console.warn(e)
              }
            }
          }
          install(e) {
            return (0, s.waitUntil)(e, async () => {
              const t = new i.PrecacheInstallReportPlugin()
              this.strategy.plugins.push(t)
              for (const [t, r] of this._urlsToCacheKeys) {
                const a = this._cacheKeysToIntegrities.get(r),
                  n = this._urlsToCacheModes.get(t),
                  s = new Request(t, {
                    integrity: a,
                    cache: n,
                    credentials: 'same-origin',
                  })
                await Promise.all(
                  this.strategy.handleAll({
                    params: { cacheKey: r },
                    request: s,
                    event: e,
                  })
                )
              }
              const { updatedURLs: r, notUpdatedURLs: a } = t
              return { updatedURLs: r, notUpdatedURLs: a }
            })
          }
          activate(e) {
            return (0, s.waitUntil)(e, async () => {
              const e = await self.caches.open(this.strategy.cacheName),
                t = await e.keys(),
                r = new Set(this._urlsToCacheKeys.values()),
                a = []
              for (const n of t)
                r.has(n.url) || (await e.delete(n), a.push(n.url))
              return { deletedURLs: a }
            })
          }
          getURLsToCacheKeys() {
            return this._urlsToCacheKeys
          }
          getCachedURLs() {
            return [...this._urlsToCacheKeys.keys()]
          }
          getCacheKeyForURL(e) {
            const t = new URL(e, location.href)
            return this._urlsToCacheKeys.get(t.href)
          }
          getIntegrityForCacheKey(e) {
            return this._cacheKeysToIntegrities.get(e)
          }
          async matchPrecache(e) {
            const t = e instanceof Request ? e.url : e,
              r = this.getCacheKeyForURL(t)
            if (r) {
              return (await self.caches.open(this.strategy.cacheName)).match(r)
            }
          }
          createHandlerBoundToURL(e) {
            const t = this.getCacheKeyForURL(e)
            if (!t) throw new n.WorkboxError('non-precached-url', { url: e })
            return r => (
              (r.request = new Request(e)),
              (r.params = Object.assign({ cacheKey: t }, r.params)),
              this.strategy.handle(r)
            )
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { createCacheKey: () => s }))
        var a = r(7)
        r(35)
        const n = '__WB_REVISION__'
        function s(e) {
          if (!e)
            throw new a.WorkboxError('add-to-cache-list-unexpected-type', {
              entry: e,
            })
          if ('string' == typeof e) {
            const t = new URL(e, location.href)
            return { cacheKey: t.href, url: t.href }
          }
          const { revision: t, url: r } = e
          if (!r)
            throw new a.WorkboxError('add-to-cache-list-unexpected-type', {
              entry: e,
            })
          if (!t) {
            const e = new URL(r, location.href)
            return { cacheKey: e.href, url: e.href }
          }
          const s = new URL(r, location.href),
            o = new URL(r, location.href)
          return (s.searchParams.set(n, t), { cacheKey: s.href, url: o.href })
        }
      },
      () => {
        try {
          self['workbox:precaching:7.2.0'] && _()
        } catch (e) {}
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { PrecacheInstallReportPlugin: () => a }))
        r(35)
        class a {
          constructor() {
            ;((this.updatedURLs = []),
              (this.notUpdatedURLs = []),
              (this.handlerWillStart = async ({ request: e, state: t }) => {
                t && (t.originalRequest = e)
              }),
              (this.cachedResponseWillBeUsed = async ({
                event: e,
                state: t,
                cachedResponse: r,
              }) => {
                if (
                  'install' === e.type &&
                  t &&
                  t.originalRequest &&
                  t.originalRequest instanceof Request
                ) {
                  const e = t.originalRequest.url
                  r ? this.notUpdatedURLs.push(e) : this.updatedURLs.push(e)
                }
                return r
              }))
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { PrecacheCacheKeyPlugin: () => a }))
        r(35)
        class a {
          constructor({ precacheController: e }) {
            ;((this.cacheKeyWillBeUsed = async ({ request: e, params: t }) => {
              const r =
                (null == t ? void 0 : t.cacheKey) ||
                this._precacheController.getCacheKeyForURL(e.url)
              return r ? new Request(r, { headers: e.headers }) : e
            }),
              (this._precacheController = e))
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { printCleanupDetails: () => s }))
        var a = r(4)
        r(35)
        const n = (e, t) => {
          a.logger.groupCollapsed(e)
          for (const e of t) a.logger.log(e)
          a.logger.groupEnd()
        }
        function s(e) {
          const t = e.length
          t > 0 &&
            (a.logger.groupCollapsed(
              `During precaching cleanup, ${t} cached request${1 === t ? ' was' : 's were'} deleted.`
            ),
            n('Deleted Cache Requests', e),
            a.logger.groupEnd())
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { printInstallDetails: () => s }))
        var a = r(4)
        r(35)
        function n(e, t) {
          if (0 !== t.length) {
            a.logger.groupCollapsed(e)
            for (const e of t) a.logger.log(e)
            a.logger.groupEnd()
          }
        }
        function s(e, t) {
          const r = e.length,
            s = t.length
          if (r || s) {
            let o = `Precaching ${r} file${1 === r ? '' : 's'}.`
            ;(s > 0 &&
              (o += ` ${s} file${1 === s ? ' is' : 's are'} already cached.`),
              a.logger.groupCollapsed(o),
              n('View newly precached URLs.', e),
              n('View previously precached URLs.', t),
              a.logger.groupEnd())
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { PrecacheStrategy: () => i }))
        var a = r(24),
          n = r(12),
          s = (r(19), r(4), r(7)),
          o = r(41)
        r(35)
        class i extends o.Strategy {
          constructor(e = {}) {
            ;((e.cacheName = n.cacheNames.getPrecacheName(e.cacheName)),
              super(e),
              (this._fallbackToNetwork = !1 !== e.fallbackToNetwork),
              this.plugins.push(i.copyRedirectedCacheableResponsesPlugin))
          }
          async _handle(e, t) {
            const r = await t.cacheMatch(e)
            return (
              r ||
              (t.event && 'install' === t.event.type
                ? await this._handleInstall(e, t)
                : await this._handleFetch(e, t))
            )
          }
          async _handleFetch(e, t) {
            let r
            const a = t.params || {}
            if (!this._fallbackToNetwork)
              throw new s.WorkboxError('missing-precache-entry', {
                cacheName: this.cacheName,
                url: e.url,
              })
            {
              0
              const n = a.integrity,
                s = e.integrity,
                o = !s || s === n
              if (
                ((r = await t.fetch(
                  new Request(e, {
                    integrity: 'no-cors' !== e.mode ? s || n : void 0,
                  })
                )),
                n && o && 'no-cors' !== e.mode)
              ) {
                this._useDefaultCacheabilityPluginIfNeeded()
                await t.cachePut(e, r.clone())
                0
              }
            }
            return r
          }
          async _handleInstall(e, t) {
            this._useDefaultCacheabilityPluginIfNeeded()
            const r = await t.fetch(e)
            if (!(await t.cachePut(e, r.clone())))
              throw new s.WorkboxError('bad-precaching-response', {
                url: e.url,
                status: r.status,
              })
            return r
          }
          _useDefaultCacheabilityPluginIfNeeded() {
            let e = null,
              t = 0
            for (const [r, a] of this.plugins.entries())
              a !== i.copyRedirectedCacheableResponsesPlugin &&
                (a === i.defaultPrecacheCacheabilityPlugin && (e = r),
                a.cacheWillUpdate && t++)
            0 === t
              ? this.plugins.push(i.defaultPrecacheCacheabilityPlugin)
              : t > 1 && null !== e && this.plugins.splice(e, 1)
          }
        }
        ;((i.defaultPrecacheCacheabilityPlugin = {
          cacheWillUpdate: async ({ response: e }) =>
            !e || e.status >= 400 ? null : e,
        }),
          (i.copyRedirectedCacheableResponsesPlugin = {
            cacheWillUpdate: async ({ response: e }) =>
              e.redirected ? await (0, a.copyResponse)(e) : e,
          }))
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { Strategy: () => o }))
        var a = r(12),
          n = r(7),
          s = (r(4), r(19), r(42))
        r(43)
        class o {
          constructor(e = {}) {
            ;((this.cacheName = a.cacheNames.getRuntimeName(e.cacheName)),
              (this.plugins = e.plugins || []),
              (this.fetchOptions = e.fetchOptions),
              (this.matchOptions = e.matchOptions))
          }
          handle(e) {
            const [t] = this.handleAll(e)
            return t
          }
          handleAll(e) {
            e instanceof FetchEvent && (e = { event: e, request: e.request })
            const t = e.event,
              r =
                'string' == typeof e.request
                  ? new Request(e.request)
                  : e.request,
              a = 'params' in e ? e.params : void 0,
              n = new s.StrategyHandler(this, {
                event: t,
                request: r,
                params: a,
              }),
              o = this._getResponse(n, r, t)
            return [o, this._awaitComplete(o, n, r, t)]
          }
          async _getResponse(e, t, r) {
            let a
            await e.runCallbacks('handlerWillStart', { event: r, request: t })
            try {
              if (((a = await this._handle(t, e)), !a || 'error' === a.type))
                throw new n.WorkboxError('no-response', { url: t.url })
            } catch (n) {
              if (n instanceof Error)
                for (const s of e.iterateCallbacks('handlerDidError'))
                  if (((a = await s({ error: n, event: r, request: t })), a))
                    break
              if (!a) throw n
            }
            for (const n of e.iterateCallbacks('handlerWillRespond'))
              a = await n({ event: r, request: t, response: a })
            return a
          }
          async _awaitComplete(e, t, r, a) {
            let n, s
            try {
              n = await e
            } catch (s) {}
            try {
              ;(await t.runCallbacks('handlerDidRespond', {
                event: a,
                request: r,
                response: n,
              }),
                await t.doneWaiting())
            } catch (e) {
              e instanceof Error && (s = e)
            }
            if (
              (await t.runCallbacks('handlerDidComplete', {
                event: a,
                request: r,
                response: n,
                error: s,
              }),
              t.destroy(),
              s)
            )
              throw s
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { StrategyHandler: () => u }))
        r(6)
        var a = r(13),
          n = r(17),
          s = r(18),
          o = r(19),
          i = (r(4), r(21)),
          c = r(7)
        r(43)
        function l(e) {
          return 'string' == typeof e ? new Request(e) : e
        }
        class u {
          constructor(e, t) {
            ;((this._cacheKeys = {}),
              Object.assign(this, t),
              (this.event = t.event),
              (this._strategy = e),
              (this._handlerDeferred = new n.Deferred()),
              (this._extendLifetimePromises = []),
              (this._plugins = [...e.plugins]),
              (this._pluginStateMap = new Map()))
            for (const e of this._plugins) this._pluginStateMap.set(e, {})
            this.event.waitUntil(this._handlerDeferred.promise)
          }
          async fetch(e) {
            const { event: t } = this
            let r = l(e)
            if (
              'navigate' === r.mode &&
              t instanceof FetchEvent &&
              t.preloadResponse
            ) {
              const e = await t.preloadResponse
              if (e) return e
            }
            const a = this.hasCallback('fetchDidFail') ? r.clone() : null
            try {
              for (const e of this.iterateCallbacks('requestWillFetch'))
                r = await e({ request: r.clone(), event: t })
            } catch (e) {
              if (e instanceof Error)
                throw new c.WorkboxError('plugin-error-request-will-fetch', {
                  thrownErrorMessage: e.message,
                })
            }
            const n = r.clone()
            try {
              let e
              e = await fetch(
                r,
                'navigate' === r.mode ? void 0 : this._strategy.fetchOptions
              )
              for (const r of this.iterateCallbacks('fetchDidSucceed'))
                e = await r({ event: t, request: n, response: e })
              return e
            } catch (e) {
              throw (
                a &&
                  (await this.runCallbacks('fetchDidFail', {
                    error: e,
                    event: t,
                    originalRequest: a.clone(),
                    request: n.clone(),
                  })),
                e
              )
            }
          }
          async fetchAndCachePut(e) {
            const t = await this.fetch(e),
              r = t.clone()
            return (this.waitUntil(this.cachePut(e, r)), t)
          }
          async cacheMatch(e) {
            const t = l(e)
            let r
            const { cacheName: a, matchOptions: n } = this._strategy,
              s = await this.getCacheKey(t, 'read'),
              o = Object.assign(Object.assign({}, n), { cacheName: a })
            r = await caches.match(s, o)
            for (const e of this.iterateCallbacks('cachedResponseWillBeUsed'))
              r =
                (await e({
                  cacheName: a,
                  matchOptions: n,
                  cachedResponse: r,
                  request: s,
                  event: this.event,
                })) || void 0
            return r
          }
          async cachePut(e, t) {
            const r = l(e)
            await (0, i.timeout)(0)
            const n = await this.getCacheKey(r, 'write')
            if (!t)
              throw new c.WorkboxError('cache-put-with-no-response', {
                url: (0, o.getFriendlyURL)(n.url),
              })
            const u = await this._ensureResponseSafeToCache(t)
            if (!u) return !1
            const { cacheName: h, matchOptions: d } = this._strategy,
              p = await self.caches.open(h),
              g = this.hasCallback('cacheDidUpdate'),
              f = g
                ? await (0, a.cacheMatchIgnoreParams)(
                    p,
                    n.clone(),
                    ['__WB_REVISION__'],
                    d
                  )
                : null
            try {
              await p.put(n, g ? u.clone() : u)
            } catch (e) {
              if (e instanceof Error)
                throw (
                  'QuotaExceededError' === e.name &&
                    (await (0, s.executeQuotaErrorCallbacks)()),
                  e
                )
            }
            for (const e of this.iterateCallbacks('cacheDidUpdate'))
              await e({
                cacheName: h,
                oldResponse: f,
                newResponse: u.clone(),
                request: n,
                event: this.event,
              })
            return !0
          }
          async getCacheKey(e, t) {
            const r = `${e.url} | ${t}`
            if (!this._cacheKeys[r]) {
              let a = e
              for (const e of this.iterateCallbacks('cacheKeyWillBeUsed'))
                a = l(
                  await e({
                    mode: t,
                    request: a,
                    event: this.event,
                    params: this.params,
                  })
                )
              this._cacheKeys[r] = a
            }
            return this._cacheKeys[r]
          }
          hasCallback(e) {
            for (const t of this._strategy.plugins) if (e in t) return !0
            return !1
          }
          async runCallbacks(e, t) {
            for (const r of this.iterateCallbacks(e)) await r(t)
          }
          *iterateCallbacks(e) {
            for (const t of this._strategy.plugins)
              if ('function' == typeof t[e]) {
                const r = this._pluginStateMap.get(t),
                  a = a => {
                    const n = Object.assign(Object.assign({}, a), { state: r })
                    return t[e](n)
                  }
                yield a
              }
          }
          waitUntil(e) {
            return (this._extendLifetimePromises.push(e), e)
          }
          async doneWaiting() {
            let e
            for (; (e = this._extendLifetimePromises.shift()); ) await e
          }
          destroy() {
            this._handlerDeferred.resolve(null)
          }
          async _ensureResponseSafeToCache(e) {
            let t = e,
              r = !1
            for (const e of this.iterateCallbacks('cacheWillUpdate'))
              if (
                ((t =
                  (await e({
                    request: this.request,
                    response: t,
                    event: this.event,
                  })) || void 0),
                (r = !0),
                !t)
              )
                break
            return (r || (t && 200 !== t.status && (t = void 0)), t)
          }
        }
      },
      () => {
        try {
          self['workbox:strategies:7.2.0'] && _()
        } catch (e) {}
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { addRoute: () => o }))
        var a = r(45),
          n = r(32),
          s = r(53)
        r(35)
        function o(e) {
          const t = (0, n.getOrCreatePrecacheController)(),
            r = new s.PrecacheRoute(t, e)
          ;(0, a.registerRoute)(r)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { registerRoute: () => i }))
        r(4)
        var a = r(7),
          n = r(46),
          s = r(50),
          o = r(51)
        r(48)
        function i(e, t, r) {
          let i
          if ('string' == typeof e) {
            const a = new URL(e, location.href)
            0
            const s = ({ url: e }) => e.href === a.href
            i = new n.Route(s, t, r)
          } else if (e instanceof RegExp) i = new s.RegExpRoute(e, t, r)
          else if ('function' == typeof e) i = new n.Route(e, t, r)
          else {
            if (!(e instanceof n.Route))
              throw new a.WorkboxError('unsupported-route-type', {
                moduleName: 'workbox-routing',
                funcName: 'registerRoute',
                paramName: 'capture',
              })
            i = e
          }
          return ((0, o.getOrCreateDefaultRouter)().registerRoute(i), i)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { Route: () => s }))
        r(6)
        var a = r(47),
          n = r(49)
        r(48)
        class s {
          constructor(e, t, r = a.defaultMethod) {
            ;((this.handler = (0, n.normalizeHandler)(t)),
              (this.match = e),
              (this.method = r))
          }
          setCatchHandler(e) {
            this.catchHandler = (0, n.normalizeHandler)(e)
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { defaultMethod: () => a, validMethods: () => n }))
        r(48)
        const a = 'GET',
          n = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT']
      },
      () => {
        try {
          self['workbox:routing:7.2.0'] && _()
        } catch (e) {}
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { normalizeHandler: () => a }))
        ;(r(6), r(48))
        const a = e => (e && 'object' == typeof e ? e : { handle: e })
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { RegExpRoute: () => n }))
        ;(r(6), r(4))
        var a = r(46)
        r(48)
        class n extends a.Route {
          constructor(e, t, r) {
            super(
              ({ url: t }) => {
                const r = e.exec(t.href)
                if (r && (t.origin === location.origin || 0 === r.index))
                  return r.slice(1)
              },
              t,
              r
            )
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { getOrCreateDefaultRouter: () => s }))
        var a = r(52)
        r(48)
        let n
        const s = () => (
          n ||
            ((n = new a.Router()), n.addFetchListener(), n.addCacheListener()),
          n
        )
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { Router: () => o }))
        ;(r(6), r(19))
        var a = r(47),
          n = (r(4), r(49)),
          s = r(7)
        r(48)
        class o {
          constructor() {
            ;((this._routes = new Map()), (this._defaultHandlerMap = new Map()))
          }
          get routes() {
            return this._routes
          }
          addFetchListener() {
            self.addEventListener('fetch', e => {
              const { request: t } = e,
                r = this.handleRequest({ request: t, event: e })
              r && e.respondWith(r)
            })
          }
          addCacheListener() {
            self.addEventListener('message', e => {
              if (e.data && 'CACHE_URLS' === e.data.type) {
                const { payload: t } = e.data
                0
                const r = Promise.all(
                  t.urlsToCache.map(t => {
                    'string' == typeof t && (t = [t])
                    const r = new Request(...t)
                    return this.handleRequest({ request: r, event: e })
                  })
                )
                ;(e.waitUntil(r),
                  e.ports &&
                    e.ports[0] &&
                    r.then(() => e.ports[0].postMessage(!0)))
              }
            })
          }
          handleRequest({ request: e, event: t }) {
            const r = new URL(e.url, location.href)
            if (!r.protocol.startsWith('http')) return void 0
            const a = r.origin === location.origin,
              { params: n, route: s } = this.findMatchingRoute({
                event: t,
                request: e,
                sameOrigin: a,
                url: r,
              })
            let o = s && s.handler
            const i = e.method
            if (
              (!o &&
                this._defaultHandlerMap.has(i) &&
                (o = this._defaultHandlerMap.get(i)),
              !o)
            )
              return void 0
            let c
            try {
              c = o.handle({ url: r, request: e, event: t, params: n })
            } catch (e) {
              c = Promise.reject(e)
            }
            const l = s && s.catchHandler
            return (
              c instanceof Promise &&
                (this._catchHandler || l) &&
                (c = c.catch(async a => {
                  if (l) {
                    0
                    try {
                      return await l.handle({
                        url: r,
                        request: e,
                        event: t,
                        params: n,
                      })
                    } catch (e) {
                      e instanceof Error && (a = e)
                    }
                  }
                  if (this._catchHandler)
                    return this._catchHandler.handle({
                      url: r,
                      request: e,
                      event: t,
                    })
                  throw a
                })),
              c
            )
          }
          findMatchingRoute({ url: e, sameOrigin: t, request: r, event: a }) {
            const n = this._routes.get(r.method) || []
            for (const s of n) {
              let n
              const o = s.match({ url: e, sameOrigin: t, request: r, event: a })
              if (o)
                return (
                  (n = o),
                  ((Array.isArray(n) && 0 === n.length) ||
                    (o.constructor === Object && 0 === Object.keys(o).length) ||
                    'boolean' == typeof o) &&
                    (n = void 0),
                  { route: s, params: n }
                )
            }
            return {}
          }
          setDefaultHandler(e, t = a.defaultMethod) {
            this._defaultHandlerMap.set(t, (0, n.normalizeHandler)(e))
          }
          setCatchHandler(e) {
            this._catchHandler = (0, n.normalizeHandler)(e)
          }
          registerRoute(e) {
            ;(this._routes.has(e.method) || this._routes.set(e.method, []),
              this._routes.get(e.method).push(e))
          }
          unregisterRoute(e) {
            if (!this._routes.has(e.method))
              throw new s.WorkboxError(
                'unregister-route-but-not-found-with-method',
                { method: e.method }
              )
            const t = this._routes.get(e.method).indexOf(e)
            if (!(t > -1))
              throw new s.WorkboxError('unregister-route-route-not-registered')
            this._routes.get(e.method).splice(t, 1)
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { PrecacheRoute: () => s }))
        ;(r(4), r(19))
        var a = r(46),
          n = r(54)
        r(35)
        class s extends a.Route {
          constructor(e, t) {
            super(({ request: r }) => {
              const a = e.getURLsToCacheKeys()
              for (const s of (0, n.generateURLVariations)(r.url, t)) {
                const t = a.get(s)
                if (t) {
                  return {
                    cacheKey: t,
                    integrity: e.getIntegrityForCacheKey(t),
                  }
                }
              }
            }, e.strategy)
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { generateURLVariations: () => n }))
        var a = r(55)
        r(35)
        function* n(
          e,
          {
            ignoreURLParametersMatching: t = [/^utm_/, /^fbclid$/],
            directoryIndex: r = 'index.html',
            cleanURLs: n = !0,
            urlManipulation: s,
          } = {}
        ) {
          const o = new URL(e, location.href)
          ;((o.hash = ''), yield o.href)
          const i = (0, a.removeIgnoredSearchParams)(o, t)
          if ((yield i.href, r && i.pathname.endsWith('/'))) {
            const e = new URL(i.href)
            ;((e.pathname += r), yield e.href)
          }
          if (n) {
            const e = new URL(i.href)
            ;((e.pathname += '.html'), yield e.href)
          }
          if (s) {
            const e = s({ url: o })
            for (const t of e) yield t.href
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { removeIgnoredSearchParams: () => a }))
        r(35)
        function a(e, t = []) {
          for (const r of [...e.searchParams.keys()])
            t.some(e => e.test(r)) && e.searchParams.delete(r)
          return e
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { cleanupOutdatedCaches: () => s }))
        var a = r(12),
          n = (r(4), r(57))
        r(35)
        function s() {
          self.addEventListener('activate', e => {
            const t = a.cacheNames.getPrecacheName()
            e.waitUntil(
              (0, n.deleteOutdatedCaches)(t).then(e => {
                0
              })
            )
          })
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { deleteOutdatedCaches: () => a }))
        r(35)
        const a = async (e, t = '-precache-') => {
          const r = (await self.caches.keys()).filter(
            r => r.includes(t) && r.includes(self.registration.scope) && r !== e
          )
          return (await Promise.all(r.map(e => self.caches.delete(e))), r)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { createHandlerBoundToURL: () => n }))
        var a = r(32)
        r(35)
        function n(e) {
          return (0, a.getOrCreatePrecacheController)().createHandlerBoundToURL(
            e
          )
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { getCacheKeyForURL: () => n }))
        var a = r(32)
        r(35)
        function n(e) {
          return (0, a.getOrCreatePrecacheController)().getCacheKeyForURL(e)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { matchPrecache: () => n }))
        var a = r(32)
        r(35)
        function n(e) {
          return (0, a.getOrCreatePrecacheController)().matchPrecache(e)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { precache: () => n }))
        var a = r(32)
        r(35)
        function n(e) {
          ;(0, a.getOrCreatePrecacheController)().precache(e)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { precacheAndRoute: () => s }))
        var a = r(44),
          n = r(61)
        r(35)
        function s(e, t) {
          ;((0, n.precache)(e), (0, a.addRoute)(t))
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { PrecacheFallbackPlugin: () => n }))
        var a = r(32)
        r(35)
        class n {
          constructor({ fallbackURL: e, precacheController: t }) {
            ;((this.handlerDidError = () =>
              this._precacheController.matchPrecache(this._fallbackURL)),
              (this._fallbackURL = e),
              (this._precacheController =
                t || (0, a.getOrCreatePrecacheController)()))
          }
        }
      },
      (e, t, r) => {
        r.r(t)
        r(35)
      },
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            NavigationRoute: () => a.NavigationRoute,
            RegExpRoute: () => a.RegExpRoute,
            Route: () => a.Route,
            Router: () => a.Router,
            registerRoute: () => a.registerRoute,
            setCatchHandler: () => a.setCatchHandler,
            setDefaultHandler: () => a.setDefaultHandler,
          }))
        var a = r(66)
      },
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            NavigationRoute: () => a.NavigationRoute,
            RegExpRoute: () => n.RegExpRoute,
            Route: () => o.Route,
            Router: () => i.Router,
            registerRoute: () => s.registerRoute,
            setCatchHandler: () => c.setCatchHandler,
            setDefaultHandler: () => l.setDefaultHandler,
          }))
        var a = r(67),
          n = r(50),
          s = r(45),
          o = r(46),
          i = r(52),
          c = r(68),
          l = r(69)
        r(48)
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { NavigationRoute: () => n }))
        ;(r(6), r(4))
        var a = r(46)
        r(48)
        class n extends a.Route {
          constructor(e, { allowlist: t = [/./], denylist: r = [] } = {}) {
            ;(super(e => this._match(e), e),
              (this._allowlist = t),
              (this._denylist = r))
          }
          _match({ url: e, request: t }) {
            if (t && 'navigate' !== t.mode) return !1
            const r = e.pathname + e.search
            for (const e of this._denylist) if (e.test(r)) return !1
            return !!this._allowlist.some(e => e.test(r))
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { setCatchHandler: () => n }))
        var a = r(51)
        r(48)
        function n(e) {
          ;(0, a.getOrCreateDefaultRouter)().setCatchHandler(e)
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { setDefaultHandler: () => n }))
        var a = r(51)
        r(48)
        function n(e) {
          ;(0, a.getOrCreateDefaultRouter)().setDefaultHandler(e)
        }
      },
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            CacheFirst: () => a.CacheFirst,
            CacheOnly: () => a.CacheOnly,
            NetworkFirst: () => a.NetworkFirst,
            NetworkOnly: () => a.NetworkOnly,
            StaleWhileRevalidate: () => a.StaleWhileRevalidate,
            Strategy: () => a.Strategy,
            StrategyHandler: () => a.StrategyHandler,
          }))
        var a = r(71)
      },
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            CacheFirst: () => a.CacheFirst,
            CacheOnly: () => n.CacheOnly,
            NetworkFirst: () => s.NetworkFirst,
            NetworkOnly: () => o.NetworkOnly,
            StaleWhileRevalidate: () => i.StaleWhileRevalidate,
            Strategy: () => c.Strategy,
            StrategyHandler: () => l.StrategyHandler,
          }))
        var a = r(72),
          n = r(74),
          s = r(75),
          o = r(77),
          i = r(78),
          c = r(41),
          l = r(42)
        r(43)
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { CacheFirst: () => s }))
        ;(r(6), r(4))
        var a = r(7),
          n = r(41)
        ;(r(73), r(43))
        class s extends n.Strategy {
          async _handle(e, t) {
            let r,
              n = await t.cacheMatch(e)
            if (n) 0
            else {
              0
              try {
                n = await t.fetchAndCachePut(e)
              } catch (e) {
                e instanceof Error && (r = e)
              }
              0
            }
            if (!n)
              throw new a.WorkboxError('no-response', { url: e.url, error: r })
            return n
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { messages: () => s }))
        var a = r(4),
          n = r(19)
        r(43)
        const s = {
          strategyStart: (e, t) =>
            `Using ${e} to respond to '${(0, n.getFriendlyURL)(t.url)}'`,
          printFinalResponse: e => {
            e &&
              (a.logger.groupCollapsed('View the final response here.'),
              a.logger.log(e || '[No response returned]'),
              a.logger.groupEnd())
          },
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { CacheOnly: () => s }))
        ;(r(6), r(4))
        var a = r(7),
          n = r(41)
        ;(r(73), r(43))
        class s extends n.Strategy {
          async _handle(e, t) {
            const r = await t.cacheMatch(e)
            if (!r) throw new a.WorkboxError('no-response', { url: e.url })
            return r
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { NetworkFirst: () => o }))
        ;(r(6), r(4))
        var a = r(7),
          n = r(76),
          s = r(41)
        ;(r(73), r(43))
        class o extends s.Strategy {
          constructor(e = {}) {
            ;(super(e),
              this.plugins.some(e => 'cacheWillUpdate' in e) ||
                this.plugins.unshift(n.cacheOkAndOpaquePlugin),
              (this._networkTimeoutSeconds = e.networkTimeoutSeconds || 0))
          }
          async _handle(e, t) {
            const r = []
            const n = []
            let s
            if (this._networkTimeoutSeconds) {
              const { id: a, promise: o } = this._getTimeoutPromise({
                request: e,
                logs: r,
                handler: t,
              })
              ;((s = a), n.push(o))
            }
            const o = this._getNetworkPromise({
              timeoutId: s,
              request: e,
              logs: r,
              handler: t,
            })
            n.push(o)
            const i = await t.waitUntil(
              (async () => (await t.waitUntil(Promise.race(n))) || (await o))()
            )
            if (!i) throw new a.WorkboxError('no-response', { url: e.url })
            return i
          }
          _getTimeoutPromise({ request: e, logs: t, handler: r }) {
            let a
            return {
              promise: new Promise(t => {
                a = setTimeout(async () => {
                  t(await r.cacheMatch(e))
                }, 1e3 * this._networkTimeoutSeconds)
              }),
              id: a,
            }
          }
          async _getNetworkPromise({
            timeoutId: e,
            request: t,
            logs: r,
            handler: a,
          }) {
            let n, s
            try {
              s = await a.fetchAndCachePut(t)
            } catch (e) {
              e instanceof Error && (n = e)
            }
            return (
              e && clearTimeout(e),
              (!n && s) || (s = await a.cacheMatch(t)),
              s
            )
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { cacheOkAndOpaquePlugin: () => a }))
        r(43)
        const a = {
          cacheWillUpdate: async ({ response: e }) =>
            200 === e.status || 0 === e.status ? e : null,
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { NetworkOnly: () => o }))
        ;(r(6), r(4))
        var a = r(21),
          n = r(7),
          s = r(41)
        ;(r(73), r(43))
        class o extends s.Strategy {
          constructor(e = {}) {
            ;(super(e),
              (this._networkTimeoutSeconds = e.networkTimeoutSeconds || 0))
          }
          async _handle(e, t) {
            let r, s
            try {
              const r = [t.fetch(e)]
              if (this._networkTimeoutSeconds) {
                const e = (0, a.timeout)(1e3 * this._networkTimeoutSeconds)
                r.push(e)
              }
              if (((s = await Promise.race(r)), !s))
                throw new Error(
                  `Timed out the network response after ${this._networkTimeoutSeconds} seconds.`
                )
            } catch (e) {
              e instanceof Error && (r = e)
            }
            if (!s)
              throw new n.WorkboxError('no-response', { url: e.url, error: r })
            return s
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { StaleWhileRevalidate: () => o }))
        ;(r(6), r(4))
        var a = r(7),
          n = r(76),
          s = r(41)
        ;(r(73), r(43))
        class o extends s.Strategy {
          constructor(e = {}) {
            ;(super(e),
              this.plugins.some(e => 'cacheWillUpdate' in e) ||
                this.plugins.unshift(n.cacheOkAndOpaquePlugin))
          }
          async _handle(e, t) {
            const r = t.fetchAndCachePut(e).catch(() => {})
            t.waitUntil(r)
            let n,
              s = await t.cacheMatch(e)
            if (s) 0
            else {
              0
              try {
                s = await r
              } catch (e) {
                e instanceof Error && (n = e)
              }
            }
            if (!s)
              throw new a.WorkboxError('no-response', { url: e.url, error: n })
            return s
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            CacheExpiration: () => a.CacheExpiration,
            ExpirationPlugin: () => a.ExpirationPlugin,
          }))
        var a = r(80)
      },
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            CacheExpiration: () => a.CacheExpiration,
            ExpirationPlugin: () => n.ExpirationPlugin,
          }))
        var a = r(81),
          n = r(90)
        r(89)
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { CacheExpiration: () => s }))
        r(6)
        var a = r(16),
          n = (r(4), r(7), r(82))
        r(89)
        class s {
          constructor(e, t = {}) {
            ;((this._isRunning = !1),
              (this._rerunRequested = !1),
              (this._maxEntries = t.maxEntries),
              (this._maxAgeSeconds = t.maxAgeSeconds),
              (this._matchOptions = t.matchOptions),
              (this._cacheName = e),
              (this._timestampModel = new n.CacheTimestampsModel(e)))
          }
          async expireEntries() {
            if (this._isRunning) return void (this._rerunRequested = !0)
            this._isRunning = !0
            const e = this._maxAgeSeconds
                ? Date.now() - 1e3 * this._maxAgeSeconds
                : 0,
              t = await this._timestampModel.expireEntries(e, this._maxEntries),
              r = await self.caches.open(this._cacheName)
            for (const e of t) await r.delete(e, this._matchOptions)
            ;((this._isRunning = !1),
              this._rerunRequested &&
                ((this._rerunRequested = !1),
                (0, a.dontWaitFor)(this.expireEntries())))
          }
          async updateTimestamp(e) {
            await this._timestampModel.setTimestamp(e, Date.now())
          }
          async isURLExpired(e) {
            if (this._maxAgeSeconds) {
              const t = await this._timestampModel.getTimestamp(e),
                r = Date.now() - 1e3 * this._maxAgeSeconds
              return void 0 === t || t < r
            }
            return !1
          }
          async delete() {
            ;((this._rerunRequested = !1),
              await this._timestampModel.expireEntries(1 / 0))
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { CacheTimestampsModel: () => o }))
        var a = r(83)
        r(89)
        const n = 'cache-entries',
          s = e => {
            const t = new URL(e, location.href)
            return ((t.hash = ''), t.href)
          }
        class o {
          constructor(e) {
            ;((this._db = null), (this._cacheName = e))
          }
          _upgradeDb(e) {
            const t = e.createObjectStore(n, { keyPath: 'id' })
            ;(t.createIndex('cacheName', 'cacheName', { unique: !1 }),
              t.createIndex('timestamp', 'timestamp', { unique: !1 }))
          }
          _upgradeDbAndDeleteOldDbs(e) {
            ;(this._upgradeDb(e),
              this._cacheName && (0, a.deleteDB)(this._cacheName))
          }
          async setTimestamp(e, t) {
            const r = {
                url: (e = s(e)),
                timestamp: t,
                cacheName: this._cacheName,
                id: this._getId(e),
              },
              a = (await this.getDb()).transaction(n, 'readwrite', {
                durability: 'relaxed',
              })
            ;(await a.store.put(r), await a.done)
          }
          async getTimestamp(e) {
            const t = await this.getDb(),
              r = await t.get(n, this._getId(e))
            return null == r ? void 0 : r.timestamp
          }
          async expireEntries(e, t) {
            const r = await this.getDb()
            let a = await r
              .transaction(n)
              .store.index('timestamp')
              .openCursor(null, 'prev')
            const s = []
            let o = 0
            for (; a; ) {
              const r = a.value
              ;(r.cacheName === this._cacheName &&
                ((e && r.timestamp < e) || (t && o >= t)
                  ? s.push(a.value)
                  : o++),
                (a = await a.continue()))
            }
            const i = []
            for (const e of s) (await r.delete(n, e.id), i.push(e.url))
            return i
          }
          _getId(e) {
            return this._cacheName + '|' + s(e)
          }
          async getDb() {
            return (
              this._db ||
                (this._db = await (0, a.openDB)('workbox-expiration', 1, {
                  upgrade: this._upgradeDbAndDeleteOldDbs.bind(this),
                })),
              this._db
            )
          }
        }
      },
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            deleteDB: () => c,
            openDB: () => i,
            unwrap: () => n.u,
            wrap: () => n.w,
          }))
        var a = r(84),
          n = r(88)
        function s(e, t) {
          var r = Object.keys(e)
          if (Object.getOwnPropertySymbols) {
            var a = Object.getOwnPropertySymbols(e)
            ;(t &&
              (a = a.filter(function (t) {
                return Object.getOwnPropertyDescriptor(e, t).enumerable
              })),
              r.push.apply(r, a))
          }
          return r
        }
        function o(e) {
          for (var t = 1; t < arguments.length; t++) {
            var r = null != arguments[t] ? arguments[t] : {}
            t % 2
              ? s(Object(r), !0).forEach(function (t) {
                  ;(0, a.default)(e, t, r[t])
                })
              : Object.getOwnPropertyDescriptors
                ? Object.defineProperties(
                    e,
                    Object.getOwnPropertyDescriptors(r)
                  )
                : s(Object(r)).forEach(function (t) {
                    Object.defineProperty(
                      e,
                      t,
                      Object.getOwnPropertyDescriptor(r, t)
                    )
                  })
          }
          return e
        }
        function i(
          e,
          t,
          { blocked: r, upgrade: a, blocking: s, terminated: o } = {}
        ) {
          const i = indexedDB.open(e, t),
            c = (0, n.w)(i)
          return (
            a &&
              i.addEventListener('upgradeneeded', e => {
                a(
                  (0, n.w)(i.result),
                  e.oldVersion,
                  e.newVersion,
                  (0, n.w)(i.transaction),
                  e
                )
              }),
            r &&
              i.addEventListener('blocked', e =>
                r(e.oldVersion, e.newVersion, e)
              ),
            c
              .then(e => {
                ;(o && e.addEventListener('close', () => o()),
                  s &&
                    e.addEventListener('versionchange', e =>
                      s(e.oldVersion, e.newVersion, e)
                    ))
              })
              .catch(() => {}),
            c
          )
        }
        function c(e, { blocked: t } = {}) {
          const r = indexedDB.deleteDatabase(e)
          return (
            t && r.addEventListener('blocked', e => t(e.oldVersion, e)),
            (0, n.w)(r).then(() => {})
          )
        }
        const l = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'],
          u = ['put', 'add', 'delete', 'clear'],
          h = new Map()
        function d(e, t) {
          if (!(e instanceof IDBDatabase) || t in e || 'string' != typeof t)
            return
          if (h.get(t)) return h.get(t)
          const r = t.replace(/FromIndex$/, ''),
            a = t !== r,
            n = u.includes(r)
          if (
            !(r in (a ? IDBIndex : IDBObjectStore).prototype) ||
            (!n && !l.includes(r))
          )
            return
          const s = async function (e, ...t) {
            const s = this.transaction(e, n ? 'readwrite' : 'readonly')
            let o = s.store
            return (
              a && (o = o.index(t.shift())),
              (await Promise.all([o[r](...t), n && s.done]))[0]
            )
          }
          return (h.set(t, s), s)
        }
        ;(0, n.r)(e =>
          o(
            o({}, e),
            {},
            {
              get: (t, r, a) => d(t, r) || e.get(t, r, a),
              has: (t, r) => !!d(t, r) || e.has(t, r),
            }
          )
        )
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { default: () => n }))
        var a = r(85)
        function n(e, t, r) {
          return (
            (t = (0, a.default)(t)) in e
              ? Object.defineProperty(e, t, {
                  value: r,
                  enumerable: !0,
                  configurable: !0,
                  writable: !0,
                })
              : (e[t] = r),
            e
          )
        }
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { default: () => s }))
        var a = r(86),
          n = r(87)
        function s(e) {
          var t = (0, n.default)(e, 'string')
          return 'symbol' === (0, a.default)(t) ? t : String(t)
        }
      },
      (e, t, r) => {
        function a(e) {
          return (
            (a =
              'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
                ? function (e) {
                    return typeof e
                  }
                : function (e) {
                    return e &&
                      'function' == typeof Symbol &&
                      e.constructor === Symbol &&
                      e !== Symbol.prototype
                      ? 'symbol'
                      : typeof e
                  }),
            a(e)
          )
        }
        ;(r.r(t), r.d(t, { default: () => a }))
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { default: () => n }))
        var a = r(86)
        function n(e, t) {
          if ('object' !== (0, a.default)(e) || null === e) return e
          var r = e[Symbol.toPrimitive]
          if (void 0 !== r) {
            var n = r.call(e, t || 'default')
            if ('object' !== (0, a.default)(n)) return n
            throw new TypeError('@@toPrimitive must return a primitive value.')
          }
          return ('string' === t ? String : Number)(e)
        }
      },
      (e, t, r) => {
        ;(r.r(t),
          r.d(t, {
            a: () => u,
            i: () => a,
            r: () => d,
            u: () => m,
            w: () => f,
          }))
        const a = (e, t) => t.some(t => e instanceof t)
        let n, s
        const o = new WeakMap(),
          i = new WeakMap(),
          c = new WeakMap(),
          l = new WeakMap(),
          u = new WeakMap()
        let h = {
          get(e, t, r) {
            if (e instanceof IDBTransaction) {
              if ('done' === t) return i.get(e)
              if ('objectStoreNames' === t)
                return e.objectStoreNames || c.get(e)
              if ('store' === t)
                return r.objectStoreNames[1]
                  ? void 0
                  : r.objectStore(r.objectStoreNames[0])
            }
            return f(e[t])
          },
          set: (e, t, r) => ((e[t] = r), !0),
          has: (e, t) =>
            (e instanceof IDBTransaction && ('done' === t || 'store' === t)) ||
            t in e,
        }
        function d(e) {
          h = e(h)
        }
        function p(e) {
          return e !== IDBDatabase.prototype.transaction ||
            'objectStoreNames' in IDBTransaction.prototype
            ? (
                s ||
                (s = [
                  IDBCursor.prototype.advance,
                  IDBCursor.prototype.continue,
                  IDBCursor.prototype.continuePrimaryKey,
                ])
              ).includes(e)
              ? function (...t) {
                  return (e.apply(m(this), t), f(o.get(this)))
                }
              : function (...t) {
                  return f(e.apply(m(this), t))
                }
            : function (t, ...r) {
                const a = e.call(m(this), t, ...r)
                return (c.set(a, t.sort ? t.sort() : [t]), f(a))
              }
        }
        function g(e) {
          return 'function' == typeof e
            ? p(e)
            : (e instanceof IDBTransaction &&
                (function (e) {
                  if (i.has(e)) return
                  const t = new Promise((t, r) => {
                    const a = () => {
                        ;(e.removeEventListener('complete', n),
                          e.removeEventListener('error', s),
                          e.removeEventListener('abort', s))
                      },
                      n = () => {
                        ;(t(), a())
                      },
                      s = () => {
                        ;(r(
                          e.error ||
                            new DOMException('AbortError', 'AbortError')
                        ),
                          a())
                      }
                    ;(e.addEventListener('complete', n),
                      e.addEventListener('error', s),
                      e.addEventListener('abort', s))
                  })
                  i.set(e, t)
                })(e),
              a(
                e,
                n ||
                  (n = [
                    IDBDatabase,
                    IDBObjectStore,
                    IDBIndex,
                    IDBCursor,
                    IDBTransaction,
                  ])
              )
                ? new Proxy(e, h)
                : e)
        }
        function f(e) {
          if (e instanceof IDBRequest)
            return (function (e) {
              const t = new Promise((t, r) => {
                const a = () => {
                    ;(e.removeEventListener('success', n),
                      e.removeEventListener('error', s))
                  },
                  n = () => {
                    ;(t(f(e.result)), a())
                  },
                  s = () => {
                    ;(r(e.error), a())
                  }
                ;(e.addEventListener('success', n),
                  e.addEventListener('error', s))
              })
              return (
                t
                  .then(t => {
                    t instanceof IDBCursor && o.set(t, e)
                  })
                  .catch(() => {}),
                u.set(t, e),
                t
              )
            })(e)
          if (l.has(e)) return l.get(e)
          const t = g(e)
          return (t !== e && (l.set(e, t), u.set(t, e)), t)
        }
        const m = e => u.get(e)
      },
      () => {
        try {
          self['workbox:expiration:7.2.0'] && _()
        } catch (e) {}
      },
      (e, t, r) => {
        ;(r.r(t), r.d(t, { ExpirationPlugin: () => c }))
        r(6)
        var a = r(12),
          n = r(16),
          s = (r(19), r(4), r(3)),
          o = r(7),
          i = r(81)
        r(89)
        class c {
          constructor(e = {}) {
            ;((this.cachedResponseWillBeUsed = async ({
              event: e,
              request: t,
              cacheName: r,
              cachedResponse: a,
            }) => {
              if (!a) return null
              const s = this._isResponseDateFresh(a),
                o = this._getCacheExpiration(r)
              ;(0, n.dontWaitFor)(o.expireEntries())
              const i = o.updateTimestamp(t.url)
              if (e)
                try {
                  e.waitUntil(i)
                } catch (e) {
                  0
                }
              return s ? a : null
            }),
              (this.cacheDidUpdate = async ({ cacheName: e, request: t }) => {
                const r = this._getCacheExpiration(e)
                ;(await r.updateTimestamp(t.url), await r.expireEntries())
              }),
              (this._config = e),
              (this._maxAgeSeconds = e.maxAgeSeconds),
              (this._cacheExpirations = new Map()),
              e.purgeOnQuotaError &&
                (0, s.registerQuotaErrorCallback)(() =>
                  this.deleteCacheAndMetadata()
                ))
          }
          _getCacheExpiration(e) {
            if (e === a.cacheNames.getRuntimeName())
              throw new o.WorkboxError('expire-custom-caches-only')
            let t = this._cacheExpirations.get(e)
            return (
              t ||
                ((t = new i.CacheExpiration(e, this._config)),
                this._cacheExpirations.set(e, t)),
              t
            )
          }
          _isResponseDateFresh(e) {
            if (!this._maxAgeSeconds) return !0
            const t = this._getDateHeaderTimestamp(e)
            if (null === t) return !0
            return t >= Date.now() - 1e3 * this._maxAgeSeconds
          }
          _getDateHeaderTimestamp(e) {
            if (!e.headers.has('date')) return null
            const t = e.headers.get('date'),
              r = new Date(t).getTime()
            return isNaN(r) ? null : r
          }
          async deleteCacheAndMetadata() {
            for (const [e, t] of this._cacheExpirations)
              (await self.caches.delete(e), await t.delete())
            this._cacheExpirations = new Map()
          }
        }
      },
    ],
    t = {}
  function r(a) {
    var n = t[a]
    if (void 0 !== n) return n.exports
    var s = (t[a] = { exports: {} })
    return (e[a](s, s.exports, r), s.exports)
  }
  ;((r.n = e => {
    var t = e && e.__esModule ? () => e.default : () => e
    return (r.d(t, { a: t }), t)
  }),
    (r.d = (e, t) => {
      for (var a in t)
        r.o(t, a) &&
          !r.o(e, a) &&
          Object.defineProperty(e, a, { enumerable: !0, get: t[a] })
    }),
    (r.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
    (r.r = e => {
      ;('undefined' != typeof Symbol &&
        Symbol.toStringTag &&
        Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' }),
        Object.defineProperty(e, '__esModule', { value: !0 }))
    }))
  var a = {}
  ;(() => {
    r.r(a)
    var e = r(1),
      t = r(29),
      n = r(65),
      s = r(70),
      o = r(79)
    ;(self.skipWaiting(),
      (0, e.clientsClaim)(),
      (0, t.precacheAndRoute)(self.__WB_MANIFEST || []),
      (0, t.cleanupOutdatedCaches)(),
      (0, n.registerRoute)(
        ({ url: e }) => /^https:\/\/fonts\.googleapis\.com\/.*/i.test(e.href),
        new s.CacheFirst({
          cacheName: 'google-fonts',
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) => /^https:\/\/fonts\.gstatic\.com\/.*/i.test(e.href),
        new s.CacheFirst({
          cacheName: 'google-fonts-static',
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) =>
          /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i.test(e.pathname),
        new s.StaleWhileRevalidate({
          cacheName: 'static-font-assets',
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) =>
          /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i.test(e.pathname),
        new s.StaleWhileRevalidate({
          cacheName: 'static-image-assets',
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) => /\/_next\/image\?url=.+$/i.test(e.pathname + e.search),
        new s.StaleWhileRevalidate({
          cacheName: 'next-image',
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) => /\.(?:mp3|wav|ogg)$/i.test(e.pathname),
        new s.CacheFirst({
          cacheName: 'static-audio-assets',
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) => /\.(?:mp4)$/i.test(e.pathname),
        new s.CacheFirst({
          cacheName: 'static-video-assets',
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) => /\.(?:js)$/i.test(e.pathname),
        new s.StaleWhileRevalidate({
          cacheName: 'static-js-assets',
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) => /\.(?:css|less)$/i.test(e.pathname),
        new s.StaleWhileRevalidate({
          cacheName: 'static-style-assets',
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) => /\/_next\/data\/.+\/.+\.json$/i.test(e.pathname),
        new s.StaleWhileRevalidate({
          cacheName: 'next-data',
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) => /\.(?:json|xml|csv)$/i.test(e.pathname),
        new s.NetworkFirst({
          cacheName: 'static-data-assets',
          networkTimeoutSeconds: 10,
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) => {
          if (!(self.origin === e.origin)) return !1
          const t = e.pathname
          return (
            !t.startsWith('/api/auth') &&
            !t.startsWith('/api/webhooks') &&
            t.startsWith('/api/')
          )
        },
        new s.NetworkFirst({
          cacheName: 'apis',
          networkTimeoutSeconds: 10,
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) => self.origin === e.origin,
        new s.NetworkFirst({
          cacheName: 'others',
          networkTimeoutSeconds: 10,
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          ],
        })
      ),
      (0, n.registerRoute)(
        ({ url: e }) => self.origin !== e.origin,
        new s.NetworkFirst({
          cacheName: 'cross-origin',
          networkTimeoutSeconds: 10,
          plugins: [
            new o.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
          ],
        })
      ),
      self.addEventListener('sync', function (e) {
        try {
          e &&
            'gravity-sync' === e.tag &&
            e.waitUntil(
              (async function () {
                try {
                  ;(
                    await self.clients.matchAll({
                      type: 'window',
                      includeUncontrolled: !0,
                    })
                  ).forEach(e => {
                    try {
                      e.postMessage({ type: 'sync-outbox' })
                    } catch (e) {}
                  })
                } catch (e) {}
              })()
            )
        } catch (e) {}
      }))
  })()
})()
