-- Migration: Fix Korean text search support by switching from 'english' to 'simple' text search configuration
-- This fixes the issue where Korean characters were being filtered out by English language processing
-- Created: 2025-08-30

-- First, drop the existing indexes that use 'english' configuration
DROP INDEX CONCURRENTLY IF EXISTS idx_notes_title_fts;
DROP INDEX CONCURRENTLY IF EXISTS idx_notes_content_fts;

-- Recreate the enhanced search function with 'simple' configuration for universal language support
CREATE OR REPLACE FUNCTION search_notes_enhanced(
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
  search_rank REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate input parameters
  IF user_uuid IS NULL OR search_query IS NULL OR trim(search_query) = '' THEN
    RETURN;
  END IF;

  -- Sanitize and prepare the search query for PostgreSQL full-text search
  -- Convert to tsquery format and handle potential malformed queries
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.content,
    n.created_at,
    n.updated_at,
    -- Generate highlighted content using ts_headline with 'simple' configuration
    ts_headline(
      'simple',
      COALESCE(n.content, ''),
      plainto_tsquery('simple', search_query),
      'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=10, MaxFragments=3'
    ) as highlighted_content,
    -- Calculate search rank using both title and content with 'simple' configuration
    (
      ts_rank_cd(
        to_tsvector('simple', COALESCE(n.title, '')),
        plainto_tsquery('simple', search_query)
      ) * 2.0 +  -- Weight title matches higher
      ts_rank_cd(
        to_tsvector('simple', COALESCE(n.content, '')),
        plainto_tsquery('simple', search_query)
      )
    ) as search_rank
  FROM notes n
  WHERE 
    n.user_id = user_uuid
    AND (
      -- Search in title using 'simple' configuration
      to_tsvector('simple', COALESCE(n.title, '')) @@ plainto_tsquery('simple', search_query)
      OR
      -- Search in content using 'simple' configuration
      to_tsvector('simple', COALESCE(n.content, '')) @@ plainto_tsquery('simple', search_query)
    )
  ORDER BY search_rank DESC, n.updated_at DESC
  LIMIT max_results;
END;
$$;

-- Recreate indexes with 'simple' configuration for universal language support
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_title_fts 
ON notes USING GIN (to_tsvector('simple', title));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_content_fts 
ON notes USING GIN (to_tsvector('simple', content));

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION search_notes_enhanced(UUID, TEXT, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION search_notes_enhanced IS 'Enhanced full-text search function for notes with universal language support, highlighting and relevance ranking';