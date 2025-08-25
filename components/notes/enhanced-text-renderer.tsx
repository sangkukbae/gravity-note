'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { TextFormatter, type FormattedTextSegment } from '@/lib/text-formatting'

interface EnhancedTextRendererProps {
  content: string
  isExpanded?: boolean
  maxLength?: number
  className?: string
}

/**
 * Enhanced text renderer that provides superior readability through:
 * - Intelligent paragraph breaking
 * - Visual hierarchy with headings and lists
 * - Proper typography and spacing
 * - Emphasis and code formatting
 * - Improved scanning with visual structure
 */
export function EnhancedTextRenderer({
  content,
  isExpanded = false,
  maxLength = 300,
  className,
}: EnhancedTextRendererProps) {
  if (!content || typeof content !== 'string') {
    return null
  }

  // Format the text into structured segments
  const allSegments = TextFormatter.formatText(content)

  // Apply truncation if not expanded
  const { segments, isTruncated } = isExpanded
    ? { segments: allSegments, isTruncated: false }
    : TextFormatter.truncateFormattedText(allSegments, maxLength)

  const renderEmphasis = (text: string) => {
    const emphasisSegments = TextFormatter.detectEmphasis(text)

    return emphasisSegments.map((segment, index) => {
      switch (segment.type) {
        case 'bold':
          return (
            <strong key={index} className='font-semibold text-foreground'>
              {segment.content}
            </strong>
          )
        case 'italic':
          return (
            <em key={index} className='italic text-foreground/90'>
              {segment.content}
            </em>
          )
        case 'code':
          return (
            <code
              key={index}
              className='px-1.5 py-0.5 mx-0.5 text-xs bg-muted rounded font-mono text-foreground border'
            >
              {segment.content}
            </code>
          )
        default:
          return <span key={index}>{segment.content}</span>
      }
    })
  }

  const renderSegment = (segment: FormattedTextSegment, index: number) => {
    const key = `segment-${index}`

    switch (segment.type) {
      case 'heading':
        const HeadingTag =
          `h${Math.min(segment.level || 1, 6)}` as keyof JSX.IntrinsicElements
        return (
          <HeadingTag
            key={key}
            className={cn('font-semibold text-foreground leading-tight', {
              'text-lg mb-2 mt-3': segment.level === 1,
              'text-base mb-2 mt-3': segment.level === 2,
              'text-sm mb-1.5 mt-2': segment.level === 3,
              'text-sm mb-1 mt-2': (segment.level || 1) >= 4,
            })}
          >
            {renderEmphasis(segment.content)}
          </HeadingTag>
        )

      case 'list-item':
        return (
          <div key={key} className='flex items-start gap-2 mb-1.5'>
            <span className='text-primary mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-current' />
            <span className='text-sm leading-relaxed text-foreground/90 flex-1'>
              {renderEmphasis(segment.content)}
            </span>
          </div>
        )

      case 'quote':
        return (
          <blockquote
            key={key}
            className='border-l-4 border-primary/30 pl-4 my-3 italic text-foreground/80'
          >
            <span className='text-sm leading-relaxed'>
              {renderEmphasis(segment.content)}
            </span>
          </blockquote>
        )

      case 'code':
        return (
          <pre
            key={key}
            className='bg-muted p-3 rounded-md my-2 overflow-x-auto border'
          >
            <code className='text-xs font-mono text-foreground whitespace-pre'>
              {segment.content}
            </code>
          </pre>
        )

      case 'paragraph':
      default:
        return (
          <p
            key={key}
            className={cn(
              'text-sm leading-relaxed text-foreground/90 mb-3 last:mb-0',
              // Enhanced readability with better line height and spacing
              'sm:text-[15px] sm:leading-[1.7]',
              // Improved paragraph spacing for better visual separation
              'last:mb-0'
            )}
          >
            {renderEmphasis(segment.content)}
          </p>
        )
    }
  }

  return (
    <div
      className={cn(
        // Base container with improved typography
        'prose prose-sm max-w-none',
        // Enhanced readability styles
        'text-foreground/90',
        // Better line spacing and word spacing - adjusted for inline usage
        isTruncated && !isExpanded
          ? '[&>*]:mb-0 [&>*:last-child]:mb-0 inline' // Inline when truncated
          : '[&>*]:mb-3 [&>*:last-child]:mb-0', // Block when expanded
        // Ensure proper text rendering
        'font-feature-settings-default',
        className
      )}
      style={{
        // Fine-tune typography for optimal readability
        fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1',
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      {segments.map(renderSegment)}
      {/* No truncation indicator here - parent will handle it */}
    </div>
  )
}
