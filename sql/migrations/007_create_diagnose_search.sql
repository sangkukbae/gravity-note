-- Migration: Create diagnose_search function for search diagnostics
-- Returns aggregated counts for a given user and query

CREATE OR REPLACE FUNCTION public.diagnose_search(
  user_uuid uuid,
  q text,
  q_expanded text
)
RETURNS TABLE (
  raw_asdf integer,
  norm_asdf integer,
  loose_norm integer,
  has_zwsp integer,
  space_asdf integer,
  total integer
)
LANGUAGE sql
AS $$
  with scoped as (
    select
      n.id,
      n.content,
      coalesce(n.title, '') as title,
      __gn_normalize_text(n.content) as c_norm,
      __gn_normalize_text(coalesce(n.title, '')) as t_norm
    from public.notes n
    where n.user_id = user_uuid
  )
  select
    sum( ((content ilike ('%'||q||'%'))::int + (title ilike ('%'||q||'%'))::int) ) as raw_asdf,
    sum( ((c_norm  ilike ('%'||q||'%'))::int + (t_norm  ilike ('%'||q||'%'))::int) ) as norm_asdf,
    sum( ((c_norm  ilike q_expanded     )::int + (t_norm  ilike q_expanded     )::int) ) as loose_norm,
    sum( (content ~ U&'\\200B')::int ) as has_zwsp,
    sum( (content ~ ('\\s'||q))::int ) as space_asdf,
    count(*) as total
  from scoped;
$$;

GRANT EXECUTE ON FUNCTION public.diagnose_search(uuid, text, text) TO authenticated;

