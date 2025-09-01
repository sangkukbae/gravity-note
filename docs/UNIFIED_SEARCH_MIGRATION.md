# Unified Search System Migration Guide

This guide documents the migration from the old multi-function search system to the new unified search architecture implemented in the command palette refactoring.

## Overview

The refactoring consolidates multiple search functions and types into a single, unified system that handles both search and browse operations efficiently.

### Before: Multi-Function Architecture

**Database Functions (3):**

- `search_notes_enhanced()` - Basic search with highlighting
- `search_notes_enhanced_grouped()` - Search with temporal grouping
- `get_notes_grouped_by_time()` - Browse with temporal grouping

**Hook Functions (4):**

- `searchNotes()` - Basic ILIKE search
- `searchNotesEnhanced()` - Enhanced search with highlighting
- `searchNotesGrouped()` - Search with temporal grouping
- `getNotesGrouped()` - Browse with temporal grouping

**Types (Multiple):**

- `EnhancedSearchResult`
- `GroupedNote`
- `GroupedNotesResponse`
- `SearchMetadata`
- `GroupedSearchMetadata`

### After: Unified Architecture

**Database Functions (1):**

- `get_notes_unified(user_uuid, search_query, max_results, group_by_time)`
  - Handles both search and browse modes
  - Optional temporal grouping
  - Built-in fallback logic

**Hook Functions (2):**

- `useUnifiedSearch()` - Standalone hook with useReducer state management
- Enhanced `useNotesMutations()` - Includes unified functions for backward compatibility

**Types (Unified):**

- `UnifiedNoteResult` - Single result format
- `UnifiedNotesResponse` - Single response format
- `UnifiedSearchMetadata` - Single metadata format
- `UnifiedSearchState` - State management types

## Database Layer Migration

### Unified Function Signature

```sql
CREATE OR REPLACE FUNCTION get_notes_unified(
  user_uuid UUID,
  search_query TEXT DEFAULT NULL,  -- NULL = browse mode
  max_results INTEGER DEFAULT 200,
  group_by_time BOOLEAN DEFAULT true
) RETURNS TABLE (
  -- All note fields plus computed fields
  id UUID,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_rescued BOOLEAN,
  original_note_id UUID,
  highlighted_content TEXT,      -- Always populated
  highlighted_title TEXT,        -- Always populated
  search_rank DOUBLE PRECISION,  -- 0.0 for browse mode
  time_group TEXT,               -- Based on group_by_time flag
  group_rank INTEGER             -- Rank within group
)
```

### Key Features

1. **Mode Detection**: Automatically switches between search/browse based on `search_query` parameter
2. **Conditional Highlighting**: Only applies highlighting in search mode
3. **Flexible Grouping**: Can disable temporal grouping with `group_by_time = false`
4. **Optimized Queries**: Single function reduces database round trips

## Hook Layer Migration

### Option 1: Standalone Hook (Recommended for New Components)

```typescript
import { useUnifiedSearch } from '@/hooks/use-unified-search'

function MyComponent() {
  const search = useUnifiedSearch()

  // Search for notes
  const handleSearch = async (query: string) => {
    try {
      const results = await search.search(query, {
        maxResults: 100,
        groupByTime: true,
        useEnhancedSearch: true
      })
      // Handle results
    } catch (error) {
      // Handle error
    }
  }

  // Browse all notes
  const handleBrowse = async () => {
    try {
      const results = await search.browse({
        maxResults: 200,
        groupByTime: true
      })
      // Handle results
    } catch (error) {
      // Handle error
    }
  }

  return (
    <div>
      <div>Query: {search.state.query}</div>
      <div>Mode: {search.state.mode}</div>
      <div>Loading: {search.state.isLoading}</div>
      <div>Results: {search.state.results?.totalNotes || 0}</div>
      {search.state.error && <div>Error: {search.state.error}</div>}
    </div>
  )
}
```

### Option 2: Enhanced Mutations Hook (For Existing Components)

```typescript
import { useNotesMutations } from '@/hooks/use-notes-mutations'

function MyComponent() {
  const {
    unifiedSearch,
    unifiedBrowse,
    unifiedState,
    setSearchQuery,
    setSearchMode,
    resetUnifiedSearch,
  } = useNotesMutations()

  // Same API as Option 1, but through mutations hook
  const handleSearch = () => unifiedSearch('my query')
  const handleBrowse = () => unifiedBrowse()
}
```

## Component Migration

### TemporalCommandPalette Updates

The command palette now supports both unified and legacy approaches:

```typescript
// New unified approach (preferred)
<TemporalCommandPalette
  open={open}
  onOpenChange={setOpen}
  onUnifiedSearch={search.search}
  onUnifiedBrowse={search.browse}
  onResultSelect={handleSelect}
/>

// Legacy approach (backward compatible)
<TemporalCommandPalette
  open={open}
  onOpenChange={setOpen}
  onSearchGrouped={legacySearchGrouped}
  onGetNotesGrouped={legacyGetNotesGrouped}
  onResultSelect={handleSelect}
/>
```

### Type Migrations

**Before:**

```typescript
import type {
  EnhancedSearchResult,
  GroupedNote,
  GroupedNotesResponse,
} from '@/types/search'

function handleResult(result: EnhancedSearchResult | GroupedNote) {
  // Handle different result types
}
```

**After:**

```typescript
import type { UnifiedNoteResult, UnifiedNotesResponse } from '@/types/unified'

function handleResult(result: UnifiedNoteResult) {
  // Single result type handles all cases
  console.log(result.search_rank) // Always available
  console.log(result.time_group) // Always available
  console.log(result.group_rank) // Always available
  console.log(result.highlighted_content) // Always available
}
```

## State Management Migration

### Before: Manual State Management

```typescript
const [query, setQuery] = useState('')
const [results, setResults] = useState([])
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState(null)
const [mode, setMode] = useState('browse')

// Manual state updates scattered throughout component
```

### After: useReducer Pattern

```typescript
const search = useUnifiedSearch()

// Predictable state transitions
search.setQuery('new query') // Automatically switches to search mode
search.search() // Sets loading, fetches, updates results
search.browse() // Sets loading, fetches, updates results
search.reset() // Resets all state
```

## Error Handling Improvements

### Automatic Fallbacks

The unified system includes automatic fallback logic:

1. **Enhanced → Basic Search**: If enhanced search fails, automatically falls back to ILIKE search
2. **Database Function → Manual Queries**: If unified function fails, falls back to manual queries
3. **Graceful Degradation**: System continues working even if some features fail

### Consistent Error States

```typescript
// All operations follow the same error handling pattern
try {
  const results = await search.search(query)
  // Success
} catch (error) {
  // Error is automatically set in state
  console.error('Search failed:', search.state.error)
}
```

## Performance Improvements

### Database Optimizations

1. **Single Function Call**: Replaces multiple database round trips with single call
2. **Conditional Processing**: Only applies expensive operations (highlighting, ranking) when needed
3. **Optimized Indexes**: Unified index supports both search and browse operations

### Client Optimizations

1. **Reduced Re-renders**: useReducer provides more predictable state updates
2. **Memoized Utilities**: Temporal boundary calculations are memoized
3. **Debounced Search**: Built-in debouncing prevents excessive API calls

## Testing Strategy

### Unit Tests

```typescript
import { renderHook, act } from '@testing-library/react'
import { useUnifiedSearch } from '@/hooks/use-unified-search'

test('unified search state transitions', async () => {
  const { result } = renderHook(() => useUnifiedSearch())

  // Test initial state
  expect(result.current.state.mode).toBe('browse')
  expect(result.current.state.query).toBe('')

  // Test query setting
  act(() => {
    result.current.setQuery('test query')
  })
  expect(result.current.state.mode).toBe('search')
  expect(result.current.state.query).toBe('test query')
})
```

### Integration Tests

```typescript
test('command palette with unified search', async () => {
  const search = useUnifiedSearch()

  render(
    <TemporalCommandPalette
      open={true}
      onOpenChange={() => {}}
      onUnifiedSearch={search.search}
      onUnifiedBrowse={search.browse}
    />
  )

  // Test search interactions
  const input = screen.getByPlaceholderText('Search notes...')
  await user.type(input, 'test query')

  // Verify results are displayed
  await waitFor(() => {
    expect(screen.getByText(/Found \d+ results/)).toBeInTheDocument()
  })
})
```

## Migration Checklist

### Phase 1: Database ✅

- [x] Create `get_notes_unified` function
- [x] Test with existing data
- [x] Verify performance

### Phase 2: Types ✅

- [x] Create `UnifiedNoteResult` interface
- [x] Create `UnifiedNotesResponse` interface
- [x] Update type exports
- [x] Add legacy compatibility types

### Phase 3: Hooks ✅

- [x] Create `useUnifiedSearch` hook with useReducer
- [x] Add unified functions to `useNotesMutations`
- [x] Maintain backward compatibility

### Phase 4: Components ✅

- [x] Update `TemporalCommandPalette` to support both approaches
- [x] Add metadata display for unified results
- [x] Handle both result types in selection

### Phase 5: Documentation ✅

- [x] Create migration guide
- [x] Add example usage component
- [x] Document testing patterns

## Backward Compatibility

The migration maintains full backward compatibility:

1. **Legacy Functions**: All old search functions remain available
2. **Legacy Types**: Old types are re-exported for compatibility
3. **Component Props**: Command palette supports both old and new prop patterns
4. **Gradual Migration**: Components can migrate individually

## Future Improvements

1. **Remove Legacy Code**: After all components migrate, remove deprecated functions
2. **Enhanced Indexing**: Add compound indexes for better performance
3. **Real-time Updates**: Integrate with real-time subscriptions
4. **Analytics**: Add search analytics and performance monitoring

## Troubleshooting

### Common Issues

1. **Type Errors**: Import from `@/types/unified` instead of individual type files
2. **Missing Functions**: Ensure using `useUnifiedSearch` or updated `useNotesMutations`
3. **Database Errors**: Check that `get_notes_unified` function exists in database
4. **Performance**: Monitor search times and adjust `maxResults` parameter

### Debug Tips

```typescript
// Enable debug logging in unified search
const search = useUnifiedSearch()

// Check state in development
console.log('Search state:', search.state)

// Monitor performance
console.log('Search metadata:', search.state.results?.metadata)
```

This migration provides a more maintainable, performant, and type-safe search system while preserving backward compatibility during the transition period.
