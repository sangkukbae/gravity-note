'use client'

import { useCallback, useRef, useEffect, useState } from 'react'

interface UseInfiniteScrollOptions {
  loadMore?: (() => Promise<void>) | undefined
  hasMore?: boolean
  threshold?: number
  rootMargin?: string
  disabled?: boolean
}

export function useInfiniteScroll({
  loadMore,
  hasMore = false,
  threshold = 0.1,
  rootMargin = '100px',
  disabled = false,
}: UseInfiniteScrollOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef(false)

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (disabled || isLoading || !hasMore) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver(
        async entries => {
          if (
            entries.length > 0 &&
            entries[0]?.isIntersecting &&
            !loadingRef.current &&
            hasMore &&
            loadMore
          ) {
            loadingRef.current = true
            setIsLoading(true)

            try {
              await loadMore()
            } catch (error) {
              console.error('Error loading more items:', error)
            } finally {
              setIsLoading(false)
              loadingRef.current = false
            }
          }
        },
        {
          threshold,
          rootMargin,
        }
      )

      if (node) observerRef.current.observe(node)
    },
    [disabled, isLoading, hasMore, loadMore, threshold, rootMargin]
  )

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return { lastElementRef, isLoading }
}
