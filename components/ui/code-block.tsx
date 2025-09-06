'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  children: string
  className?: string
  /**
   * Language for syntax highlighting
   * Extracted from className prop (e.g., 'language-typescript' -> 'typescript')
   */
  language?: string
}

// Global cache for highlighted code to prevent re-highlighting identical content
const highlightCache = new Map<string, string>()

// Global highlighter instance to avoid recreating (eager, static import)
let globalHighlighter: any = null
let globalHighlighterPromise: Promise<any> | null = null

// Dynamically import Shiki on the client to avoid SSR/CJS require issues
const initHighlighter = () => {
  if (typeof window === 'undefined') return null
  if (!globalHighlighterPromise) {
    globalHighlighterPromise = import('shiki/bundle/web')
      .then(mod => mod.createHighlighter)
      .then(createHighlighter =>
        createHighlighter({
          themes: ['github-light', 'github-dark'],
          langs: [
            'typescript',
            'javascript',
            'jsx',
            'tsx',
            'python',
            'rust',
            'go',
            'java',
            'cpp',
            'c',
            'css',
            'html',
            'json',
            'yaml',
            'markdown',
            'bash',
            'sql',
            'php',
          ],
        })
      )
      .then(h => (globalHighlighter = h))
      .catch(err => {
        // Swallow errors in non-browser/test environments
        console.warn('Failed to initialize Shiki highlighter:', err)
        globalHighlighterPromise = null
      })
  }
  return globalHighlighterPromise
}

/**
 * GitHub-style code block component with syntax highlighting and copy functionality
 * Uses Shiki for syntax highlighting with proper theme integration and stable re-rendering
 */
export const CodeBlock = React.memo(function CodeBlock({
  children,
  className,
  language,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [highlightedCode, setHighlightedCode] = useState<string>('')
  const [isHighlighting, setIsHighlighting] = useState(false)
  const highlightingRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(false)

  // Extract language from className (markdown-to-jsx format: 'language-typescript')
  const detectedLanguage = useMemo<string>(() => {
    if (language && language.trim()) return language
    const match = className?.match(/language-([\w-]+)/)
    return match?.[1] ?? 'typescript'
  }, [className, language])

  // Clean up the code content (remove extra whitespace) - memoized to prevent unnecessary recalculations
  const cleanCode = useMemo(() => children.trim(), [children])

  // Create a stable cache key for this specific code block
  const cacheKey = useMemo(() => {
    return `${cleanCode}:${detectedLanguage}`
  }, [cleanCode, detectedLanguage])

  // Stable highlight function that uses caching and prevents concurrent highlighting
  const highlightCode = useCallback(async () => {
    // Don't highlight if component is unmounted or already highlighting the same content
    if (!mountedRef.current) return

    // Check cache first
    const cachedResult = highlightCache.get(cacheKey)
    if (cachedResult) {
      setHighlightedCode(cachedResult)
      return
    }

    // Prevent concurrent highlighting of the same content
    if (highlightingRef.current) {
      highlightingRef.current.abort()
    }

    const controller = new AbortController()
    highlightingRef.current = controller
    setIsHighlighting(true)

    try {
      // Ensure highlighter is ready (client-only, dynamic import)
      if (!globalHighlighter) {
        await (globalHighlighterPromise ?? initHighlighter())
      }
      const highlighter = globalHighlighter

      // Check if operation was aborted or component unmounted
      if (controller.signal.aborted || !mountedRef.current) {
        return
      }

      const lightHtml = highlighter?.codeToHtml?.(cleanCode, {
        lang: detectedLanguage,
        theme: 'github-light',
      })
      const darkHtml = highlighter?.codeToHtml?.(cleanCode, {
        lang: detectedLanguage,
        theme: 'github-dark',
      })

      // Create dual-theme HTML structure
      const dualThemeHtml = `
        <div class="shiki-light" style="display: var(--shiki-light-display, block);">
          ${lightHtml ?? ''}
        </div>
        <div class="shiki-dark" style="display: var(--shiki-dark-display, none);">
          ${darkHtml ?? ''}
        </div>
      `

      // Final check before setting state
      if (!controller.signal.aborted && mountedRef.current) {
        // Cache the result for future use
        highlightCache.set(cacheKey, dualThemeHtml)
        setHighlightedCode(dualThemeHtml)
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.warn('Shiki highlighting failed:', error)
        setHighlightedCode('')
      }
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setIsHighlighting(false)
        highlightingRef.current = null
      }
    }
  }, [cacheKey, cleanCode, detectedLanguage])

  // Client-side syntax highlighting with stable mounting and caching
  useEffect(() => {
    mountedRef.current = true
    setMounted(true)

    // Initialize highlighter on mount; highlighting runs after ready
    initHighlighter()
    highlightCode()

    return () => {
      mountedRef.current = false
      if (highlightingRef.current) {
        highlightingRef.current.abort()
        highlightingRef.current = null
      }
    }
  }, [highlightCode])

  // Static import + eager init removes the need for additional prewarm hooks

  // Copy to clipboard functionality - memoized to prevent recreation on re-renders
  const copyToClipboard = useCallback(async () => {
    if (!mounted) return

    try {
      await navigator.clipboard.writeText(cleanCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }, [mounted, cleanCode])

  // Prefer showing plain code fallback while highlighting to avoid a visual "loading" state
  const shouldShowFallback = !highlightedCode

  return (
    <div className={cn('code-block-container group relative my-4', className)}>
      {/* Copy button */}
      {mounted && (
        <button
          onClick={copyToClipboard}
          className={cn(
            'copy-button absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center',
            'rounded-md border border-border bg-background/90 backdrop-blur-sm',
            'opacity-0 transition-all duration-200 hover:bg-accent',
            'group-hover:opacity-100 focus:opacity-100',
            'text-muted-foreground hover:text-foreground shadow-sm'
          )}
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <Check className='h-4 w-4' />
          ) : (
            <Copy className='h-4 w-4' />
          )}
        </button>
      )}

      {/* Code block with syntax highlighting */}
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border border-border',
          highlightedCode ? 'bg-muted/50 dark:bg-muted/30' : 'bg-transparent'
        )}
      >
        {mounted && highlightedCode ? (
          // Highlighted code - stable and cached
          <div
            className='shiki-container overflow-x-auto text-sm [&_pre]:!bg-transparent [&_pre]:!p-4 [&_pre]:!m-0 [&_pre]:!border-0'
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        ) : shouldShowFallback ? (
          // Fallback for SSR, initial load, or failed highlighting - only show when necessary
          <pre
            className={cn(
              'overflow-x-auto p-4 text-sm font-mono',
              'text-foreground bg-transparent',
              'whitespace-pre-wrap break-all'
            )}
          >
            <code className='text-inherit bg-transparent'>{cleanCode}</code>
          </pre>
        ) : null}
      </div>
    </div>
  )
})

interface InlineCodeProps {
  children: string
  className?: string
}

/**
 * Inline code component for single-line code snippets
 */
export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code
      className={cn(
        'relative rounded bg-muted px-1.5 py-0.5 font-mono text-sm',
        'text-foreground border border-border/50',
        className
      )}
    >
      {children}
    </code>
  )
}
