/**
 * Wrapper for the generated Shiki bundle to provide optimized highlighting
 * without dynamic imports and WASM dependencies.
 *
 * This eliminates white background flashes during loading.
 */

import {
  codeToHtml,
  type BundledLanguage,
  type BundledTheme,
} from './shiki-bundle'

// Type mapping to ensure backward compatibility
type ThemeMapping = {
  'github-light': 'github-light'
  'github-dark': 'github-dark'
}

type LanguageMapping = {
  [K in BundledLanguage]: K
}

/**
 * Highlight code using the pre-generated Shiki bundle.
 * This function is synchronous after the first call and eliminates loading flashes.
 *
 * @param code - The code to highlight
 * @param language - Programming language for syntax highlighting
 * @param theme - Theme to use ('github-light' or 'github-dark')
 * @returns Promise resolving to highlighted HTML string
 */
export async function highlightCode(
  code: string,
  language: BundledLanguage,
  theme: BundledTheme
): Promise<string> {
  try {
    const html = await codeToHtml(code, {
      lang: language,
      theme: theme,
    })
    return html
  } catch (error) {
    console.warn('Shiki highlighting failed:', error)
    // Return plain HTML as fallback
    return `<pre><code>${escapeHtml(code)}</code></pre>`
  }
}

/**
 * Create dual-theme HTML structure for light/dark mode support
 *
 * @param code - The code to highlight
 * @param language - Programming language for syntax highlighting
 * @returns Promise resolving to dual-theme HTML structure
 */
export async function highlightCodeDualTheme(
  code: string,
  language: BundledLanguage
): Promise<string> {
  try {
    const [lightHtml, darkHtml] = await Promise.all([
      codeToHtml(code, {
        lang: language,
        theme: 'github-light',
      }),
      codeToHtml(code, {
        lang: language,
        theme: 'github-dark',
      }),
    ])

    // Create dual-theme HTML structure matching the current implementation
    return `
      <div class="shiki-light" style="display: var(--shiki-light-display, block);">
        ${lightHtml}
      </div>
      <div class="shiki-dark" style="display: var(--shiki-dark-display, none);">
        ${darkHtml}
      </div>
    `.trim()
  } catch (error) {
    console.warn('Shiki dual-theme highlighting failed:', error)
    // Return plain HTML as fallback
    return `<pre><code>${escapeHtml(code)}</code></pre>`
  }
}

/**
 * Check if a language is supported by the bundled highlighter
 *
 * @param language - Language to check
 * @returns Whether the language is supported
 */
export function isLanguageSupported(
  language: string
): language is BundledLanguage {
  const supportedLanguages = [
    'typescript',
    'ts',
    'javascript',
    'js',
    'jsx',
    'tsx',
    'python',
    'py',
    'java',
    'cpp',
    'c++',
    'c',
    'css',
    'html',
    'json',
    'yaml',
    'yml',
    'markdown',
    'md',
    'shellscript',
    'bash',
    'sh',
    'shell',
    'zsh',
    'sql',
    'php',
  ]
  return supportedLanguages.includes(language as BundledLanguage)
}

/**
 * Map common language aliases to supported bundle languages
 *
 * @param language - Input language (may be an alias)
 * @returns Normalized language name
 */
export function normalizeLanguage(language: string): BundledLanguage {
  const languageMap: Record<string, BundledLanguage> = {
    ts: 'typescript',
    js: 'javascript',
    py: 'python',
    cpp: 'cpp',
    'c++': 'cpp',
    yml: 'yaml',
    md: 'markdown',
    sh: 'bash',
    shell: 'bash',
    shellscript: 'bash',
    zsh: 'bash',
  }

  const normalized =
    languageMap[language.toLowerCase()] || language.toLowerCase()

  if (isLanguageSupported(normalized)) {
    return normalized
  }

  // Default to typescript for unsupported languages
  return 'typescript'
}

/**
 * Simple HTML escape function for fallback cases
 */
function escapeHtml(text: string): string {
  // Handle SSR - use manual escaping if document is not available
  if (typeof document === 'undefined') {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Export types for external use
export type { BundledLanguage, BundledTheme }
