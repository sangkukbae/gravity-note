-- Migration: Create unified notes function for search and browse modes
-- This function consolidates search_notes_enhanced, search_notes_enhanced_grouped, and get_notes_grouped_by_time
-- Created: 2025-08-31

-- Create the unified function for both search and browse operations
CREATE OR REPLACE FUNCTION get_notes_unified(
  user_uuid UUID,
  search_query TEXT DEFAULT NULL,  -- NULL = browse mode, non-NULL = search mode
  max_results INTEGER DEFAULT 200,
  group_by_time BOOLEAN DEFAULT true
) RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_rescued BOOLEAN,
  original_note_id UUID,
  highlighted_content TEXT,
  highlighted_title TEXT,
  search_rank REAL,
  time_group TEXT,
  group_rank INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
  yesterday_start TIMESTAMPTZ := date_trunc('day', NOW() - INTERVAL '1 day');
  week_start TIMESTAMPTZ := date_trunc('week', NOW() - INTERVAL '1 week');
  month_start TIMESTAMPTZ := date_trunc('month', NOW() - INTERVAL '1 month');
  is_search_mode BOOLEAN := search_query IS NOT NULL AND trim(search_query) != '';
BEGIN
  -- Validate input parameters
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;

  -- Return unified results with conditional processing for search vs browse
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.content,
    n.created_at::timestamptz,
    n.updated_at::timestamptz,
    n.is_rescued,
    n.original_note_id,
    -- Conditional highlighting (only for search mode)
    CASE 
      WHEN is_search_mode THEN 
        ts_headline(
          'simple',
          COALESCE(n.content, ''),
          plainto_tsquery('simple', search_query),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=10, MaxFragments=3'
        )
      ELSE n.content
    END as highlighted_content,
    -- Conditional title highlighting (only for search mode)
    CASE 
      WHEN is_search_mode AND n.title IS NOT NULL THEN 
        ts_headline(
          'simple',
          n.title,
          plainto_tsquery('simple', search_query),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=20, MinWords=5, MaxFragments=1'
        )
      ELSE n.title
    END as highlighted_title,
    -- Conditional search ranking (only for search mode, 1.0 for browse mode)
    (CASE 
      WHEN is_search_mode THEN 
        (
          ts_rank_cd(
            to_tsvector('simple', COALESCE(n.title, '')),
            plainto_tsquery('simple', search_query)
          ) * 2.0 +  -- Weight title matches higher
          ts_rank_cd(
            to_tsvector('simple', COALESCE(n.content, '')),
            plainto_tsquery('simple', search_query)
          )
        )
      ELSE 1.0
    END)::real as search_rank,
    -- Time group classification
    CASE
      WHEN n.updated_at >= yesterday_start THEN 'yesterday'
      WHEN n.updated_at >= week_start THEN 'last_week'
      WHEN n.updated_at >= month_start THEN 'last_month'
      ELSE 'earlier'
    END as time_group,
    -- Rank within time group
    ROW_NUMBER() OVER (
      PARTITION BY CASE
        WHEN n.updated_at >= yesterday_start THEN 'yesterday'
        WHEN n.updated_at >= week_start THEN 'last_week'
        WHEN n.updated_at >= month_start THEN 'last_month'
        ELSE 'earlier'
      END
      ORDER BY 
        CASE 
          WHEN is_search_mode THEN 
            (
              ts_rank_cd(
                to_tsvector('simple', COALESCE(n.title, '')),
                plainto_tsquery('simple', search_query)
              ) * 2.0 +
              ts_rank_cd(
                to_tsvector('simple', COALESCE(n.content, '')),
                plainto_tsquery('simple', search_query)
              )
            )
          ELSE 0
        END DESC, 
        n.updated_at DESC
    )::INTEGER as group_rank
  FROM notes n
  WHERE 
    n.user_id = user_uuid
    AND (
      -- Browse mode: return all notes
      NOT is_search_mode
      OR
      -- Search mode: filter by search query
      (
        is_search_mode 
        AND (
          to_tsvector('simple', COALESCE(n.title, '')) @@ plainto_tsquery('simple', search_query)
          OR
          to_tsvector('simple', COALESCE(n.content, '')) @@ plainto_tsquery('simple', search_query)
        )
      )
    )
  ORDER BY 
    CASE WHEN is_search_mode THEN search_rank ELSE 0 END DESC,
    n.updated_at DESC
  LIMIT max_results;
END;
$$;

-- Create composite index for optimized user-specific searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_user_fts_composite 
ON notes USING GIN (user_id, (to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(content, ''))));

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_notes_unified(UUID, TEXT, INTEGER, BOOLEAN) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_notes_unified IS 'Unified function for both search and browse operations with temporal grouping';
