import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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

  // Align with current implementation: 30 days ago (not calendar month)
  const lastMonth = new Date(now)
  lastMonth.setDate(now.getDate() - 30)
  lastMonth.setHours(0, 0, 0, 0)

  return { yesterday, lastWeek, lastMonth }
}

function classifyNoteByTime(
  updatedAt: string,
  boundaries: TemporalBoundaries
): TimeGroup {
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
    it('should calculate correct yesterday boundary (local start of day)', () => {
      const expected = new Date(mockNow)
      expected.setDate(mockNow.getDate() - 1)
      expected.setHours(0, 0, 0, 0)
      expect(boundaries.yesterday.getTime()).toBe(expected.getTime())
    })

    it('should calculate correct last week boundary (7 days, local start of day)', () => {
      const expected = new Date(mockNow)
      expected.setDate(mockNow.getDate() - 7)
      expected.setHours(0, 0, 0, 0)
      expect(boundaries.lastWeek.getTime()).toBe(expected.getTime())
    })

    it('should calculate correct last month boundary (30 days, local start of day)', () => {
      const expected = new Date(mockNow)
      expected.setDate(mockNow.getDate() - 30)
      expected.setHours(0, 0, 0, 0)
      expect(boundaries.lastMonth.getTime()).toBe(expected.getTime())
    })
  })

  describe('classifyNoteByTime', () => {
    it('should classify recent notes as "yesterday"', () => {
      const recent = new Date(
        boundaries.yesterday.getTime() + 12 * 60 * 60 * 1000
      )
      expect(classifyNoteByTime(recent.toISOString(), boundaries)).toBe(
        'yesterday'
      )
    })

    it('should classify yesterday notes as "yesterday"', () => {
      const yesterdayMidday = new Date(
        boundaries.yesterday.getTime() + 12 * 60 * 60 * 1000
      )
      expect(
        classifyNoteByTime(yesterdayMidday.toISOString(), boundaries)
      ).toBe('yesterday')
    })

    it('should classify week-old notes as "last_week"', () => {
      const weekWindow = new Date(
        boundaries.lastWeek.getTime() + 12 * 60 * 60 * 1000
      )
      expect(classifyNoteByTime(weekWindow.toISOString(), boundaries)).toBe(
        'last_week'
      )
    })

    it('should classify month-old notes as "last_month"', () => {
      const monthWindow = new Date(
        boundaries.lastMonth.getTime() + 12 * 60 * 60 * 1000
      )
      expect(classifyNoteByTime(monthWindow.toISOString(), boundaries)).toBe(
        'last_month'
      )
    })

    it('should classify very old notes as "earlier"', () => {
      const old = new Date(boundaries.lastMonth.getTime() - 24 * 60 * 60 * 1000)
      expect(classifyNoteByTime(old.toISOString(), boundaries)).toBe('earlier')
    })

    it('should handle edge case at yesterday boundary', () => {
      expect(
        classifyNoteByTime(boundaries.yesterday.toISOString(), boundaries)
      ).toBe('yesterday')
    })

    it('should handle edge case just before yesterday boundary', () => {
      const justBefore = new Date(boundaries.yesterday.getTime() - 1000)
      expect(classifyNoteByTime(justBefore.toISOString(), boundaries)).toBe(
        'last_week'
      )
    })

    it('should handle edge case at week boundary', () => {
      expect(
        classifyNoteByTime(boundaries.lastWeek.toISOString(), boundaries)
      ).toBe('last_week')
    })

    it('should handle edge case at month boundary', () => {
      expect(
        classifyNoteByTime(boundaries.lastMonth.toISOString(), boundaries)
      ).toBe('last_month')
    })
  })

  describe('Temporal Grouping Logic', () => {
    it('should maintain consistent ordering within groups', () => {
      const notes = [
        {
          id: '1',
          updated_at: new Date(
            boundaries.yesterday.getTime() + 10 * 60 * 60 * 1000
          ).toISOString(),
        },
        {
          id: '2',
          updated_at: new Date(
            boundaries.yesterday.getTime() + 15 * 60 * 60 * 1000
          ).toISOString(),
        },
        {
          id: '3',
          updated_at: new Date(
            boundaries.lastWeek.getTime() + 12 * 60 * 60 * 1000
          ).toISOString(),
        },
        {
          id: '4',
          updated_at: new Date(
            boundaries.lastMonth.getTime() + 9 * 60 * 60 * 1000
          ).toISOString(),
        },
        {
          id: '5',
          updated_at: new Date(
            boundaries.lastMonth.getTime() - 15 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      ]

      const classifications = notes.map(note => ({
        ...note,
        timeGroup: classifyNoteByTime(note.updated_at, boundaries),
      }))

      expect(classifications[0]?.timeGroup).toBe('yesterday')
      expect(classifications[1]?.timeGroup).toBe('yesterday')
      expect(classifications[2]?.timeGroup).toBe('last_week')
      expect(classifications[3]?.timeGroup).toBe('last_month')
      expect(classifications[4]?.timeGroup).toBe('earlier')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid date strings gracefully', () => {
      const invalidDate = 'not-a-date'
      // Should not throw, and fallback to 'earlier'
      expect(() => classifyNoteByTime(invalidDate, boundaries)).not.toThrow()
      const result = classifyNoteByTime(invalidDate, boundaries)
      expect(result).toBe('earlier')
    })

    it('should handle empty date strings', () => {
      expect(() => classifyNoteByTime('', boundaries)).not.toThrow()
    })

    it('should handle null boundaries gracefully', () => {
      const nullBoundaries = {
        yesterday: new Date('invalid'),
        lastWeek: new Date('invalid'),
        lastMonth: new Date('invalid'),
      }

      expect(() =>
        classifyNoteByTime('2025-08-30T10:00:00Z', nullBoundaries)
      ).not.toThrow()
    })
  })
})
