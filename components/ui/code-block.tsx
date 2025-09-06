'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  oneLight,
  oneDark,
} from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'

interface CodeBlockProps {
  children: string
  className?: string
  /**
   * Language for syntax highlighting
   * Extracted from className prop (e.g., 'language-typescript' -> 'typescript')
   */
  language?: string
}

/**
 * GitHub-style code block component with syntax highlighting and copy functionality
 * Uses React Syntax Highlighter (Prism.js) for static highlighting without dynamic imports
 */
export const CodeBlock = React.memo(function CodeBlock({
  children,
  className,
  language,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  // Extract and normalize language from className (markdown-to-jsx format: 'language-typescript')
  const detectedLanguage = useMemo(() => {
    let rawLanguage = language?.trim()
    if (!rawLanguage) {
      const match = className?.match(/language-([\w-]+)/)
      rawLanguage = match?.[1] ?? 'typescript'
    }
    // Normalize common language aliases
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      py: 'python',
      sh: 'bash',
      shell: 'bash',
      shellscript: 'bash',
      zsh: 'bash',
      yml: 'yaml',
      md: 'markdown',
      cpp: 'cpp',
      'c++': 'cpp',
    }
    return languageMap[rawLanguage.toLowerCase()] || rawLanguage.toLowerCase()
  }, [className, language])

  // Clean up the code content (remove extra whitespace)
  const cleanCode = useMemo(() => children.trim(), [children])

  // Set mounted state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Copy to clipboard functionality
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

  // Select theme based on current theme with proper background enforcement
  const syntaxStyle = resolvedTheme === 'dark' ? oneDark : oneLight

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
          'relative overflow-hidden rounded-lg border border-border'
        )}
      >
        {mounted ? (
          // React Syntax Highlighter - renders immediately, no loading states needed
          <SyntaxHighlighter
            language={detectedLanguage}
            style={syntaxStyle}
            customStyle={{
              margin: 0,
              padding: '1rem',
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              border: 'none',
              // ...(resolvedTheme === 'dark' && { background: '#262626' }),
            }}
            codeTagProps={{
              style: {
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              },
            }}
          >
            {cleanCode}
          </SyntaxHighlighter>
        ) : (
          // SSR fallback - plain code
          <pre
            className={cn(
              'overflow-x-auto p-4 text-sm font-mono',
              'text-foreground bg-transparent',
              'whitespace-pre-wrap break-all'
            )}
          >
            <code className='text-inherit bg-transparent'>{cleanCode}</code>
          </pre>
        )}
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
