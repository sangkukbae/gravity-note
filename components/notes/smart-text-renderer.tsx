'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { EnhancedTextRenderer } from './enhanced-text-renderer'
import { MarkdownRenderer } from './markdown-renderer'
import { MentionLink } from '@/components/mentions/mention-link'
import { parseMentions } from '@/lib/mentions/parser'

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
 * Render text content with mentions as React elements
 */
function renderContentWithMentions(content: string): React.ReactNode[] {
  const parsed = parseMentions(content)

  if (parsed.mentions.length === 0) {
    return [content]
  }

  const elements: React.ReactNode[] = []
  let lastEnd = 0

  parsed.mentions.forEach((mention, index) => {
    // Add text before the mention - preserve whitespace for inline flow
    if (mention.start > lastEnd) {
      const textBefore = content.slice(lastEnd, mention.start)
      if (textBefore) {
        elements.push(textBefore)
      }
    }

    // Add the mention component with key that ensures proper inline rendering
    elements.push(
      <MentionLink
        key={`mention-${mention.id}-${index}-${mention.start}`}
        noteId={mention.id}
        label={mention.label}
        className='inline-flex items-center align-baseline m-0'
      />
    )

    lastEnd = mention.end
  })

  // Add remaining text after the last mention
  if (lastEnd < content.length) {
    const textAfter = content.slice(lastEnd)
    if (textAfter) {
      elements.push(textAfter)
    }
  }

  return elements
}

/**
 * Smart text renderer that provides backward compatibility and intelligent format detection.
 *
 * This component acts as a bridge between the legacy EnhancedTextRenderer and the new
 * MarkdownRenderer, ensuring existing plain text notes continue to work while enabling
 * rich markdown formatting for new content.
 *
 * Detection Strategy:
 * 1. Parse @-mentions first and replace with components
 * 2. Check for common markdown patterns
 * 3. Default to legacy renderer for safety (backward compatibility)
 * 4. Allow manual override via props for testing
 *
 * Features:
 * - Full backward compatibility with existing notes
 * - @-mention support with hover previews
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
  // Parse mentions and determine rendering strategy
  const { shouldUseMarkdown, hasMentions, parsedMentions } =
    React.useMemo(() => {
      if (!content || typeof content !== 'string') {
        return {
          shouldUseMarkdown: false,
          hasMentions: false,
          parsedMentions: null,
        }
      }

      const mentionsParsed = parseMentions(content)
      const hasMentions = mentionsParsed.mentions.length > 0

      // Skip markdown detection if disabled
      if (disableMarkdown) {
        return {
          shouldUseMarkdown: false,
          hasMentions,
          parsedMentions: mentionsParsed,
        }
      }

      // Force markdown if requested
      if (forceMarkdown) {
        return {
          shouldUseMarkdown: true,
          hasMentions,
          parsedMentions: mentionsParsed,
        }
      }

      // Use plainText for markdown detection to avoid false positives from mention tokens
      const textForDetection = hasMentions ? mentionsParsed.plainText : content

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
      const hasHeader = /(?:^|\n)#{1,6}\s+\S/.test(textForDetection)
      const hasCodeBlock = /(?:^|\n)```[\s\S]*?```/.test(textForDetection)

      if (hasHeader || hasCodeBlock) {
        return {
          shouldUseMarkdown: true,
          hasMentions,
          parsedMentions: mentionsParsed,
        }
      }

      // For other patterns, require multiple matches to avoid false positives
      const matchCount = patterns
        .slice(0, -2)
        .filter(pattern => pattern.test(textForDetection)).length

      return {
        shouldUseMarkdown: matchCount >= 2,
        hasMentions,
        parsedMentions: mentionsParsed,
      }
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
    // For mentions, avoid prose classes that enforce block layout
    hasMentions
      ? 'text-foreground/90 inline leading-normal' // Critical: inline for mentions with proper line height
      : 'prose prose-sm max-w-none text-foreground/90', // Full prose styling for non-mention content
    // Ensure proper text rendering
    'font-feature-settings-default',
    // Handle truncation display - always inline for mentions to prevent line breaks
    hasMentions
      ? 'whitespace-pre-wrap' // Preserve whitespace in mention content
      : !isExpanded && content.length > maxLength
        ? 'inline' // Inline when truncated
        : 'block', // Block when expanded and no mentions
    className
  )

  const containerStyle = {
    // Fine-tune typography for optimal readability
    fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1',
    textRendering: 'optimizeLegibility' as const,
    WebkitFontSmoothing: 'antialiased' as const,
    MozOsxFontSmoothing: 'grayscale' as const,
    // Ensure mentions flow inline without breaking
    ...(hasMentions && {
      display: 'inline',
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'normal' as const,
    }),
  }

  if (shouldUseMarkdown) {
    // For markdown content with mentions, we need to pre-process the mentions
    // and then let markdown handle the rest. For now, we'll render mentions
    // separately as the MarkdownRenderer doesn't support custom React components.
    // Future enhancement: integrate mentions with markdown-to-jsx overrides
    if (hasMentions) {
      const contentWithMentions = renderContentWithMentions(displayContent)
      return (
        <span
          className={cn(containerClass, 'inline')}
          style={{
            ...containerStyle,
            display: 'inline',
            verticalAlign: 'baseline',
          }}
        >
          {/* For now, render mentions without markdown processing for mixed content */}
          {contentWithMentions}
        </span>
      )
    }

    return (
      <div className={containerClass} style={containerStyle}>
        <MarkdownRenderer content={displayContent} />
      </div>
    )
  }

  // For non-markdown content, check if we have mentions to render
  if (hasMentions) {
    const contentWithMentions = renderContentWithMentions(displayContent)
    return (
      <span
        className={cn(containerClass, 'inline')}
        style={{
          ...containerStyle,
          display: 'inline',
          verticalAlign: 'baseline',
        }}
      >
        {contentWithMentions}
      </span>
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
