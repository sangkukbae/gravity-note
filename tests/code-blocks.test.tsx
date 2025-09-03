/**
 * Tests for GitHub-style Code Block implementation
 * Tests the integration between MarkdownRenderer and CodeBlock components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from './utils/test-utils'
import { MarkdownRenderer } from '@/components/notes/markdown-renderer'
import { CodeBlock, InlineCode } from '@/components/ui/code-block'

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
})

describe('GitHub-style Code Blocks', () => {
  beforeEach(() => {
    // Clear clipboard mock before each test
    ;(navigator.clipboard.writeText as unknown as Mock).mockClear()
  })

  describe('CodeBlock Component', () => {
    it('renders TypeScript code with proper syntax highlighting setup', () => {
      const typescriptCode = `interface User {
  id: string;
  name: string;
}

function createUser(data: Partial<User>): User {
  return { id: '1', name: data.name || 'Anonymous' };
}`

      render(
        <CodeBlock className='language-typescript'>{typescriptCode}</CodeBlock>
      )

      // Should render the code content
      expect(screen.getByText(/interface User/)).toBeInTheDocument()
      expect(screen.getByText(/function createUser/)).toBeInTheDocument()
    })

    it('renders JavaScript code with proper language detection', () => {
      const jsCode = `const fetchData = async (url) => {
  const response = await fetch(url);
  return response.json();
};`

      render(<CodeBlock className='language-javascript'>{jsCode}</CodeBlock>)

      expect(screen.getByText(/const fetchData/)).toBeInTheDocument()
      expect(screen.getByText(/await fetch/)).toBeInTheDocument()
    })

    it('shows copy button on hover and handles copy functionality', async () => {
      const code = 'console.log("Hello, World!");'

      render(<CodeBlock className='language-javascript'>{code}</CodeBlock>)

      // Copy button should be present but initially hidden
      const copyButton = screen.getByRole('button', { name: /copy code/i })
      expect(copyButton).toBeInTheDocument()

      // Click the copy button
      fireEvent.click(copyButton)

      // Should call clipboard API
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(code)
      })

      // Button text should change to indicate success
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /copied/i })
        ).toBeInTheDocument()
      })
    })

    it('handles language detection from className', () => {
      const pythonCode = `def hello_world():
    print("Hello, World!")
    return "success"`

      const { container } = render(
        <CodeBlock className='language-python'>{pythonCode}</CodeBlock>
      )

      // Should render code content regardless of highlighting
      expect(container.textContent).toContain('def hello_world')
    })

    it('provides fallback for unknown languages', () => {
      const unknownCode = 'some unknown syntax here'

      render(<CodeBlock className='language-unknown'>{unknownCode}</CodeBlock>)

      expect(screen.getByText(unknownCode)).toBeInTheDocument()
    })
  })

  describe('InlineCode Component', () => {
    it('renders inline code with proper styling', () => {
      const inlineCode = 'const x = 42;'

      render(<InlineCode>{inlineCode}</InlineCode>)

      const codeElement = screen.getByText(inlineCode)
      expect(codeElement).toBeInTheDocument()
      expect(codeElement.tagName).toBe('CODE')
    })
  })

  describe('MarkdownRenderer Integration', () => {
    it('renders fenced code blocks with syntax highlighting', () => {
      const markdown = `# Code Example

Here's some TypeScript:

\`\`\`typescript
interface User {
  id: string;
  name: string;
}

function createUser(name: string): User {
  return { id: generateId(), name };
}
\`\`\`

And that's it!`

      render(<MarkdownRenderer content={markdown} />)

      // Should render the heading
      expect(screen.getByText('Code Example')).toBeInTheDocument()

      // Should render the code block
      expect(screen.getByText(/interface User/)).toBeInTheDocument()
      expect(screen.getByText(/function createUser/)).toBeInTheDocument()

      // Should have copy button
      expect(
        screen.getByRole('button', { name: /copy code/i })
      ).toBeInTheDocument()
    })

    it('renders multiple code blocks with different languages', () => {
      const markdown = `# Multi-Language Example

TypeScript:
\`\`\`typescript
const greeting: string = "Hello";
\`\`\`

Python:
\`\`\`python
def greet(name):
    return f"Hello, {name}!"
\`\`\``

      render(<MarkdownRenderer content={markdown} />)

      // Should render both code blocks
      expect(screen.getByText(/const greeting/)).toBeInTheDocument()
      expect(screen.getByText(/def greet/)).toBeInTheDocument()

      // Should have multiple copy buttons
      const copyButtons = screen.getAllByRole('button', { name: /copy code/i })
      expect(copyButtons).toHaveLength(2)
    })

    it('renders inline code within paragraphs', () => {
      const markdown = 'Use `const x = 42;` to declare a constant.'

      render(<MarkdownRenderer content={markdown} />)

      const inlineCode = screen.getByText('const x = 42;')
      expect(inlineCode).toBeInTheDocument()
      expect(inlineCode.tagName).toBe('CODE')
    })

    it('handles mixed content with code blocks and other markdown elements', () => {
      const markdown = `# Documentation

## Overview
This is a **bold** statement.

### Code Example
\`\`\`javascript
function example() {
  console.log("Hello, World!");
}
\`\`\`

> This is a quote about the code above.

- List item 1
- List item 2`

      render(<MarkdownRenderer content={markdown} />)

      // Should render all markdown elements
      expect(screen.getByText('Documentation')).toBeInTheDocument()
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('bold')).toBeInTheDocument()
      expect(screen.getByText('Code Example')).toBeInTheDocument()
      expect(screen.getByText(/function example/)).toBeInTheDocument()
      expect(screen.getByText(/This is a quote/)).toBeInTheDocument()
      expect(screen.getByText('List item 1')).toBeInTheDocument()

      // Should have copy button for code block
      expect(
        screen.getByRole('button', { name: /copy code/i })
      ).toBeInTheDocument()
    })

    it('maintains backward compatibility with plain text', () => {
      const plainText = 'This is just plain text without any markdown.'

      render(<MarkdownRenderer content={plainText} />)

      expect(screen.getByText(plainText)).toBeInTheDocument()
    })

    it('handles empty and invalid content gracefully', () => {
      const { container: emptyContainer } = render(
        <MarkdownRenderer content='' />
      )
      expect(emptyContainer.firstChild).toBeNull()

      const { container: nullContainer } = render(
        <MarkdownRenderer content={null as any} />
      )
      expect(nullContainer.firstChild).toBeNull()
    })
  })

  describe('Theme Integration', () => {
    it('applies proper CSS classes for theming', () => {
      const code = 'const theme = "dark";'

      const { container } = render(
        <CodeBlock className='language-javascript'>{code}</CodeBlock>
      )

      // Should have theme-aware classes
      const codeBlock = container.querySelector('.group')
      expect(codeBlock).toHaveClass('relative')

      const copyButton = screen.getByRole('button', { name: /copy code/i })
      expect(copyButton).toHaveClass('opacity-0', 'transition-all')
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels for copy button', () => {
      const code = 'console.log("test");'

      render(<CodeBlock className='language-javascript'>{code}</CodeBlock>)

      const copyButton = screen.getByRole('button', { name: /copy code/i })
      expect(copyButton).toHaveAttribute('title', 'Copy code')
    })

    it('updates ARIA labels after successful copy', async () => {
      const code = 'console.log("test");'

      render(<CodeBlock className='language-javascript'>{code}</CodeBlock>)

      const copyButton = screen.getByRole('button', { name: /copy code/i })
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copied/i })).toHaveAttribute(
          'title',
          'Copied!'
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('handles clipboard API failures gracefully', async () => {
      // Mock clipboard to fail
      ;(navigator.clipboard.writeText as unknown as Mock).mockRejectedValueOnce(
        new Error('Clipboard access denied')
      )

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const code = 'console.log("test");'
      render(<CodeBlock className='language-javascript'>{code}</CodeBlock>)

      const copyButton = screen.getByRole('button', { name: /copy code/i })
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to copy code:',
          expect.any(Error)
        )
      })

      consoleSpy.mockRestore()
    })
  })
})
