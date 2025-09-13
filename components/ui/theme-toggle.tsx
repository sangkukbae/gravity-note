'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()

  // Avoid hydration mismatch by only rendering after mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder with same dimensions to prevent layout shift
    return (
      <div className={cn('h-8 w-8', className)}>
        <div className='h-8 w-8 rounded-full' />
      </div>
    )
  }

  const toggleTheme = () => {
    if (theme === 'system') {
      // If currently system, switch to the opposite of resolved theme
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    } else {
      // If manually set, toggle between light and dark
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }
  }

  // Determine which icon to show based on resolved theme
  const isDark = resolvedTheme === 'dark'
  const Icon = isDark ? Sun : Moon

  return (
    <Button
      onClick={toggleTheme}
      variant='ghost'
      size='sm'
      className={cn(
        'h-8 w-8 p-0 rounded-full hover:bg-muted transition-colors',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <Icon className='h-4 w-4' />
    </Button>
  )
}
