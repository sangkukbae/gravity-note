import { createPortal } from 'react-dom'
import { Command } from 'cmdk'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
} from '@floating-ui/react'
import { cn } from '@/lib/utils'
import { MarkdownCommand } from './markdown-commands'
import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  KeyboardEvent,
} from 'react'

interface SlashCommandMenuProps {
  isOpen: boolean
  search: string
  position: { x: number; y: number }
  commands: MarkdownCommand[]
  onSelect: (command: MarkdownCommand) => void
  onKeyDown?: (e: KeyboardEvent) => void
}

export function SlashCommandMenu({
  isOpen,
  search,
  position,
  commands,
  onSelect,
  onKeyDown,
}: SlashCommandMenuProps) {
  const [selectedValue, setSelectedValue] = useState('')

  // Determine if we have a valid caret position before wiring Floating UI
  const hasPosition =
    Number.isFinite(position?.x) && Number.isFinite(position?.y)

  // Create virtual element for Floating UI positioning (only valid when hasPosition)
  const virtualElement = useMemo(
    () => ({
      getBoundingClientRect: () => ({
        x: position.x,
        y: position.y,
        width: 0,
        height: 0,
        top: position.y,
        left: position.x,
        right: position.x,
        bottom: position.y,
      }),
    }),
    [position.x, position.y]
  )

  const { refs, floatingStyles, update } = useFloating<any>({
    placement: 'bottom-start',
    strategy: 'fixed', // viewport-relative; matches our caret measurement
    // Only provide the reference once we have a finite position to avoid
    // an initial compute at (0,0). See Floating UI virtual elements docs.
    elements: hasPosition
      ? ({ reference: virtualElement as any } as any)
      : undefined,
    middleware: [
      offset(4),
      flip({
        fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
      }),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(availableHeight - 16, 300)}px`,
          })
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  })

  // Pre-position before showing to avoid any visual jump.
  const [isPositioned, setIsPositioned] = useState(false)
  useLayoutEffect(() => {
    if (!isOpen || !hasPosition) return
    setIsPositioned(false)
    // Run an immediate compute with the current virtual rect
    // then mark as positioned for rendering.
    requestAnimationFrame(() => {
      update?.()
      requestAnimationFrame(() => setIsPositioned(true))
    })
  }, [isOpen, hasPosition, position.x, position.y, update])

  // Reset selected value when commands change
  useEffect(() => {
    setSelectedValue(commands[0]?.id || '')
  }, [commands])

  // Handle keyboard navigation - let cmdk handle most of it
  const handleCommandKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      // Only handle Enter and Tab for selection
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selectedCommand = commands.find(cmd => cmd.id === selectedValue)
        if (selectedCommand) {
          onSelect(selectedCommand)
        }
      }

      // Let parent handle other keys like Escape
      onKeyDown?.(e)
    },
    [commands, selectedValue, onSelect, onKeyDown]
  )

  if (!isOpen || commands.length === 0 || !hasPosition) return null

  const menu = (
    <div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        visibility: isPositioned ? 'visible' : 'hidden',
      }}
      className={cn(
        'z-50 w-80 rounded-lg border border-border bg-popover shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        'overflow-hidden'
      )}
    >
      <Command
        className='max-h-full'
        shouldFilter={false} // We handle filtering in the hook
        value={selectedValue}
        onValueChange={setSelectedValue}
        onKeyDown={handleCommandKeyDown}
      >
        <div className='px-3 py-2 border-b border-border'>
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <span>/</span>
            <span>{search || 'Type to search commands...'}</span>
          </div>
        </div>

        <Command.List className='max-h-60 overflow-y-auto p-1 scroll-smooth'>
          {commands.length === 0 ? (
            <Command.Empty className='py-6 text-center text-sm text-muted-foreground'>
              No commands found
            </Command.Empty>
          ) : (
            commands.map(command => {
              const Icon = command.icon
              const isSelected = command.id === selectedValue

              return (
                <Command.Item
                  key={command.id}
                  value={command.id}
                  onSelect={() => onSelect(command)}
                  onMouseDown={e => {
                    // Prevent default to ensure our onSelect fires
                    e.preventDefault()
                  }}
                  onMouseUp={e => {
                    // Ensure we handle the click
                    e.preventDefault()
                    onSelect(command)
                  }}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none',
                    'transition-colors duration-150',
                    'scroll-my-2', // Ensure selected item stays in view
                    isSelected
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                      : 'hover:bg-accent/50',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                  )}
                  data-selected={isSelected}
                >
                  <div className='flex h-5 w-5 shrink-0 items-center justify-center'>
                    <Icon className='h-4 w-4' />
                  </div>

                  <div className='flex flex-col gap-0.5 min-w-0 flex-1'>
                    <span className='font-medium truncate'>
                      {command.title}
                    </span>
                    <span className='text-xs text-muted-foreground truncate'>
                      {command.description}
                    </span>
                  </div>

                  <div className='shrink-0'>
                    <code className='rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground'>
                      {command.markdown.replace(/\n/g, '\\n').slice(0, 8)}
                      {command.markdown.length > 8 ? '...' : ''}
                    </code>
                  </div>
                </Command.Item>
              )
            })
          )}
        </Command.List>

        <div className='border-t border-border px-3 py-2'>
          <div className='flex items-center justify-between text-xs text-muted-foreground'>
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to close</span>
          </div>
        </div>
      </Command>
    </div>
  )

  // Render in portal to avoid z-index issues
  return typeof document !== 'undefined'
    ? createPortal(menu, document.body)
    : null
}
