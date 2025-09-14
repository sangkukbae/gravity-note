/**
 * Parser for @-mention tokens in note content
 * Supports simplified token formats: @[note-id] and @{title:id}
 */

export interface MentionToken {
  /** The raw text that was matched */
  raw: string
  /** Start position in the text */
  start: number
  /** End position in the text */
  end: number
  /** Note ID */
  id: string
  /** Display label (note title or ID) */
  label: string
  /** Token type */
  type: 'id-only' | 'title-with-id'
}

export interface ParseResult {
  /** Original text */
  text: string
  /** Array of mention tokens found */
  mentions: MentionToken[]
  /** Text with mentions removed (for search purposes) */
  plainText: string
}

/**
 * Regular expressions for matching mention tokens
 * @[note-id] - Simple ID-only format
 * @{title:id} - Title with ID format
 *
 * Important: These patterns are designed to match exactly without capturing
 * surrounding whitespace that could cause rendering issues.
 */
const MENTION_PATTERNS = {
  idOnly: /@\[([a-zA-Z0-9-]+)\]/g,
  titleWithId: /@\{([^:]+?):([a-zA-Z0-9-]+)\}/g, // Non-greedy match for title to avoid issues
}

/**
 * Parse text content for mention tokens
 */
export function parseMentions(text: string): ParseResult {
  const mentions: MentionToken[] = []

  // Find all @[id] mentions
  let match
  const idOnlyRegex = new RegExp(MENTION_PATTERNS.idOnly.source, 'g')
  while ((match = idOnlyRegex.exec(text)) !== null) {
    mentions.push({
      raw: match[0],
      start: match.index,
      end: match.index + match[0].length,
      id: match[1] || '',
      label: match[1] || '', // Use ID as label for simple format
      type: 'id-only',
    })
  }

  // Find all @{title:id} mentions
  const titleWithIdRegex = new RegExp(MENTION_PATTERNS.titleWithId.source, 'g')
  while ((match = titleWithIdRegex.exec(text)) !== null) {
    mentions.push({
      raw: match[0],
      start: match.index,
      end: match.index + match[0].length,
      id: match[2] || '',
      label: match[1] || '', // Use title as label
      type: 'title-with-id',
    })
  }

  // Sort mentions by position
  mentions.sort((a, b) => a.start - b.start)

  // Create plain text version (mentions removed)
  let plainText = text
  for (let i = mentions.length - 1; i >= 0; i--) {
    const mention = mentions[i]
    if (mention) {
      plainText =
        plainText.slice(0, mention.start) + plainText.slice(mention.end)
    }
  }

  return {
    text,
    mentions,
    plainText,
  }
}

/**
 * Generate a smart title from content if no title provided
 */
function generateTitleFromContent(content: string, maxLength = 30): string {
  const cleaned = content.replace(/\n/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned

  // Try to break at word boundaries
  const truncated = cleaned.slice(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')

  if (lastSpaceIndex > maxLength * 0.6) {
    return truncated.slice(0, lastSpaceIndex).trim()
  }

  return truncated.trim()
}

/**
 * Create a mention token for insertion into text
 */
export function createMentionToken(
  noteId: string,
  title?: string | null,
  content?: string
): string {
  // Use provided title if available
  if (title && title.trim()) {
    const cleanTitle = title.trim().replace(/[{}:]/g, '') // Remove problematic characters
    return `@{${cleanTitle}:${noteId}}`
  }

  // Generate title from content if available
  if (content && content.trim()) {
    const generatedTitle = generateTitleFromContent(content)
    if (generatedTitle) {
      const cleanTitle = generatedTitle.replace(/[{}:]/g, '')
      return `@{${cleanTitle}:${noteId}}`
    }
  }

  // Use simple id format as fallback
  return `@[${noteId}]`
}

/**
 * Insert a mention token into text at a specific position
 */
export function insertMentionIntoText(
  text: string,
  position: number,
  noteId: string,
  title?: string,
  replaceLength = 0
): string {
  const token = createMentionToken(noteId, title)
  const before = text.slice(0, position)
  const after = text.slice(position + replaceLength)
  return before + token + after
}

/**
 * Check if a character position is within a mention token
 */
export function isPositionInMention(text: string, position: number): boolean {
  const parsed = parseMentions(text)
  return parsed.mentions.some(
    mention => position >= mention.start && position <= mention.end
  )
}

/**
 * Get the mention token at a specific position
 */
export function getMentionAtPosition(
  text: string,
  position: number
): MentionToken | null {
  const parsed = parseMentions(text)
  return (
    parsed.mentions.find(
      mention => position >= mention.start && position <= mention.end
    ) || null
  )
}
