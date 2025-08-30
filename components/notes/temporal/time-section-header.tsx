'use client'

import { memo } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  SearchIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type {
  NoteTimeSection,
  TimeGroup,
  TimeSectionStats,
} from '@/types/temporal'

interface TimeSectionHeaderProps {
  section: NoteTimeSection
  stats: TimeSectionStats
  onToggle?: () => void
  searchQuery?: string | undefined
}

const TIME_GROUP_ICONS: Record<TimeGroup, React.ComponentType<any>> = {
  yesterday: ClockIcon,
  last_week: ClockIcon,
  last_month: ClockIcon,
  earlier: ClockIcon,
}

export const TimeSectionHeader = memo(function TimeSectionHeader({
  section,
  stats,
  onToggle,
  searchQuery,
}: TimeSectionHeaderProps) {
  const IconComponent = TIME_GROUP_ICONS[section.timeGroup]

  return (
    <div className='flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg border border-border/50'>
      {/* Left side - Title and stats */}
      <div className='flex items-center gap-3'>
        <Button
          variant='ghost'
          size='sm'
          onClick={onToggle}
          className='p-1 h-auto hover:bg-transparent'
          aria-label={`${section.isExpanded ? 'Collapse' : 'Expand'} ${section.displayName} section`}
        >
          {section.isExpanded ? (
            <ChevronDownIcon className='h-4 w-4' />
          ) : (
            <ChevronRightIcon className='h-4 w-4' />
          )}
        </Button>

        <div className='flex items-center gap-2'>
          <IconComponent className='h-4 w-4 text-muted-foreground' />
          <h3 className='font-medium text-sm'>{section.displayName}</h3>
        </div>
      </div>

      {/* Right side - Badges and counts */}
      <div className='flex items-center gap-2'>
        {searchQuery && stats.searchMatches > 0 && (
          <Badge variant='secondary' className='text-xs'>
            <SearchIcon className='h-3 w-3 mr-1' />
            {stats.searchMatches}
          </Badge>
        )}

        {stats.rescued > 0 && (
          <Badge variant='outline' className='text-xs'>
            ↑ {stats.rescued}
          </Badge>
        )}

        <Badge variant='default' className='text-xs'>
          {stats.total}
        </Badge>
      </div>
    </div>
  )
})
