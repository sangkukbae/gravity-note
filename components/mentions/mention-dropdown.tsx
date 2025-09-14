'use client'

import { useCallback } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { AtSign, Clock, FileText } from 'lucide-react'
import { formatDistance } from 'date-fns'

interface MentionCandidate {
  id: string
  title: string
  content?: string
  updatedAt?: Date
}

interface MentionDropdownProps {
  isOpen: boolean
  position: { x: number; y: number }
  candidates: MentionCandidate[]
  search: string
  isLoading?: boolean
  onSelect: (candidate: MentionCandidate) => void
  onOpenChange?: (open: boolean) => void
}

export function MentionDropdown({
  isOpen,
  position,
  candidates,
  search,
  isLoading = false,
  onSelect,
  onOpenChange,
}: MentionDropdownProps) {
  const hasPosition =
    Number.isFinite(position?.x) && Number.isFinite(position?.y)

  const handleOpenChange = useCallback(
    (open: boolean) => {
      onOpenChange?.(open)
    },
    [onOpenChange]
  )

  if (!hasPosition) return null

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      {/* Invisible anchor at caret position */}
      <DropdownMenuTrigger asChild>
        <span
          // fixed so it stays anchored to viewport coords
          style={{
            position: 'fixed',
            left: `${Math.round(position.x)}px`,
            top: `${Math.round(position.y)}px`,
            width: 1,
            height: 1,
            // Ensure it's essentially invisible but measurable
            background: 'transparent',
            outline: 'none',
          }}
          aria-hidden
          tabIndex={-1}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side='bottom'
        align='start'
        sideOffset={4}
        className={cn('w-80 p-0')}
      >
        {/* Header */}
        <div className='px-3 py-2 border-b border-border text-sm text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <AtSign className='h-3 w-3' />
            <span>
              {search ? `Mention: ${search}` : 'Select a note to mention...'}
            </span>
          </div>
        </div>

        <div className='max-h-60 overflow-y-auto py-1'>
          {isLoading ? (
            <div className='py-6 text-center text-sm text-muted-foreground'>
              <div className='flex items-center justify-center gap-2'>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent' />
                Loading notes...
              </div>
            </div>
          ) : candidates.length === 0 ? (
            <div className='py-6 text-center text-sm text-muted-foreground'>
              {search ? 'No notes found' : 'No notes available'}
            </div>
          ) : (
            candidates.map(candidate => {
              // Truncate content preview
              const preview = candidate.content
                ? candidate.content.slice(0, 50).replace(/\n/g, ' ')
                : 'Empty note'
              const truncatedPreview =
                preview.length > 50 ? preview + '...' : preview

              return (
                <DropdownMenuItem
                  key={candidate.id}
                  className='flex items-start gap-3 py-2.5 px-3 cursor-pointer'
                  onSelect={() => onSelect(candidate)}
                >
                  <div className='flex h-5 w-5 shrink-0 items-center justify-center mt-0.5'>
                    <FileText className='h-4 w-4 text-muted-foreground' />
                  </div>
                  <div className='flex flex-col gap-0.5 min-w-0 flex-1'>
                    <span className='font-medium truncate text-sm'>
                      {candidate.title}
                    </span>
                    <span className='text-xs text-muted-foreground truncate leading-relaxed'>
                      {truncatedPreview}
                    </span>
                    {candidate.updatedAt && (
                      <div className='flex items-center gap-1 text-xs text-muted-foreground/70 mt-0.5'>
                        <Clock className='h-3 w-3' />
                        <span>
                          {formatDistance(candidate.updatedAt, new Date(), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              )
            })
          )}
        </div>
        <div className='border-t border-border px-3 py-2 text-xs text-muted-foreground'>
          ↑↓ to navigate · ↵ to select · esc to close
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
