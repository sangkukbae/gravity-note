/**
 * Text formatting utilities for enhanced note readability
 * Provides intelligent text processing for better visual hierarchy and scanning
 */

export interface FormattedTextSegment {
  type: 'paragraph' | 'list-item' | 'emphasis' | 'code' | 'heading' | 'quote'
  content: string
  level?: number // For headings (1-6) or list nesting
}

/**
 * Enhanced text processor that improves readability through intelligent formatting
 */
export class TextFormatter {
  /**
   * Process raw text and return structured segments for better display
   */
  static formatText(text: string): FormattedTextSegment[] {
    if (!text || typeof text !== 'string') return []

    const segments: FormattedTextSegment[] = []

    // Split by double newlines to create paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim()

      // Detect different content types
      if (this.isHeading(trimmed)) {
        segments.push(this.createHeading(trimmed))
      } else if (this.isList(trimmed)) {
        segments.push(...this.createListItems(trimmed))
      } else if (this.isQuote(trimmed)) {
        segments.push(this.createQuote(trimmed))
      } else if (this.isCodeBlock(trimmed)) {
        segments.push(this.createCodeBlock(trimmed))
      } else {
        // Regular paragraph - split long paragraphs for better readability
        segments.push(...this.createParagraphs(trimmed))
      }
    }

    return segments
  }

  /**
   * Check if text is a heading (starts with #)
   */
  private static isHeading(text: string): boolean {
    return /^#{1,6}\s+/.test(text)
  }

  /**
   * Check if text is a list (starts with -, *, +, or numbers)
   */
  private static isList(text: string): boolean {
    return /^[\s]*[-*+•]\s+/.test(text) || /^[\s]*\d+[.)]\s+/.test(text)
  }

  /**
   * Check if text is a quote (starts with >)
   */
  private static isQuote(text: string): boolean {
    return /^>\s+/.test(text)
  }

  /**
   * Check if text is a code block (wrapped in ``` or has consistent indentation)
   */
  private static isCodeBlock(text: string): boolean {
    return /^```/.test(text) || /^    /.test(text)
  }

  /**
   * Create heading segment
   */
  private static createHeading(text: string): FormattedTextSegment {
    const match = text.match(/^(#{1,6})\s+(.+)/)
    if (match && match[1] && match[2]) {
      return {
        type: 'heading',
        level: match[1].length,
        content: match[2],
      }
    }
    return { type: 'paragraph', content: text }
  }

  /**
   * Create list item segments
   */
  private static createListItems(text: string): FormattedTextSegment[] {
    const lines = text.split('\n')
    return lines
      .filter(line => line.trim().length > 0)
      .map(line => {
        const cleaned = line
          .replace(/^[\s]*[-*+•]\s+/, '')
          .replace(/^[\s]*\d+[.)]\s+/, '')
        return {
          type: 'list-item' as const,
          content: cleaned,
        }
      })
  }

  /**
   * Create quote segment
   */
  private static createQuote(text: string): FormattedTextSegment {
    const cleaned = text.replace(/^>\s+/, '')
    return {
      type: 'quote',
      content: cleaned,
    }
  }

  /**
   * Create code block segment
   */
  private static createCodeBlock(text: string): FormattedTextSegment {
    const cleaned = text.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
    return {
      type: 'code',
      content: cleaned,
    }
  }

  /**
   * Create paragraph segments with intelligent line breaking
   */
  private static createParagraphs(text: string): FormattedTextSegment[] {
    // Split very long paragraphs at sentence boundaries for better readability
    const sentences = this.splitIntoSentences(text)
    const paragraphs: FormattedTextSegment[] = []

    let currentParagraph = ''
    const maxParagraphLength = 400 // Characters

    for (const sentence of sentences) {
      if (
        currentParagraph.length + sentence.length > maxParagraphLength &&
        currentParagraph.length > 0
      ) {
        paragraphs.push({
          type: 'paragraph',
          content: currentParagraph.trim(),
        })
        currentParagraph = sentence
      } else {
        currentParagraph += (currentParagraph ? ' ' : '') + sentence
      }
    }

    if (currentParagraph.trim()) {
      paragraphs.push({
        type: 'paragraph',
        content: currentParagraph.trim(),
      })
    }

    return paragraphs
  }

  /**
   * Split text into sentences for intelligent paragraph breaking
   */
  private static splitIntoSentences(text: string): string[] {
    // Simple sentence detection - can be enhanced for better accuracy
    const sentences = text.split(/(?<=[.!?])\s+/)
    return sentences.filter(sentence => sentence.trim().length > 0)
  }

  /**
   * Apply emphasis detection within text (bold, italic)
   */
  static detectEmphasis(
    text: string
  ): Array<{ type: 'text' | 'bold' | 'italic' | 'code'; content: string }> {
    const segments = []
    let current = ''
    let i = 0

    while (i < text.length) {
      // Detect **bold**
      if (text.substr(i, 2) === '**') {
        if (current) {
          segments.push({ type: 'text' as const, content: current })
          current = ''
        }
        i += 2
        let boldContent = ''
        while (i < text.length - 1 && text.substr(i, 2) !== '**') {
          boldContent += text[i]
          i++
        }
        if (i < text.length - 1) {
          segments.push({ type: 'bold' as const, content: boldContent })
          i += 2
        } else {
          current += '**' + boldContent
        }
      }
      // Detect *italic*
      else if (text[i] === '*' && text[i + 1] !== '*') {
        if (current) {
          segments.push({ type: 'text' as const, content: current })
          current = ''
        }
        i++
        let italicContent = ''
        while (i < text.length && text[i] !== '*') {
          italicContent += text[i]
          i++
        }
        if (i < text.length) {
          segments.push({ type: 'italic' as const, content: italicContent })
          i++
        } else {
          current += '*' + italicContent
        }
      }
      // Detect `code`
      else if (text[i] === '`') {
        if (current) {
          segments.push({ type: 'text' as const, content: current })
          current = ''
        }
        i++
        let codeContent = ''
        while (i < text.length && text[i] !== '`') {
          codeContent += text[i]
          i++
        }
        if (i < text.length) {
          segments.push({ type: 'code' as const, content: codeContent })
          i++
        } else {
          current += '`' + codeContent
        }
      } else {
        current += text[i]
        i++
      }
    }

    if (current) {
      segments.push({ type: 'text' as const, content: current })
    }

    return segments
  }

  /**
   * Utility to truncate formatted text while preserving structure
   */
  static truncateFormattedText(
    segments: FormattedTextSegment[],
    maxLength: number
  ): { segments: FormattedTextSegment[]; isTruncated: boolean } {
    let totalLength = 0
    const result: FormattedTextSegment[] = []

    for (const segment of segments) {
      if (totalLength + segment.content.length <= maxLength) {
        result.push(segment)
        totalLength += segment.content.length
      } else {
        const remainingLength = maxLength - totalLength
        if (remainingLength > 50) {
          // Only include if we have reasonable space
          result.push({
            ...segment,
            content:
              segment.content.substring(0, remainingLength).trim() + '...',
          })
        }
        return { segments: result, isTruncated: true }
      }
    }

    return { segments: result, isTruncated: false }
  }
}
