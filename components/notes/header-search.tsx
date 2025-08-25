'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SearchIcon, XIcon } from 'lucide-react'
import { SearchErrorWrapper } from '@/components/search/error-boundary'

interface HeaderSearchProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  placeholder?: string
  className?: string
}

export function HeaderSearch({
  value,
  onChange,
  onClear,
  placeholder = 'Search notes...',
  className,
}: HeaderSearchProps) {
  const [localValue, setLocalValue] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Optimized debouncing with useCallback for stable onChange reference
  const debouncedOnChange = useCallback(
    (value: string) => {
      const timer = setTimeout(() => {
        onChange(value)
      }, 300) // 300ms debounce

      return () => clearTimeout(timer)
    },
    [onChange]
  )

  useEffect(() => {
    const cleanup = debouncedOnChange(localValue)
    return cleanup
  }, [localValue, debouncedOnChange])

  // Keep local value in sync with prop value
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Focus input when search opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Optimize keyboard handler with stable reference
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle Cmd+F or Ctrl+F, ensure we're not interfering with other shortcuts
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === 'f' &&
      !e.shiftKey &&
      !e.altKey
    ) {
      e.preventDefault()
      setIsOpen(true)
      // Focus the input after opening
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 0)
    }
  }, [])

  // Global keyboard shortcut for Ctrl/Cmd + F
  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleGlobalKeyDown])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
    onClear?.()
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [onChange, onClear])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (localValue) {
          handleClear()
        } else {
          setIsOpen(false)
        }
      }
    },
    [localValue, handleClear]
  )

  const toggleSearch = useCallback(() => {
    setIsOpen(!isOpen)
  }, [isOpen])

  return (
    <SearchErrorWrapper className="relative flex items-center">
      <div className={cn('relative flex items-center', className)}>
        {!isOpen ? (
          // Search toggle button
          <Button
            onClick={toggleSearch}
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0 rounded-full hover:bg-accent/50 transition-colors'
            aria-label='Open search'
            title='Search notes (Ctrl+F)'
          >
            <SearchIcon className='h-4 w-4' />
          </Button>
        ) : (
          // Expanded search input
          <div className='flex items-center gap-2 animate-modern-fade-in'>
            <div className='relative'>
              <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                ref={inputRef}
                type='text'
                value={localValue}
                onChange={e => setLocalValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={cn(
                  // Responsive width constraints: narrower on mobile, optimal on desktop
                  'w-64 max-w-[min(400px,calc(100vw-8rem))] pl-10 pr-10 h-8',
                  'focus-visible:ring-2 focus-visible:ring-primary',
                'border-border/50'
              )}
              aria-label='Search notes'
            />
            {localValue && (
              <Button
                onClick={handleClear}
                variant='ghost'
                size='sm'
                className='absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0'
                aria-label='Clear search'
              >
                <XIcon className='h-3 w-3' />
              </Button>
            )}
          </div>
          <Button
            onClick={toggleSearch}
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0'
            aria-label='Close search'
          >
            <XIcon className='h-4 w-4' />
          </Button>
        </div>
      )}
      </div>
    </SearchErrorWrapper>
  )
}
