/**
 * Test suite for the markdown implementation
 *
 * This test suite validates that:
 * 1. Plain text notes continue to work exactly as before (backward compatibility)
 * 2. Markdown notes are properly detected and rendered
 * 3. The SmartTextRenderer correctly chooses between renderers
 * 4. No regressions in existing functionality
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SmartTextRenderer } from '@/components/notes/smart-text-renderer'
import { MarkdownRenderer } from '@/components/notes/markdown-renderer'

describe('Markdown Implementation', () => {
  describe('SmartTextRenderer', () => {
    it('should render plain text without markdown detection', () => {
      const plainText = 'This is just plain text without any markdown.'
      render(<SmartTextRenderer content={plainText} />)

      expect(screen.getByText(plainText)).toBeInTheDocument()
    })

    it('should detect and render markdown headers', () => {
      const markdownText = '# This is a header\n\nThis is regular text.'
      render(<SmartTextRenderer content={markdownText} />)

      // Should have a heading element
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getByText('This is a header')).toBeInTheDocument()
    })

    it('should detect and render markdown lists', () => {
      const markdownText = `
- Item 1
- Item 2
- Item 3
      `.trim()

      render(<SmartTextRenderer content={markdownText} />)

      // Should detect as markdown and render list items
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()
    })

    it('should detect and render bold text', () => {
      const markdownText = 'This has **bold text** in it.'
      render(<SmartTextRenderer content={markdownText} />)

      const boldElement = screen.getByText('bold text')
      expect(boldElement).toBeInTheDocument()
      expect(boldElement.tagName).toBe('STRONG')
    })

    it('should detect and render inline code', () => {
      const markdownText = 'Use the `console.log()` function.'
      render(<SmartTextRenderer content={markdownText} />)

      const codeElement = screen.getByText('console.log()')
      expect(codeElement).toBeInTheDocument()
      expect(codeElement.tagName).toBe('CODE')
    })

    it('should handle mixed content (markdown + plain text)', () => {
      const mixedText = `# Header

This is a paragraph with **bold** and *italic* text.

Regular text here.`

      render(<SmartTextRenderer content={mixedText} />)

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getByText('bold')).toBeInTheDocument()
      expect(screen.getByText('italic')).toBeInTheDocument()
    })

    it('should respect forceMarkdown prop', () => {
      const plainText = 'Just plain text'
      render(<SmartTextRenderer content={plainText} forceMarkdown={true} />)

      // Should still render the text even when forced to use markdown
      expect(screen.getByText(plainText)).toBeInTheDocument()
    })

    it('should respect disableMarkdown prop', () => {
      const markdownText = '# This should not be a header'
      render(
        <SmartTextRenderer content={markdownText} disableMarkdown={true} />
      )

      // Should render as plain text, not as heading
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
      expect(
        screen.getByText('# This should not be a header')
      ).toBeInTheDocument()
    })

    it('should handle truncation correctly', () => {
      const longText = 'A'.repeat(500)
      render(
        <SmartTextRenderer
          content={longText}
          maxLength={100}
          isExpanded={false}
        />
      )

      // Should be truncated
      const renderedText = screen.getByText(/A+\.\.\./)
      expect(renderedText).toBeInTheDocument()
    })

    it('should handle empty content gracefully', () => {
      render(<SmartTextRenderer content='' />)

      // Should not crash and should not render anything
      expect(screen.queryByText(/./)).not.toBeInTheDocument()
    })
  })

  describe('MarkdownRenderer', () => {
    it('should render plain text as fallback', () => {
      const plainText = 'Just plain text here'
      render(<MarkdownRenderer content={plainText} />)

      expect(screen.getByText(plainText)).toBeInTheDocument()
    })

    it('should render markdown headings with correct styling', () => {
      const markdown = '# Heading 1\n## Heading 2\n### Heading 3'
      render(<MarkdownRenderer content={markdown} />)

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Heading 1'
      )
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'Heading 2'
      )
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
        'Heading 3'
      )
    })

    it('should sanitize dangerous links', () => {
      const dangerousMarkdown = '[Click me](javascript:alert("xss"))'
      render(<MarkdownRenderer content={dangerousMarkdown} />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '#')
    })

    it('should handle external links correctly', () => {
      const externalLink = '[External](https://example.com)'
      render(<MarkdownRenderer content={externalLink} />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', 'https://example.com')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('Backward Compatibility', () => {
    it('should preserve existing plain text behavior', () => {
      // Test common plain text patterns that should NOT be detected as markdown
      const testCases = [
        'Simple sentence.',
        'Text with numbers 1. 2. 3.',
        'Text with * asterisks * but not markdown.',
        'Text with # but not at start.',
        'Some text\nwith line breaks\nbut no markdown.',
        'Code like console.log() but without backticks.',
      ]

      testCases.forEach(text => {
        const { unmount } = render(<SmartTextRenderer content={text} />)
        expect(screen.getByText(text)).toBeInTheDocument()
        unmount()
      })
    })

    it('should handle edge cases without crashing', () => {
      const edgeCases = [
        '',
        '   ',
        '\n\n\n',
        '# ',
        '* ',
        '`',
        '**',
        '[]()',
        'Text with émojis 🚀 and ünïcødé',
      ]

      edgeCases.forEach(text => {
        expect(() => {
          const { unmount } = render(<SmartTextRenderer content={text} />)
          unmount()
        }).not.toThrow()
      })
    })
  })
})
