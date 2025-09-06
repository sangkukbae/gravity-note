'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { CodeBlock, InlineCode } from '@/components/ui/code-block'
import Markdown from 'markdown-to-jsx'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Markdown renderer component that provides backward compatibility with plain text.
 * This component gracefully handles both markdown and plain text content:
 * - If content contains markdown syntax, renders as markdown
 * - If content is plain text, renders as plain text with proper formatting
 * - Maintains consistent styling with the existing EnhancedTextRenderer
 */
export const MarkdownRenderer = React.memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  // Simple heuristic to detect if content likely contains markdown - memoized for performance
  // This is conservative - better to render plain text than break existing content
  const containsMarkdown = React.useMemo(() => {
    if (!content || typeof content !== 'string') return false

    return /(?:^|\n)#{1,6}\s|(?:^|\n)(?:\*|\d+\.)\s|\*\*|\*(?!\*)|`{3,}|`[^`\n]+`|(?:^|\n)>|(?:^|\n)-{3,}|(?:^|\n)\s{4,}|\[.*\]\(.*\)/.test(
      content
    )
  }, [content])

  // Custom component overrides for enhanced markdown rendering - memoized to prevent recreation
  const markdownOptions = React.useMemo(
    () => ({
      overrides: {
        // Block code (fenced code blocks)
        pre: {
          component: ({ children, ...props }: any) => {
            // Extract code element from pre - be more flexible about detection
            if (React.Children.count(children) === 1) {
              const codeElement = React.Children.only(children)

              // Safely narrow props to access className/children
              type CodeChildProps = {
                className?: string
                children?: React.ReactNode
              }

              if (React.isValidElement(codeElement)) {
                const { className, children: codeChildren } =
                  (codeElement.props ?? {}) as CodeChildProps

                if (typeof className === 'string') {
                  const langMatch =
                    className.match(/language-([\w-]+)/) ||
                    className.match(/lang-([\w-]+)/)
                  const language = langMatch ? langMatch[1] : undefined

                  return (
                    <CodeBlock
                      className={className}
                      language={language}
                      {...props}
                    >
                      {String(codeChildren ?? '')}
                    </CodeBlock>
                  )
                }
              }
            }
            // Fallback for non-code pre elements
            return (
              <pre
                className='whitespace-pre-wrap font-mono text-sm p-4 rounded-lg border border-border'
                {...props}
              >
                {children}
              </pre>
            )
          },
        },

        // Inline code
        code: {
          component: ({ className, children, ...props }: any) => {
            // Check if this is a code block (should be handled by pre override)
            const isInPre = props['data-in-pre'] !== undefined
            if (isInPre) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }

            // Render as inline code
            return (
              <InlineCode className={className} {...props}>
                {children}
              </InlineCode>
            )
          },
        },

        // Enhanced typography overrides to match existing styles
        h1: {
          component: (props: any) => (
            <h1
              className='text-2xl font-bold mb-4 text-foreground'
              {...props}
            />
          ),
        },
        h2: {
          component: (props: any) => (
            <h2
              className='text-xl font-semibold mb-3 text-foreground'
              {...props}
            />
          ),
        },
        h3: {
          component: (props: any) => (
            <h3
              className='text-lg font-medium mb-2 text-foreground'
              {...props}
            />
          ),
        },
        p: {
          component: (props: any) => (
            <p className='mb-4 leading-relaxed text-foreground/90' {...props} />
          ),
        },
        ul: {
          component: (props: any) => (
            <ul
              className='mb-4 ml-4 list-disc space-y-1 text-foreground/90'
              {...props}
            />
          ),
        },
        ol: {
          component: (props: any) => (
            <ol
              className='mb-4 ml-4 list-decimal space-y-1 text-foreground/90'
              {...props}
            />
          ),
        },
        blockquote: {
          component: (props: any) => (
            <blockquote
              className='border-l-4 border-border pl-4 italic text-foreground/80 mb-4'
              {...props}
            />
          ),
        },
        hr: {
          component: (props: any) => (
            <hr className='my-6 border-border' {...props} />
          ),
        },
        a: {
          component: (props: any) => (
            <a
              className='text-primary hover:text-primary/80 underline underline-offset-2'
              {...props}
            />
          ),
        },
        strong: {
          component: (props: any) => (
            <strong className='font-semibold text-foreground' {...props} />
          ),
        },
        em: {
          component: (props: any) => (
            <em className='italic text-foreground/90' {...props} />
          ),
        },
      },
    }),
    []
  ) // Empty dependency array since the options are static

  // Early returns after all hooks
  if (!content || typeof content !== 'string') {
    return null
  }

  // If no markdown detected, render as plain text with basic formatting
  if (!containsMarkdown) {
    return (
      <div
        className={cn('text-sm leading-relaxed text-foreground/90', className)}
      >
        {content.split('\n').map((line, index, array) => (
          <React.Fragment key={index}>
            {line || '\u00A0'} {/* Non-breaking space for empty lines */}
            {index < array.length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    )
  }

  // Render as markdown with custom overrides for consistent styling using Suspense
  return (
    <div
      className={cn('markdown-content prose prose-sm max-w-none', className)}
    >
      <Markdown options={markdownOptions}>{content}</Markdown>
    </div>
  )
})
