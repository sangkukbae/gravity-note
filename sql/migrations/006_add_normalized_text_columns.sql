-- Migration: Add normalized text columns and trigram indexes for robust substring search
-- Purpose: Strip invisible Unicode (ZWSP/ZWNJ/ZWJ/BOM) at index/query time

-- Helper to remove specific invisible characters using Unicode escapes
CREATE OR REPLACE FUNCTION __gn_normalize_text(t text)
RETURNS text
LANGUAGE sql
AS $$
  SELECT regexp_replace(coalesce(t, ''), U&'[\200B\200C\200D\FEFF]', '', 'g')
$$;

-- Add generated columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notes' AND column_name = 'content_norm'
  ) THEN
    ALTER TABLE public.notes
      ADD COLUMN content_norm TEXT GENERATED ALWAYS AS (__gn_normalize_text(content)) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notes' AND column_name = 'title_norm'
  ) THEN
    ALTER TABLE public.notes
      ADD COLUMN title_norm TEXT GENERATED ALWAYS AS (
        CASE WHEN title IS NULL THEN NULL ELSE __gn_normalize_text(title) END
      ) STORED;
  END IF;
END$$;

-- Ensure pg_trgm is available
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes on normalized columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_content_norm_trgm
  ON public.notes USING GIN (content_norm gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_title_norm_trgm
  ON public.notes USING GIN (title_norm gin_trgm_ops);

COMMENT ON COLUMN public.notes.content_norm IS 'Normalized content (ZWSP/ZWNJ/ZWJ/BOM removed) for substring search';
COMMENT ON COLUMN public.notes.title_norm IS 'Normalized title (ZWSP/ZWNJ/ZWJ/BOM removed) for substring search';

