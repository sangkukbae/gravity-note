'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NoteCard } from './note-card'
import { useSearchNotes } from '@/lib/hooks/use-notes'
import type { Note } from '@/types'
import { Search, X, Loader2, Filter } from 'lucide-react'

interface NoteSearchProps {
  onNoteSelect?: (note: Note) => void
  placeholder?: string
  showResults?: boolean
  maxResults?: number
  className?: string
}

export function NoteSearch({
  onNoteSelect,
  placeholder = 'Search notes...',
  showResults = true,
  maxResults = 10,
  className = '',
}: NoteSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const {
    data: searchResults = [],
    isLoading,
    isError,
  } = useSearchNotes(debouncedTerm, {
    enabled: debouncedTerm.length > 0,
  })

  // Debounce search term
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, 300) // 300ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchTerm])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchResults])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    setIsExpanded(value.length > 0)
  }

  const handleClear = useCallback(() => {
    setSearchTerm('')
    setDebouncedTerm('')
    setIsExpanded(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }, [])

  const handleNoteSelect = useCallback(
    (note: Note) => {
      onNoteSelect?.(note)
      setIsExpanded(false)
      setSearchTerm('')
      setDebouncedTerm('')
    },
    [onNoteSelect]
  )

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isExpanded || searchResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        )
        break

      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break

      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleNoteSelect(searchResults[selectedIndex])
        }
        break

      case 'Escape':
        e.preventDefault()
        setIsExpanded(false)
        inputRef.current?.blur()
        break
    }
  }

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsExpanded(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const limitedResults = searchResults.slice(0, maxResults)

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />

        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm.length > 0 && setIsExpanded(true)}
          placeholder={placeholder}
          className='pl-10 pr-10'
          autoComplete='off'
        />

        <div className='absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1'>
          {isLoading && (
            <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
          )}

          {searchTerm && (
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0'
              onClick={handleClear}
            >
              <X className='h-3 w-3' />
            </Button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {showResults && isExpanded && (
        <div
          ref={resultsRef}
          className='absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-96 overflow-y-auto'
        >
          {isLoading && (
            <div className='p-4 text-center text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin mx-auto mb-2' />
              Searching...
            </div>
          )}

          {isError && (
            <div className='p-4 text-center text-sm text-red-600'>
              Search failed. Please try again.
            </div>
          )}

          {!isLoading &&
            !isError &&
            debouncedTerm &&
            limitedResults.length === 0 && (
              <div className='p-4 text-center text-sm text-muted-foreground'>
                No notes found for &quot;{debouncedTerm}&quot;
              </div>
            )}

          {!isLoading && !isError && limitedResults.length > 0 && (
            <div className='py-2'>
              <div className='px-3 py-1 text-xs text-muted-foreground border-b border-border'>
                {searchResults.length} result
                {searchResults.length !== 1 ? 's' : ''} found
                {searchResults.length > maxResults &&
                  ` (showing first ${maxResults})`}
              </div>

              {limitedResults.map((note, index) => (
                <div
                  key={note.id}
                  className={`p-2 cursor-pointer transition-colors ${
                    index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleNoteSelect(note)}
                >
                  <SearchResultCard note={note} searchTerm={debouncedTerm} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SearchResultCardProps {
  note: Note
  searchTerm: string
}

function SearchResultCard({ note, searchTerm }: SearchResultCardProps) {
  const highlightText = (text: string, term: string) => {
    if (!term) return text

    const regex = new RegExp(`(${term})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) => (
      <span
        key={index}
        className={regex.test(part) ? 'bg-yellow-200 dark:bg-yellow-900' : ''}
      >
        {part}
      </span>
    ))
  }

  const getSnippet = (content: string, term: string, maxLength = 100) => {
    if (!term) return content.substring(0, maxLength)

    const termIndex = content.toLowerCase().indexOf(term.toLowerCase())
    if (termIndex === -1) return content.substring(0, maxLength)

    const start = Math.max(0, termIndex - 30)
    const end = Math.min(content.length, start + maxLength)

    let snippet = content.substring(start, end)
    if (start > 0) snippet = '...' + snippet
    if (end < content.length) snippet = snippet + '...'

    return snippet
  }

  const snippet = getSnippet(note.content, searchTerm)

  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between'>
        <h4 className='text-sm font-medium truncate'>
          {note.title ? (
            highlightText(note.title, searchTerm)
          ) : (
            <span className='italic text-muted-foreground'>Untitled</span>
          )}
        </h4>
        <span className='text-xs text-muted-foreground'>
          {new Date(note.updated_at).toLocaleDateString()}
        </span>
      </div>

      <p className='text-xs text-muted-foreground leading-relaxed'>
        {highlightText(snippet, searchTerm)}
      </p>
    </div>
  )
}
