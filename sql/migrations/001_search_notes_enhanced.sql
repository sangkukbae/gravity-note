-- Migration: Create search_notes_enhanced PostgreSQL function
-- This function provides full-text search capabilities with highlighting for Gravity Note
-- Created: 2025-08-25

-- Create the enhanced search function for full-text search with highlighting
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
    -- Generate highlighted content using ts_headline
    ts_headline(
      'english',
      COALESCE(n.content, ''),
      plainto_tsquery('english', search_query),
      'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=10, MaxFragments=3'
    ) as highlighted_content,
    -- Calculate search rank using both title and content
    (
      ts_rank_cd(
        to_tsvector('english', COALESCE(n.title, '')),
        plainto_tsquery('english', search_query)
      ) * 2.0 +  -- Weight title matches higher
      ts_rank_cd(
        to_tsvector('english', COALESCE(n.content, '')),
        plainto_tsquery('english', search_query)
      )
    ) as search_rank
  FROM notes n
  WHERE 
    n.user_id = user_uuid
    AND (
      -- Search in title
      to_tsvector('english', COALESCE(n.title, '')) @@ plainto_tsquery('english', search_query)
      OR
      -- Search in content
      to_tsvector('english', COALESCE(n.content, '')) @@ plainto_tsquery('english', search_query)
    )
  ORDER BY search_rank DESC, n.updated_at DESC
  LIMIT max_results;
END;
$$;

-- Create indexes to improve search performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_title_fts 
ON notes USING GIN (to_tsvector('english', title));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_content_fts 
ON notes USING GIN (to_tsvector('english', content));

-- Create composite index for user-specific searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_user_updated 
ON notes (user_id, updated_at DESC);

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION search_notes_enhanced(UUID, TEXT, INTEGER) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION search_notes_enhanced IS 'Enhanced full-text search function for notes with highlighting and relevance ranking';