-- Migration: Create temporal grouping database functions
-- This migration adds database functions for temporal note grouping and enhanced search
-- Created: 2025-08-30

-- Create search_notes_enhanced_grouped function for temporal search
CREATE OR REPLACE FUNCTION search_notes_enhanced_grouped(
  user_uuid UUID,
  search_query TEXT,
  max_results INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  highlighted_content TEXT,
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
BEGIN
  -- Validate input parameters
  IF user_uuid IS NULL OR search_query IS NULL OR trim(search_query) = '' THEN
    RETURN;
  END IF;

  -- Return search results with time group classification
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.content,
    n.created_at,
    n.updated_at,
    -- Generate highlighted content using ts_headline
    ts_headline(
      'simple',
      COALESCE(n.content, ''),
      plainto_tsquery('simple', search_query),
      'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=10, MaxFragments=3'
    ) as highlighted_content,
    -- Calculate search rank using both title and content
    (
      ts_rank_cd(
        to_tsvector('simple', COALESCE(n.title, '')),
        plainto_tsquery('simple', search_query)
      ) * 2.0 +  -- Weight title matches higher
      ts_rank_cd(
        to_tsvector('simple', COALESCE(n.content, '')),
        plainto_tsquery('simple', search_query)
      )
    ) as search_rank,
    -- Classify notes by time group
    CASE
      WHEN n.updated_at >= yesterday_start THEN 'yesterday'
      WHEN n.updated_at >= week_start THEN 'last_week'
      WHEN n.updated_at >= month_start THEN 'last_month'
      ELSE 'earlier'
    END as time_group,
    -- Rank within time group (1 is best)
    ROW_NUMBER() OVER (
      PARTITION BY CASE
        WHEN n.updated_at >= yesterday_start THEN 'yesterday'
        WHEN n.updated_at >= week_start THEN 'last_week'
        WHEN n.updated_at >= month_start THEN 'last_month'
        ELSE 'earlier'
      END
      ORDER BY (
        ts_rank_cd(
          to_tsvector('simple', COALESCE(n.title, '')),
          plainto_tsquery('simple', search_query)
        ) * 2.0 +
        ts_rank_cd(
          to_tsvector('simple', COALESCE(n.content, '')),
          plainto_tsquery('simple', search_query)
        )
      ) DESC, n.updated_at DESC
    )::INTEGER as group_rank
  FROM notes n
  WHERE 
    n.user_id = user_uuid
    AND (
      -- Search in title
      to_tsvector('simple', COALESCE(n.title, '')) @@ plainto_tsquery('simple', search_query)
      OR
      -- Search in content
      to_tsvector('simple', COALESCE(n.content, '')) @@ plainto_tsquery('simple', search_query)
    )
  ORDER BY search_rank DESC, n.updated_at DESC
  LIMIT max_results;
END;
$$;

-- Create get_notes_grouped_by_time function for temporal note retrieval
CREATE OR REPLACE FUNCTION get_notes_grouped_by_time(
  user_uuid UUID,
  max_results INTEGER DEFAULT 100
) RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_rescued BOOLEAN,
  original_note_id UUID,
  time_group TEXT,
  group_rank INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
  yesterday_start TIMESTAMPTZ := date_trunc('day', NOW() - INTERVAL '1 day');
  week_start TIMESTAMPTZ := date_trunc('week', NOW() - INTERVAL '1 week');
  month_start TIMESTAMPTZ := date_trunc('month', NOW() - INTERVAL '1 month');
BEGIN
  -- Validate input parameters
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;

  -- Return notes grouped by time periods
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.content,
    n.created_at,
    n.updated_at,
    n.is_rescued,
    n.original_note_id,
    -- Classify notes by time group
    CASE
      WHEN n.updated_at >= yesterday_start THEN 'yesterday'
      WHEN n.updated_at >= week_start THEN 'last_week'
      WHEN n.updated_at >= month_start THEN 'last_month'
      ELSE 'earlier'
    END as time_group,
    -- Rank within time group by updated_at
    ROW_NUMBER() OVER (
      PARTITION BY CASE
        WHEN n.updated_at >= yesterday_start THEN 'yesterday'
        WHEN n.updated_at >= week_start THEN 'last_week'
        WHEN n.updated_at >= month_start THEN 'last_month'
        ELSE 'earlier'
      END
      ORDER BY n.updated_at DESC
    )::INTEGER as group_rank
  FROM notes n
  WHERE n.user_id = user_uuid
  ORDER BY n.updated_at DESC
  LIMIT max_results;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION search_notes_enhanced_grouped(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notes_grouped_by_time(UUID, INTEGER) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION search_notes_enhanced_grouped IS 'Enhanced search with temporal grouping for notes';
COMMENT ON FUNCTION get_notes_grouped_by_time IS 'Retrieve notes grouped by time periods for temporal display';