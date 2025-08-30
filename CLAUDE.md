# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gravity Note** is a revolutionary minimalist note-taking application inspired by Andrej Karpathy's "append-and-review" methodology. The app provides a single, time-reverse chronological stream where users can instantly capture thoughts without the cognitive overhead of organization, folders, or tags.

## Core Development Commands

### Package Manager

This project uses **pnpm** for package management. Always use pnpm commands:

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### Quality Assurance Commands

Run these commands before committing or when developing:

```bash
# Linting
pnpm lint
pnpm lint:fix

# Type checking
pnpm type-check

# Code formatting
pnpm format
pnpm format:check
```

### Testing Commands

The project uses Vitest for unit tests and Playwright for E2E tests:

```bash
# Unit tests
pnpm test
pnpm test:coverage

# E2E tests
pnpm e2e
pnpm e2e:ui
```

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **State Management**: Zustand for auth, React Query for server state
- **Authentication**: Supabase Auth with OAuth providers
- **Testing**: Vitest (unit), Playwright (E2E)
- **Deployment**: Vercel (frontend), Supabase (backend)

### Project Structure

#### Core Directories

- `app/` - Next.js App Router pages and layouts
- `components/` - Reusable UI components organized by domain
- `lib/` - Core utilities, providers, and integrations
- `hooks/` - Custom React hooks for data fetching and mutations
- `types/` - TypeScript type definitions
- `tests/` - Unit and integration tests
- `e2e/` - End-to-end tests

#### Key Files

- `app/layout.tsx` - Root layout with providers and global settings
- `components/notes/notes-container.tsx` - Main notes interface component
- `hooks/use-notes-mutations.ts` - Primary data operations for notes
- `lib/supabase/` - Database client and real-time configuration
- `types/database.ts` - Auto-generated Supabase types

### Database Schema

The application uses two main tables:

#### `profiles` table

- Extends Supabase auth.users with additional user metadata
- Fields: id, email, full_name, avatar_url, timestamps

#### `notes` table

- Core entity storing user thoughts and ideas
- Fields: id, user_id, title, content, created_at, updated_at, is_rescued, original_note_id
- Uses PostgreSQL full-text search for enhanced search capabilities

### Component Architecture

#### Notes System

- **NotesContainer**: Main orchestrator component handling state and interactions
- **NoteList**: Displays the chronological stream of notes
- **NoteInput**: Always-available input field for quick capture
- **NoteItem**: Individual note display with rescue functionality
- **SearchBar**: Full-text search interface

#### Authentication Flow

- **AuthProvider**: Zustand-based auth state management
- **ProtectedRoute**: Route guards for authenticated areas
- **UserMenu**: Profile management and sign-out

### State Management Strategy

#### Server State (React Query)

- Notes fetching and caching
- Real-time synchronization with Supabase
- Optimistic updates for better UX

#### Client State (Zustand)

- Authentication status and user profile
- UI state (modals, themes, preferences)

### Real-time Features

The application uses Supabase real-time subscriptions for:

- Live note creation across devices
- Instant note updates (rescue operations)
- Multi-device synchronization

Key files:

- `lib/supabase/realtime.ts` - Real-time subscription logic
- `hooks/use-notes-realtime.ts` - React integration for live updates

### Search Implementation

Two-tier search system:

1. **Enhanced Search**: PostgreSQL full-text search with highlighting
2. **Basic Search**: ILIKE fallback for short queries or when enhanced search fails

Search is implemented in `hooks/use-notes-mutations.ts` with automatic fallback logic.

## Development Patterns

### Component Guidelines

- Use TypeScript with strict typing
- Implement proper error boundaries and loading states
- Follow React Query patterns for server state
- Use Tailwind CSS with shadcn/ui components
- Implement responsive design for mobile-first approach

### Data Fetching Patterns

- Use React Query for all server state management
- Implement optimistic updates for immediate user feedback
- Handle real-time updates with proper conflict resolution
- Always include error handling and loading states

### Performance Considerations

- Components use React.memo where appropriate
- Virtual scrolling for large note lists (react-window)
- Debounced search to prevent excessive API calls
- Optimized images and lazy loading

### Security Practices

- Row Level Security (RLS) enabled on all Supabase tables
- User-specific data access enforced at database level
- Environment variables for sensitive configuration
- HTTPS-only in production

## Testing Strategy

### Unit Tests (Vitest)

- Component testing with React Testing Library
- Hook testing for custom React hooks
- Store testing for Zustand state management
- Located in `tests/` directory

### E2E Tests (Playwright)

- Authentication flows
- Core note operations (create, rescue, search)
- Cross-browser compatibility
- Located in `e2e/` directory

### Test Commands

```bash
# Run all unit tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm e2e

# Run E2E tests with UI
pnpm e2e:ui
```

## Environment Configuration

### Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development Setup

1. Clone repository
2. Run `pnpm install`
3. Set up Supabase project and configure environment variables
4. Run `pnpm dev` to start development server

## Key Implementation Details

### Note Creation Flow

1. User types in always-available input field or modal
2. Content submitted via `useNotesMutations.createNote`
3. Optimistic update adds note to local state immediately
4. Server creates note in Supabase with automatic timestamp
5. Real-time subscription updates all connected clients

### Rescue Functionality

- "Rescue" brings old notes back to the top of the stream
- Updates `updated_at` timestamp and sets `is_rescued: true`
- Maintains immutable history by preserving original note
- Re-sorts entire stream by `updated_at` descending

### Search Architecture

- Primary: PostgreSQL full-text search with ranking and highlighting
- Fallback: Basic ILIKE search for compatibility
- Real-time filtering of note stream
- Search state managed independently from main notes list

## Deployment Configuration

### Vercel Settings

- Build command: `pnpm build`
- Node.js version: 18+
- Environment variables configured in Vercel dashboard
- Automatic deployments on push to main branch

### Supabase Configuration

- Database migrations in `supabase/migrations/`
- Row Level Security policies defined per table
- Real-time enabled for `notes` table
- Full-text search function: `search_notes_enhanced`

## Philosophy & Design Principles

The application embodies extreme minimalism:

- **Single stream interface** - no folders, tags, or organization
- **Gravity metaphor** - important notes naturally rise through review
- **Frictionless capture** - immediate input without decisions
- **Natural review cycles** - periodic scanning and rescue of valuable ideas
- **Time as structure** - chronological ordering as the only organizing principle

This philosophy influences every design and implementation decision in the codebase.
