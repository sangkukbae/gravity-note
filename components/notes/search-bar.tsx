'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SearchIcon, XIcon } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  placeholder?: string
  className?: string
  isOpen?: boolean
  onToggle?: () => void
  showToggle?: boolean
  disabled?: boolean
}

export function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search your notes...',
  className,
  isOpen = false,
  onToggle,
  showToggle = true,
  disabled,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue)
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [localValue, onChange])

  // Keep local value in sync with prop value
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Focus input when search becomes open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleClear = () => {
    setLocalValue('')
    onChange('')
    onClear?.()
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (localValue) {
        handleClear()
      } else if (onToggle) {
        onToggle()
      }
    }
  }

  // If showToggle is false, always show the search bar
  if (!showToggle) {
    return (
      <div className={cn('relative w-full max-w-[600px] mx-auto', className)}>
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
              'pl-10 pr-10 w-full',
              'focus-visible:ring-2 focus-visible:ring-primary'
            )}
            aria-label='Search notes'
            disabled={!!disabled}
          />
          {localValue && (
            <Button
              onClick={handleClear}
              variant='ghost'
              size='sm'
              className='absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0'
              aria-label='Clear search'
              disabled={!!disabled}
            >
              <XIcon className='h-3 w-3' />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Search Toggle Button */}
      {!isOpen && onToggle && (
        <Button
          onClick={onToggle}
          variant='ghost'
          size='sm'
          className={cn(
            'h-10 w-10 p-0',
            'hover:bg-muted/50',
            'transition-colors duration-150'
          )}
          aria-label='Open search'
          disabled={!!disabled}
        >
          <SearchIcon className='h-4 w-4' />
        </Button>
      )}

      {/* Search Input */}
      {isOpen && (
        <div className='flex items-center gap-2 w-full max-w-[600px] mx-auto'>
          <div className='relative flex-1'>
            <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              ref={inputRef}
              type='text'
              value={localValue}
              onChange={e => setLocalValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                'pl-10 pr-10 w-full',
                'focus-visible:ring-2 focus-visible:ring-primary'
              )}
              aria-label='Search notes'
              disabled={!!disabled}
            />
            {localValue && (
              <Button
                onClick={handleClear}
                variant='ghost'
                size='sm'
                className='absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0'
                aria-label='Clear search'
                disabled={!!disabled}
              >
                <XIcon className='h-3 w-3' />
              </Button>
            )}
          </div>

          {onToggle && (
            <Button
              onClick={onToggle}
              variant='ghost'
              size='sm'
              className='h-10 w-10 p-0'
              aria-label='Close search'
              disabled={!!disabled}
            >
              <XIcon className='h-4 w-4' />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
