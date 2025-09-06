-- Enable trigram indexes to optimize ILIKE substring search
-- Safe to run multiple times

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Title trigram index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_title_trgm
ON notes USING GIN (title gin_trgm_ops);

-- Content trigram index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_content_trgm
ON notes USING GIN (content gin_trgm_ops);

-- Optional composite to aid user_id filtering with ILIKE scans
-- Note: Postgres cannot use two indexes for a single table scan in many cases,
-- but this can still help certain plans. Keep separate indexes above as primary.
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_user_content_trgm
-- ON notes USING GIN ((user_id::text || ' ' || content) gin_trgm_ops);

