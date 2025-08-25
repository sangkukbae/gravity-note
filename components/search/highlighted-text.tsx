'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface HighlightedTextProps {
  /** Text content with <mark> tags for highlighting */
  text: string | null
  /** CSS class name for the container */
  className?: string
  /** CSS class name for highlighted text */
  highlightClassName?: string
  /** Maximum length before truncating */
  maxLength?: number
  /** Whether to show ellipsis when truncated */
  showEllipsis?: boolean
}

/**
 * Component to render text with search term highlighting
 * Converts <mark> tags to styled spans for proper highlighting
 */
export function HighlightedText({
  text,
  className,
  highlightClassName = 'bg-yellow-200 dark:bg-yellow-800 px-1 rounded',
  maxLength,
  showEllipsis = true,
}: HighlightedTextProps) {
  const processedContent = useMemo(() => {
    if (!text) return null

    let processedText = text

    // Truncate if maxLength is specified
    if (maxLength && text.length > maxLength) {
      // Try to truncate at a word boundary
      const truncated = text.substring(0, maxLength)
      const lastSpace = truncated.lastIndexOf(' ')

      if (lastSpace > maxLength * 0.8) {
        // If we have a good word boundary, use it
        processedText = truncated.substring(0, lastSpace)
      } else {
        // Otherwise, just truncate at maxLength
        processedText = truncated
      }

      if (showEllipsis) {
        processedText += '...'
      }
    }

    // Split by <mark> tags and process
    const parts = processedText.split(/(<mark>.*?<\/mark>)/g)

    return parts
      .map((part, index) => {
        if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
          // Extract text between mark tags
          const markedText = part.substring(6, part.length - 7)
          return (
            <span key={index} className={highlightClassName}>
              {markedText}
            </span>
          )
        }
        return part || null
      })
      .filter(Boolean)
  }, [text, maxLength, showEllipsis, highlightClassName])

  if (!processedContent) return null

  return <span className={cn('', className)}>{processedContent}</span>
}

/**
 * Utility function to strip HTML tags from highlighted text
 * Useful for getting plain text content
 */
export function stripHighlights(text: string | null): string {
  if (!text) return ''
  return text.replace(/<mark>/g, '').replace(/<\/mark>/g, '')
}

/**
 * Utility function to count the number of highlighted terms
 */
export function countHighlights(text: string | null): number {
  if (!text) return 0
  const matches = text.match(/<mark>/g)
  return matches ? matches.length : 0
}
