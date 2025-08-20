'use client'

import { cn } from '@/lib/utils'
import { InboxIcon, SearchIcon, TrendingDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  type?: 'initial' | 'search' | 'error'
  className?: string
  onAction?: () => void
  actionLabel?: string
  searchQuery?: string
}

export function EmptyState({
  type = 'initial',
  className,
  onAction,
  actionLabel,
  searchQuery,
}: EmptyStateProps) {
  const getContent = () => {
    switch (type) {
      case 'search':
        return {
          icon: <SearchIcon className='h-16 w-16 text-muted-foreground/30' />,
          title: searchQuery
            ? `No notes found for "${searchQuery}"`
            : 'No notes found',
          description:
            'Try searching with different keywords, or create a new note with this content.',
          action: actionLabel || 'Clear search',
        }

      case 'error':
        return {
          icon: <TrendingDownIcon className='h-16 w-16 text-destructive/30' />,
          title: 'Something went wrong',
          description:
            "We couldn't load your notes. Please check your connection and try again.",
          action: actionLabel || 'Retry',
        }

      default: // 'initial'
        return {
          icon: <InboxIcon className='h-16 w-16 text-muted-foreground/30' />,
          title: "Your mind's inbox awaits",
          description:
            "Welcome to Gravity Note. Every great idea starts with a single thought. What's yours?",
          action: null,
        }
    }
  }

  const content = getContent()

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'p-8 text-center min-h-[400px]',
        className
      )}
    >
      <div className='mb-6'>{content.icon}</div>

      <h3 className='text-xl font-semibold text-foreground mb-3'>
        {content.title}
      </h3>

      <p className='text-muted-foreground/80 max-w-md leading-relaxed mb-6'>
        {content.description}
      </p>

      {/* Inspirational quote for initial state */}
      {type === 'initial' && (
        <blockquote className='text-sm italic text-muted-foreground/60 max-w-sm mb-8 border-l-2 border-muted-foreground/20 pl-4'>
          &quot;The best way to find out if you can trust somebody is to trust
          them.&quot;
          <br />
          <span className='text-xs'>
            — Your future self will thank you for capturing this thought
          </span>
        </blockquote>
      )}

      {/* Action button */}
      {content.action && onAction && (
        <Button
          onClick={onAction}
          variant={type === 'error' ? 'default' : 'outline'}
          className='mt-2'
        >
          {content.action}
        </Button>
      )}

      {/* Subtle design philosophy hint */}
      {type === 'initial' && (
        <div className='mt-8 text-xs text-muted-foreground/50 space-y-1'>
          <p>• No folders, no categories — just pure capture</p>
          <p>• Important thoughts naturally rise to the top</p>
          <p>• Search everything with Ctrl+F</p>
        </div>
      )}
    </div>
  )
}
