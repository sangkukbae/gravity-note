'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface NoteAttachmentsProps {
  noteId: string
  className?: string
  max?: number
  // Rendering variant:
  // - 'thumb': small square thumbnails (input/editor preview)
  // - 'card': full-width, readable images inside a note card
  variant?: 'thumb' | 'card'
}

interface AttachmentItem {
  id: string
  path: string
  url?: string
  width?: number | null
  height?: number | null
  // For responsive variants (card)
  urlsByWidth?: Record<number, string>
}

export function NoteAttachments({
  noteId,
  className,
  max = 4,
  variant = 'thumb',
}: NoteAttachmentsProps) {
  // Create a stable Supabase client instance to avoid re-running effects
  const supabaseRef = useRef(createClient())
  const [items, setItems] = useState<AttachmentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const retriesRef = useRef(0)
  const urlCacheRef = useRef<Map<string, { url: string; expiry: number }>>(
    new Map()
  )

  const createSignedUrlWithCache = useCallback(
    async (storagePath: string, withTransform = false) => {
      const cacheKey = `${storagePath}:${withTransform ? 'transform' : 'plain'}`
      const cached = urlCacheRef.current.get(cacheKey)

      // Check if we have a valid cached URL (with 10min buffer before expiry)
      if (cached && Date.now() < cached.expiry - 10 * 60 * 1000) {
        return { data: { signedUrl: cached.url }, error: null }
      }

      // Create new signed URL with longer expiry (2 hours)
      const expiry = 60 * 60 * 2
      let result

      if (withTransform) {
        result = await supabaseRef.current.storage
          .from('note-images')
          .createSignedUrl(storagePath, expiry, {
            transform: { width: 192, height: 192, resize: 'cover' },
          })
      } else {
        result = await supabaseRef.current.storage
          .from('note-images')
          .createSignedUrl(storagePath, expiry)
      }

      // Cache the URL if successful
      if (!result.error && result.data?.signedUrl) {
        urlCacheRef.current.set(cacheKey, {
          url: result.data.signedUrl,
          expiry: Date.now() + expiry * 1000,
        })
      }

      return result
    },
    []
  )

  // Create a width-specific signed URL (used for responsive card images)
  const getSignedUrlForWidth = useCallback(
    async (
      storagePath: string,
      width: number,
      resize: 'contain' | 'cover' | 'fill' = 'contain'
    ) => {
      const cacheKey = `${storagePath}:w=${width}:${resize}`
      const cached = urlCacheRef.current.get(cacheKey)
      if (cached && Date.now() < cached.expiry - 10 * 60 * 1000) {
        return { data: { signedUrl: cached.url }, error: null }
      }
      const expiry = 60 * 60 * 2 // 2 hours
      const result = await supabaseRef.current.storage
        .from('note-images')
        .createSignedUrl(storagePath, expiry, {
          transform: { width, resize },
        })
      if (!result.error && result.data?.signedUrl) {
        urlCacheRef.current.set(cacheKey, {
          url: result.data.signedUrl,
          expiry: Date.now() + expiry * 1000,
        })
      }
      return result
    },
    []
  )

  // Fullscreen viewer state (used only for 'card' variant but hooks must be unconditional)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeUrl, setActiveUrl] = useState<string | undefined>()

  const load = useCallback(async () => {
    setIsLoading(true)
    setHasError(false)

    try {
      const { data, error } = await supabaseRef.current
        .from('note_attachments')
        .select('id, storage_path, width, height')
        .eq('note_id', noteId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const rows = data || []
      const limited = rows.slice(0, max)

      // Create signed URLs according to variant
      const signed: AttachmentItem[] = []
      for (const r of limited) {
        if (variant === 'thumb') {
          // Prefer small transform for thumbnails; fallback to plain
          const withTransform = await createSignedUrlWithCache(
            r.storage_path,
            true
          )
          if (!withTransform.error && withTransform.data?.signedUrl) {
            signed.push({
              id: r.id,
              path: r.storage_path,
              url: withTransform.data.signedUrl,
              width: r.width,
              height: r.height,
            })
            continue
          }
          const plain = await createSignedUrlWithCache(r.storage_path, false)
          signed.push({
            id: r.id,
            path: r.storage_path,
            ...(plain.data?.signedUrl ? { url: plain.data.signedUrl } : {}),
            width: r.width,
            height: r.height,
          })
        } else {
          // card variant: generate responsive sizes
          const targetWidths = [640, 828, 1080, 1280]
          const urlsByWidth: Record<number, string> = {}
          for (const w of targetWidths) {
            const u = await getSignedUrlForWidth(r.storage_path, w, 'contain')
            if (!u.error && u.data?.signedUrl) {
              urlsByWidth[w] = u.data.signedUrl
            }
          }
          // As a fallback, also generate a plain signed URL
          let fallbackUrl: string | undefined
          if (Object.keys(urlsByWidth).length === 0) {
            const plain = await createSignedUrlWithCache(r.storage_path, false)
            fallbackUrl = plain.data?.signedUrl
          }
          signed.push({
            id: r.id,
            path: r.storage_path,
            ...(fallbackUrl ? { url: fallbackUrl } : {}),
            urlsByWidth,
            width: r.width,
            height: r.height,
          })
        }
      }

      setItems(prev => {
        // Avoid unnecessary state updates if nothing changed
        const sameLength = prev.length === signed.length
        const sameIds =
          sameLength &&
          prev.every(
            (p, i) => p.id === signed[i]?.id && p.url === signed[i]?.url
          )
        return sameLength && sameIds ? prev : signed
      })
      setHasError(false)
    } catch (error) {
      console.error('Failed to load note attachments:', error)
      setItems([])
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [noteId, max, createSignedUrlWithCache])

  // Initial load and realtime subscription for new/updated attachments
  useEffect(() => {
    let active = true
    load()

    // Enhanced retry logic with exponential backoff for better reliability
    retriesRef.current = 0
    const retryDelays = [500, 1000, 2000, 3000, 5000, 8000] // Exponential backoff

    const scheduleRetry = (retryIndex: number) => {
      if (!active || retryIndex >= retryDelays.length) return

      const delay = retryDelays[retryIndex]
      setTimeout(() => {
        if (active) {
          retriesRef.current = retryIndex + 1
          load()
          scheduleRetry(retryIndex + 1)
        }
      }, delay)
    }

    scheduleRetry(0)

    const channel = supabaseRef.current
      .channel(`note_attachments_${noteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_attachments',
          filter: `note_id=eq.${noteId}`,
        },
        () => {
          // Re-load on any insert/update/delete for this note
          if (active) load()
        }
      )
      .subscribe()

    return () => {
      active = false
      supabaseRef.current.removeChannel(channel)
    }
  }, [noteId, load])

  // Listen for explicit finalize events dispatched by the input
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { noteId?: string }
      if (detail?.noteId === noteId) load()
    }
    window.addEventListener('gn:attachments-finalized', handler as any)
    return () =>
      window.removeEventListener('gn:attachments-finalized', handler as any)
  }, [noteId, load])

  // Card viewer hooks must be declared before any early returns
  // Listen for global open events (dispatched on image click)
  useEffect(() => {
    if (variant !== 'card') return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        noteId?: string
        index?: number
      }
      if (detail?.noteId === noteId) {
        setActiveIndex(
          Math.max(0, Math.min(items.length - 1, detail.index || 0))
        )
        setViewerOpen(true)
      }
    }
    window.addEventListener('gn:open-image-viewer', handler as any)
    return () =>
      window.removeEventListener('gn:open-image-viewer', handler as any)
  }, [variant, noteId, items.length])

  // Load high-res when dialog opens or activeIndex changes
  useEffect(() => {
    if (variant !== 'card' || !viewerOpen) return
    let cancelled = false
    const loadHi = async () => {
      const item = items[activeIndex]
      if (!item) return
      const hi = await getSignedUrlForWidth(item.path, 2048, 'contain')
      if (!cancelled)
        setActiveUrl(
          hi.data?.signedUrl ||
            Object.values(item.urlsByWidth || {}).pop() ||
            item.url
        )
    }
    loadHi()
    return () => {
      cancelled = true
    }
  }, [variant, viewerOpen, activeIndex, items, getSignedUrlForWidth])

  // Do not render a skeleton while loading; only render when we know we have items.
  // This avoids showing placeholder boxes on notes without attachments.

  // Show error state if failed to load
  if (hasError && items.length === 0) {
    return (
      <div
        className={cn(
          'mb-3 p-3 rounded-md border border-destructive/20 bg-destructive/5',
          className
        )}
      >
        <p className='text-sm text-destructive'>Failed to load attachments</p>
      </div>
    )
  }

  // Don't render if no items
  if (items.length === 0) return null

  // Card variant (full-width images under the note text)
  if (variant === 'card') {
    // Simple grid rules: 1 → single, 2 → two columns, 3+ → responsive grid
    const isSingle = items.length === 1
    const sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 720px, 960px'

    return (
      <div className={cn('mt-3 mb-2 flex flex-col gap-2', className)}>
        <div
          className={cn(
            'grid gap-2',
            isSingle
              ? 'grid-cols-1'
              : items.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2 md:grid-cols-3'
          )}
        >
          {items.map((item, idx) => {
            const srcSet = item.urlsByWidth
              ? Object.entries(item.urlsByWidth)
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([w, u]) => `${u} ${w}w`)
                  .join(', ')
              : undefined
            const aspect =
              item.width && item.height ? item.width / item.height : undefined
            return (
              <button
                key={item.id}
                type='button'
                className={cn(
                  'relative overflow-hidden rounded-md border border-border/60 bg-muted/10',
                  isSingle ? 'w-full' : 'w-full'
                )}
                onClick={() => {
                  // Open fullscreen by dispatching a custom event with note + index
                  const detail = { noteId, index: idx }
                  window.dispatchEvent(
                    new CustomEvent('gn:open-image-viewer', { detail })
                  )
                }}
                aria-label='Open attachment'
              >
                <div
                  className={cn(
                    'w-full',
                    // Reserve vertical space to avoid CLS when we know the ratio
                    aspect ? 'aspect-[var(--ratio)]' : ''
                  )}
                  style={
                    aspect ? ({ ['--ratio' as any]: `${aspect}` } as any) : {}
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    {...(srcSet ? { srcSet } : {})}
                    sizes={sizes}
                    src={
                      // Prefer largest available as src fallback
                      srcSet
                        ? Object.entries(item.urlsByWidth || {}).sort(
                            (a, b) => Number(b[0]) - Number(a[0])
                          )[0]?.[1] || item.url
                        : item.url
                    }
                    alt='attachment'
                    loading='lazy'
                    className='w-full h-auto object-contain max-h-[70vh] bg-background'
                    onError={() => {
                      // Clear any cached widths and retry on next render
                      Object.keys(item.urlsByWidth || {}).forEach(w =>
                        urlCacheRef.current.delete(
                          `${item.path}:w=${w}:contain`
                        )
                      )
                      setTimeout(() => load(), 800)
                    }}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* Fullscreen viewer */}
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className='w-screen h-screen max-w-none p-0 bg-black/90 border-none flex items-center justify-center'>
            {activeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeUrl}
                alt='attachment'
                className='max-w-[98vw] max-h-[98vh] object-contain'
              />
            ) : (
              <div className='text-muted-foreground'>Loading…</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Default: thumbnail grid (input/editor)
  return (
    <div className={cn('mb-3 flex gap-2 flex-wrap', className)}>
      {items.map(item => (
        <div
          key={item.id}
          className='relative w-24 h-24 rounded-md overflow-hidden border border-border/60 bg-muted/30'
        >
          {item.url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt='attachment'
                className='w-full h-full object-cover'
                onError={e => {
                  console.warn('Failed to load image:', item.path)
                  // Clear cache entry for this path and trigger a refresh
                  const cacheKey = `${item.path}:transform`
                  const plainKey = `${item.path}:plain`
                  urlCacheRef.current.delete(cacheKey)
                  urlCacheRef.current.delete(plainKey)
                  // Retry with exponential backoff
                  setTimeout(() => load(), 1000)
                }}
                loading='lazy'
              />
            </>
          ) : (
            // Fallback for items without URLs
            <div className='w-full h-full bg-muted/50 flex items-center justify-center'>
              <div className='text-xs text-muted-foreground'>Loading...</div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
