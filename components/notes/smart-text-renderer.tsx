'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { EnhancedTextRenderer } from './enhanced-text-renderer'
import { MarkdownRenderer } from './markdown-renderer'

// Imports validated - ready for use

interface SmartTextRendererProps {
  content: string
  isExpanded?: boolean
  maxLength?: number
  className?: string
  /** Force markdown rendering even if no markdown detected */
  forceMarkdown?: boolean
  /** Disable markdown rendering, use legacy formatter only */
  disableMarkdown?: boolean
}

/**
 * Smart text renderer that provides backward compatibility and intelligent format detection.
 *
 * This component acts as a bridge between the legacy EnhancedTextRenderer and the new
 * MarkdownRenderer, ensuring existing plain text notes continue to work while enabling
 * rich markdown formatting for new content.
 *
 * Detection Strategy:
 * 1. Check for common markdown patterns
 * 2. Default to legacy renderer for safety (backward compatibility)
 * 3. Allow manual override via props for testing
 *
 * Features:
 * - Full backward compatibility with existing notes
 * - Intelligent markdown detection
 * - Consistent styling between renderers
 * - Truncation support for both formats
 * - Safe fallback behavior
 */
export const SmartTextRenderer = React.memo(function SmartTextRenderer({
  content,
  isExpanded = false,
  maxLength = 300,
  className,
  forceMarkdown = false,
  disableMarkdown = false,
}: SmartTextRendererProps) {
  // Enhanced markdown detection with more patterns
  const shouldUseMarkdown = React.useMemo(() => {
    if (!content || typeof content !== 'string') {
      return false
    }

    // Skip detection if disabled
    if (disableMarkdown) return false

    // Force markdown if requested
    if (forceMarkdown) return true

    // Look for common markdown patterns - be conservative to preserve backward compatibility
    const patterns = [
      /(?:^|\n)#{1,6}\s+\S/, // Headers: # ## ### etc. (must have content after space)
      /(?:^|\n)\s*[-*+]\s+\S/, // Unordered lists: - * + (must have content after space)
      /(?:^|\n)\s*\d+\.\s+\S/, // Ordered lists: 1. 2. etc. (must have content after space)
      /\*\*\S[^*]*\S\*\*/, // Bold: **text** (must have non-space content)
      /`[^`\s][^`]*[^`\s]?`/, // Inline code: `code` (at least one non-space char)
      /(?:^|\n)```[\s\S]*?```/, // Code blocks: ```code```
      /(?:^|\n)>\s+\S/, // Blockquotes: > text (must have content after space)
      /(?:^|\n)---{3,}/, // Horizontal rules: --- (at least 3 dashes)
      /\[[^\]]+\]\([^)]+\)/, // Links: [text](url) (both parts must have content)
    ]

    // Very conservative detection - only trigger on clear markdown indicators
    // Single headers or code blocks are strong indicators
    const hasHeader = /(?:^|\n)#{1,6}\s+\S/.test(content)
    const hasCodeBlock = /(?:^|\n)```[\s\S]*?```/.test(content)

    if (hasHeader || hasCodeBlock) {
      return true
    }

    // For other patterns, require multiple matches to avoid false positives
    const matchCount = patterns
      .slice(0, -2)
      .filter(pattern => pattern.test(content)).length
    return matchCount >= 2
  }, [content, disableMarkdown, forceMarkdown])

  // Handle truncation at the component level for consistency
  const displayContent = React.useMemo(() => {
    if (!content || typeof content !== 'string') {
      return ''
    }

    if (isExpanded || content.length <= maxLength) {
      return content
    }

    // Smart truncation at word boundaries
    let truncateAt = maxLength
    while (
      truncateAt > 0 &&
      content[truncateAt] !== ' ' &&
      content[truncateAt] !== '\n'
    ) {
      truncateAt--
    }

    // If no good break point found, use the limit
    if (truncateAt === 0) {
      truncateAt = maxLength
    }

    return content.substring(0, truncateAt).trim() + '...'
  }, [content, isExpanded, maxLength])

  if (!content || typeof content !== 'string') {
    return null
  }

  // Container styling that's consistent between renderers
  const containerClass = cn(
    // Base container with improved typography
    'prose prose-sm max-w-none',
    // Enhanced readability styles
    'text-foreground/90',
    // Ensure proper text rendering
    'font-feature-settings-default',
    // Handle truncation display
    !isExpanded && content.length > maxLength
      ? 'inline' // Inline when truncated
      : 'block', // Block when expanded
    className
  )

  const containerStyle = {
    // Fine-tune typography for optimal readability
    fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1',
    textRendering: 'optimizeLegibility' as const,
    WebkitFontSmoothing: 'antialiased' as const,
    MozOsxFontSmoothing: 'grayscale' as const,
  }

  if (shouldUseMarkdown) {
    return (
      <div className={containerClass} style={containerStyle}>
        <MarkdownRenderer content={displayContent} />
      </div>
    )
  }

  // Fallback to legacy renderer for maximum compatibility
  return (
    <EnhancedTextRenderer
      content={displayContent}
      isExpanded={isExpanded}
      maxLength={maxLength}
      className={className || ''}
    />
  )
})
