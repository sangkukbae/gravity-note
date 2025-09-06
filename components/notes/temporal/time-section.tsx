'use client'

import { memo, useMemo } from 'react'
import { NoteItem } from '../note-item'
import { TimeSectionHeader } from './time-section-header'
import { cn } from '@/lib/utils'
import type {
  NoteTimeSection,
  GroupedNote,
  TimeGroup,
  TimeSectionStats,
} from '@/types/temporal'

interface TimeSectionProps {
  section: NoteTimeSection
  onRescue?: (noteId: string) => Promise<void>
  isRescuing?: boolean
  rescuingId?: string | undefined
  searchQuery?: string | undefined
  onToggleSection?: (timeGroup: TimeGroup) => void
  showSectionDivider?: boolean
  enableVirtualization?: boolean
  // Whether this section is the first section on the page.
  // We only show the rescued badge for the first note of the first section.
  isFirstSection?: boolean
}

export const TimeSection = memo(function TimeSection({
  section,
  onRescue,
  isRescuing = false,
  rescuingId,
  searchQuery,
  onToggleSection,
  showSectionDivider = false,
  enableVirtualization = false, // For future implementation
  isFirstSection = false,
}: TimeSectionProps) {
  // Memoized section statistics
  const sectionStats: TimeSectionStats = useMemo(() => {
    const rescuedCount = section.notes.filter(note => note.is_rescued).length

    // For search matches, check if highlighting differs from original content
    const searchMatches = searchQuery
      ? section.notes.filter(
          note =>
            (note.highlighted_content &&
              note.highlighted_content !== note.content) ||
            (note.highlighted_title && note.highlighted_title !== note.title)
        ).length
      : 0

    return {
      total: section.totalCount,
      rescued: rescuedCount,
      searchMatches: searchMatches,
    }
  }, [section.notes, section.totalCount, searchQuery])

  // Handle section toggle
  const handleToggle = () => {
    onToggleSection?.(section.timeGroup)
  }

  // Render individual note
  const renderNote = (note: GroupedNote, index: number) => {
    const isCurrentlyRescuing = isRescuing && rescuingId === note.id
    const isFirstInSection = index === 0

    // Use enhanced content if available (from search results)
    const noteWithEnhancements = {
      ...note,
      content: note.highlighted_content || note.content,
      title:
        note.highlighted_title !== undefined
          ? note.highlighted_title
          : note.title,
    }

    return (
      <div
        key={note.id}
        className={cn('px-4', !isFirstInSection && 'border-t border-border/30')}
      >
        <NoteItem
          note={noteWithEnhancements}
          isRescuing={isCurrentlyRescuing}
          showRescueButton={!isFirstInSection} // Don't show rescue for first note in section
          showDivider={false} // Handled by container
          showRescuedBadge={
            isFirstSection && isFirstInSection && Boolean(note.is_rescued)
          }
          {...(onRescue ? { onRescue } : {})}
        />
      </div>
    )
  }

  return (
    <section className='w-full'>
      {/* Section Header */}
      <TimeSectionHeader
        section={section}
        stats={sectionStats}
        onToggle={handleToggle}
        searchQuery={searchQuery}
      />

      {/* Notes List */}
      {section.isExpanded && (
        <div className='mt-2'>
          {enableVirtualization && section.notes.length > 50 ? (
            // TODO: Implement virtualization for very long lists
            // For now, just render normally with a note about virtualization
            <div className='space-y-0 bg-background border border-border/50 rounded-lg overflow-hidden'>
              <div className='p-2 text-xs text-muted-foreground bg-muted/20 border-b border-border/30'>
                Note: Virtualization not yet implemented for{' '}
                {section.notes.length} notes
              </div>
              {section.notes
                .slice(0, 50)
                .map((note, index) => renderNote(note, index))}
              {section.notes.length > 50 && (
                <div className='p-4 text-center text-sm text-muted-foreground'>
                  ... and {section.notes.length - 50} more notes
                </div>
              )}
            </div>
          ) : (
            <div className='space-y-0 bg-background border border-border/50 rounded-lg overflow-hidden'>
              {section.notes.map((note, index) => renderNote(note, index))}
            </div>
          )}
        </div>
      )}

      {/* Section Divider */}
      {showSectionDivider && <div className='mt-8 border-b border-border/30' />}
    </section>
  )
})
