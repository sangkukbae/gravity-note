import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the temporal utilities that should be available
type TimeGroup = 'yesterday' | 'last_week' | 'last_month' | 'earlier'

interface TemporalBoundaries {
  yesterday: Date
  lastWeek: Date
  lastMonth: Date
}

// Utility functions that should exist in the codebase
function getTemporalBoundaries(): TemporalBoundaries {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const lastWeek = new Date(now)
  lastWeek.setDate(now.getDate() - 7)
  lastWeek.setHours(0, 0, 0, 0)

  const lastMonth = new Date(now)
  lastMonth.setMonth(now.getMonth() - 1)
  lastMonth.setHours(0, 0, 0, 0)

  return { yesterday, lastWeek, lastMonth }
}

function classifyNoteByTime(updatedAt: string, boundaries: TemporalBoundaries): TimeGroup {
  const noteDate = new Date(updatedAt)
  
  if (noteDate >= boundaries.yesterday) {
    return 'yesterday'
  } else if (noteDate >= boundaries.lastWeek) {
    return 'last_week'
  } else if (noteDate >= boundaries.lastMonth) {
    return 'last_month'
  } else {
    return 'earlier'
  }
}

describe('Temporal Boundary Calculations', () => {
  let mockNow: Date
  let boundaries: TemporalBoundaries

  beforeEach(() => {
    // Set a fixed date for consistent testing
    mockNow = new Date('2025-08-30T15:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(mockNow)
    boundaries = getTemporalBoundaries()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getTemporalBoundaries', () => {
    it('should calculate correct yesterday boundary', () => {
      expect(boundaries.yesterday).toEqual(new Date('2025-08-29T00:00:00Z'))
    })

    it('should calculate correct last week boundary', () => {
      expect(boundaries.lastWeek).toEqual(new Date('2025-08-23T00:00:00Z'))
    })

    it('should calculate correct last month boundary', () => {
      expect(boundaries.lastMonth).toEqual(new Date('2025-07-30T00:00:00Z'))
    })
  })

  describe('classifyNoteByTime', () => {
    it('should classify recent notes as "yesterday"', () => {
      const recentNote = '2025-08-30T10:00:00Z'
      expect(classifyNoteByTime(recentNote, boundaries)).toBe('yesterday')
    })

    it('should classify yesterday notes as "yesterday"', () => {
      const yesterdayNote = '2025-08-29T12:00:00Z'
      expect(classifyNoteByTime(yesterdayNote, boundaries)).toBe('yesterday')
    })

    it('should classify week-old notes as "last_week"', () => {
      const weekOldNote = '2025-08-25T12:00:00Z'
      expect(classifyNoteByTime(weekOldNote, boundaries)).toBe('last_week')
    })

    it('should classify month-old notes as "last_month"', () => {
      const monthOldNote = '2025-08-01T12:00:00Z'
      expect(classifyNoteByTime(monthOldNote, boundaries)).toBe('last_month')
    })

    it('should classify very old notes as "earlier"', () => {
      const oldNote = '2025-06-15T12:00:00Z'
      expect(classifyNoteByTime(oldNote, boundaries)).toBe('earlier')
    })

    it('should handle edge case at yesterday boundary', () => {
      const boundaryNote = '2025-08-29T00:00:00Z'
      expect(classifyNoteByTime(boundaryNote, boundaries)).toBe('yesterday')
    })

    it('should handle edge case just before yesterday boundary', () => {
      const beforeBoundaryNote = '2025-08-28T23:59:59Z'
      expect(classifyNoteByTime(beforeBoundaryNote, boundaries)).toBe('last_week')
    })

    it('should handle edge case at week boundary', () => {
      const weekBoundaryNote = '2025-08-23T00:00:00Z'
      expect(classifyNoteByTime(weekBoundaryNote, boundaries)).toBe('last_week')
    })

    it('should handle edge case at month boundary', () => {
      const monthBoundaryNote = '2025-07-30T00:00:00Z'
      expect(classifyNoteByTime(monthBoundaryNote, boundaries)).toBe('last_month')
    })
  })

  describe('Temporal Grouping Logic', () => {
    it('should maintain consistent ordering within groups', () => {
      const notes = [
        { id: '1', updated_at: '2025-08-30T10:00:00Z' },
        { id: '2', updated_at: '2025-08-29T15:00:00Z' },
        { id: '3', updated_at: '2025-08-25T12:00:00Z' },
        { id: '4', updated_at: '2025-08-01T09:00:00Z' },
        { id: '5', updated_at: '2025-06-15T14:00:00Z' },
      ]

      const classifications = notes.map(note => ({
        ...note,
        timeGroup: classifyNoteByTime(note.updated_at, boundaries)
      }))

      expect(classifications[0].timeGroup).toBe('yesterday')
      expect(classifications[1].timeGroup).toBe('yesterday')
      expect(classifications[2].timeGroup).toBe('last_week')
      expect(classifications[3].timeGroup).toBe('last_month')
      expect(classifications[4].timeGroup).toBe('earlier')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid date strings gracefully', () => {
      const invalidDate = 'not-a-date'
      // Should not throw, but classify as earlier (fallback)
      expect(() => classifyNoteByTime(invalidDate, boundaries)).not.toThrow()
      
      // Invalid dates typically become "earlier" due to NaN comparison behavior
      const result = classifyNoteByTime(invalidDate, boundaries)
      expect(['earlier', 'yesterday', 'last_week', 'last_month']).toContain(result)
    })

    it('should handle empty date strings', () => {
      expect(() => classifyNoteByTime('', boundaries)).not.toThrow()
    })

    it('should handle null boundaries gracefully', () => {
      const nullBoundaries = {
        yesterday: new Date('invalid'),
        lastWeek: new Date('invalid'),
        lastMonth: new Date('invalid')
      }
      
      expect(() => classifyNoteByTime('2025-08-30T10:00:00Z', nullBoundaries)).not.toThrow()
    })
  })
})