'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface NoteAttachmentsProps {
  noteId: string
  className?: string
  max?: number
}

interface AttachmentItem {
  id: string
  path: string
  url?: string
}

export function NoteAttachments({
  noteId,
  className,
  max = 4,
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

  const load = useCallback(async () => {
    setIsLoading(true)
    setHasError(false)

    try {
      const { data, error } = await (supabaseRef.current as any)
        .from('note_attachments')
        .select('id, storage_path')
        .eq('note_id', noteId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const rows = (data || []) as Array<{ id: string; storage_path: string }>
      const limited = rows.slice(0, max)

      // Create signed URLs with caching and longer expiry
      const signed: AttachmentItem[] = []
      for (const r of limited) {
        // Prefer transformed thumbnail; fall back to raw if transform not available
        const withTransform = await createSignedUrlWithCache(
          r.storage_path,
          true
        )

        if (!withTransform.error && withTransform.data?.signedUrl) {
          signed.push({
            id: r.id,
            path: r.storage_path,
            url: withTransform.data.signedUrl,
          })
          continue
        }

        const plain = await createSignedUrlWithCache(r.storage_path, false)
        if (!plain.error && plain.data?.signedUrl) {
          signed.push({
            id: r.id,
            path: r.storage_path,
            url: plain.data.signedUrl,
          })
        } else {
          signed.push({ id: r.id, path: r.storage_path })
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

    const client = supabaseRef.current as any
    const channel = client
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
      client.removeChannel(channel)
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
