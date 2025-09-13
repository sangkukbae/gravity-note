'use client'

import { useCallback } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { MarkdownCommand } from './markdown-commands'

interface SlashCommandDropdownProps {
  isOpen: boolean
  position: { x: number; y: number }
  commands: MarkdownCommand[]
  search: string
  onSelect: (command: MarkdownCommand) => void
  onOpenChange?: (open: boolean) => void
}

export function SlashCommandDropdown({
  isOpen,
  position,
  commands,
  search,
  onSelect,
  onOpenChange,
}: SlashCommandDropdownProps) {
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
        {/* Header (lightweight; no input field) */}
        <div className='px-3 py-2 border-b border-border text-sm text-muted-foreground'>
          <span>{search ? `Command: ${search}` : 'Type a command...'}</span>
        </div>

        <div className='max-h-60 overflow-y-auto py-1'>
          {commands.length === 0 ? (
            <div className='py-6 text-center text-sm text-muted-foreground'>
              No commands
            </div>
          ) : (
            commands.map(cmd => {
              const Icon = cmd.icon
              return (
                <DropdownMenuItem
                  key={cmd.id}
                  className='flex items-center gap-3 py-2.5'
                  onSelect={() => onSelect(cmd)}
                >
                  <div className='flex h-5 w-5 shrink-0 items-center justify-center'>
                    <Icon className='h-4 w-4' />
                  </div>
                  <div className='flex flex-col gap-0.5 min-w-0 flex-1'>
                    <span className='font-medium truncate'>{cmd.title}</span>
                    <span className='text-xs text-muted-foreground truncate'>
                      {cmd.description}
                    </span>
                  </div>
                  <code className='rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground'>
                    {cmd.markdown.replace(/\n/g, '\\n').slice(0, 8)}
                    {cmd.markdown.length > 8 ? '...' : ''}
                  </code>
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
