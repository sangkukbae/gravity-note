# Database Migrations

This directory contains SQL migration files for the Gravity Note database.

## Migration Files

### 001_search_notes_enhanced.sql

Creates the `search_notes_enhanced` PostgreSQL function that provides:

- Full-text search capabilities using PostgreSQL's built-in search features
- Search result highlighting with `<mark>` tags
- Relevance ranking using `ts_rank_cd`
- Performance optimizations with GIN indexes

## Running Migrations

These SQL files need to be executed in your Supabase database either through:

1. **Supabase Dashboard**: Navigate to SQL Editor and run the migration files
2. **Supabase CLI**: Use `supabase db push` if configured with local development
3. **Manual execution**: Connect to your PostgreSQL database and execute the SQL

## Performance Notes

- The migration creates GIN indexes for full-text search which may take time on large datasets
- Indexes are created with `CONCURRENTLY` to avoid locking during creation
- Search function includes input validation and handles edge cases

## Security

- Function is granted only to `authenticated` role
- Input parameters are properly validated
- Query uses parameterized inputs to prevent SQL injection
