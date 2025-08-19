# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gravity Note is a minimalist note-taking application inspired by Andrej Karpathy's "append-and-review" methodology. The app focuses on friction-free thought capture with a single stream interface where notes are displayed in reverse chronological order.

**Core Philosophy**: Eliminate organizational decisions during capture to maximize idea retention and minimize cognitive load.

## Tech Stack & Architecture

### Core Technologies

- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time subscriptions)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand (auth) + TanStack React Query (server state)
- **PWA**: next-pwa with comprehensive service worker caching
- **Package Manager**: pnpm (faster installs, strict dependency resolution)

### Key Architectural Decisions

- **Single Database Table**: All notes in one `notes` table with user isolation via Row Level Security
- **Real-time Sync**: Supabase subscriptions for cross-device synchronization
- **Authentication First**: Complete auth system implemented before note features
- **Progressive Web App**: Full offline capability with background sync
- **Zero Config Deployment**: Vercel (frontend) + Supabase (backend)

## Development Commands

### Essential Commands

```bash
# Development
pnpm dev                 # Start development server
pnpm build              # Build for production
pnpm start              # Start production server

# Quality Assurance
pnpm lint               # Run ESLint
pnpm lint:fix           # Auto-fix linting issues
pnpm format             # Format code with Prettier
pnpm format:check       # Check formatting
pnpm type-check         # TypeScript type checking

# Testing
pnpm test               # Run unit tests with Vitest
pnpm test:coverage      # Run tests with coverage report
pnpm e2e                # Run Playwright E2E tests
pnpm e2e:ui             # Run E2E tests with UI mode

# Bundle Analysis
ANALYZE=true pnpm build # Generate bundle analysis
```

### Development Workflow

Always run these commands before committing:

```bash
pnpm lint:fix && pnpm format && pnpm type-check && pnpm test
```

## Project Structure

### Directory Organization

```
app/                    # Next.js App Router pages
├── auth/              # Authentication pages (signin, signup, callback)
├── dashboard/         # Protected app pages
│   └── notes/         # Note management pages
├── globals.css        # Global styles
├── layout.tsx         # Root layout with providers
└── page.tsx           # Landing page

components/            # Reusable UI components
├── auth/              # Authentication components
├── notes/             # Note-related components (planned)
└── ui/                # shadcn/ui base components

lib/                   # Core business logic
├── actions/           # Server actions for auth
├── hooks/             # Custom React hooks (planned)
├── providers/         # React context providers
├── services/          # API service layers (planned)
├── stores/            # Zustand state stores
├── supabase/          # Supabase client configuration
└── utils/             # Utility functions

types/                 # TypeScript type definitions
├── database.ts        # Supabase generated types
└── index.ts           # Application types

tests/                 # Test organization
├── components/        # Component tests
├── integration/       # Integration tests
├── mocks/             # Test mocks and utilities
└── setup.ts           # Test configuration
```

### Key Files

- `middleware.ts`: Next.js middleware for auth session management
- `next.config.js`: PWA configuration with comprehensive caching
- `vitest.config.ts`: Testing configuration with strict coverage thresholds
- `playwright.config.ts`: E2E testing setup for multiple browsers/devices

## Database Schema & Supabase

### Current Implementation

```sql
-- Core notes table (already created)
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_rescued BOOLEAN DEFAULT FALSE,
    original_note_id UUID REFERENCES notes(id)
);

-- Performance indexes
CREATE INDEX idx_user_created ON notes (user_id, created_at DESC);
CREATE INDEX idx_content_search ON notes USING gin(to_tsvector('english', content));

-- Row Level Security policies for data isolation
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
```

### Supabase Configuration

- **Project ID**: lymablvfuvfkxznfemiy
- **Region**: AWS Seoul (ap-northeast-2)
- **Auth Providers**: Email/password + Google OAuth (configured)
- **Real-time**: Enabled for notes table

## Authentication Architecture

### Implementation Status: ✅ COMPLETE

The authentication system is fully implemented with:

1. **Supabase Auth Integration**
   - Email/password authentication with validation
   - Google OAuth (ready for production setup)
   - Protected routes with Next.js middleware
   - Server-side session management

2. **State Management**
   - Zustand store at `lib/stores/auth.ts`
   - React Query integration for server state
   - Cross-tab synchronization
   - Automatic profile creation

3. **Components** (90%+ test coverage)
   - `AuthForm`: Unified signin/signup component
   - `ProtectedRoute`: Authentication wrapper
   - `UserMenu`: Profile and logout functionality

### Key Auth Files

- `lib/supabase/client.ts`: Browser Supabase client
- `lib/supabase/server.ts`: Server-side Supabase client
- `lib/supabase/middleware.ts`: Session management
- `lib/actions/auth.ts`: Server actions for auth operations

## Testing Strategy

### Coverage Requirements

- **Global thresholds**: 70% branches, 70% functions, 80% lines/statements
- **Auth components**: 85% branches/functions, 90% lines/statements
- **Current auth coverage**: 90%+ achieved

### Test Organization

- **Unit tests**: `/tests/components/` - Component behavior and logic
- **Integration tests**: `/tests/integration/` - Complete user workflows
- **E2E tests**: `/e2e/` - Cross-browser acceptance testing
- **Mocks**: `/tests/mocks/` - Supabase and Next.js router mocks

### Test Utilities

- Custom render function with providers at `tests/utils/test-utils.tsx`
- Auth test helpers at `tests/utils/auth-test-helpers.ts`
- Comprehensive mocking for Supabase operations

## Code Style & Conventions

### TypeScript Standards

- Strict mode enabled with comprehensive type checking
- Interface definitions in `types/index.ts` for app-level types
- Database types auto-generated from Supabase schema

### Component Patterns

- Server Components by default, Client Components when state needed
- Props interfaces defined within component files
- Consistent use of shadcn/ui component library

### State Management Strategy

- **Server State**: TanStack React Query for caching and synchronization
- **Client State**: Zustand stores for global app state
- **Local State**: React useState for component-specific state

## Performance & PWA

### PWA Features (fully configured)

- Service worker with comprehensive caching strategies
- Offline functionality with background sync capability
- Install prompts for native app-like experience
- Optimized caching for fonts, images, API responses

### Performance Targets

- App launch time: < 2 seconds
- Note creation: < 100ms
- Search response: < 100ms
- Bundle size: < 500KB (gzipped)
- Lighthouse score: > 90

## Development Phases

### ✅ Phase 1 Complete (Week 1/12) - Foundation

- Next.js 14 + TypeScript setup
- Supabase integration with RLS
- Complete authentication system
- Testing infrastructure (90%+ auth coverage)
- PWA configuration
- UI foundation with shadcn/ui

### 🔄 Current Phase (Week 2/12) - Core Features

Focus areas for immediate development:

1. **Note Creation & Display** - Build core note operations
2. **Real-time Sync** - Implement Supabase subscriptions
3. **Basic Search** - PostgreSQL full-text search
4. **Offline Support** - Local storage and sync queuing

### 📋 Future Phases

- **Week 3-4**: Note rescue, mobile optimization, polish
- **Month 2**: Advanced search, UX enhancements, beta testing
- **Month 3**: Launch preparation, performance optimization

## Common Development Tasks

### Adding New Components

1. Create component in appropriate `components/` subdirectory
2. Add TypeScript interfaces for props
3. Include in shadcn/ui pattern with proper styling
4. Write comprehensive tests in `tests/components/`
5. Update type definitions if needed

### Database Changes

1. Update schema in Supabase dashboard
2. Regenerate types: `npx supabase gen types typescript`
3. Update `types/database.ts` with new schema
4. Add appropriate RLS policies for security
5. Test changes with integration tests

### Adding New Features

1. Follow test-driven development approach
2. Implement server actions in `lib/actions/`
3. Create React Query hooks for data fetching
4. Add UI components with proper accessibility
5. Ensure mobile responsiveness and PWA compatibility

## Security Considerations

### Implemented Security Measures

- Row Level Security (RLS) for complete data isolation
- HTTP-only cookies for session management
- Protected routes with authentication middleware
- Input validation and sanitization
- Security headers in Next.js configuration

### Best Practices

- Never expose Supabase service role key
- Always use RLS for database access
- Validate all user inputs on both client and server
- Use TypeScript for compile-time safety
- Regular security audits of dependencies

## Debugging & Troubleshooting

### Common Issues

- **Auth errors**: Check Supabase project settings and environment variables
- **Database errors**: Verify RLS policies and user permissions
- **Build failures**: Run type checking and linting before builds
- **Test failures**: Ensure mocks are properly configured

### Debug Tools

- React Developer Tools for component inspection
- Supabase dashboard for database queries and logs
- Vercel Analytics for performance monitoring
- Browser DevTools for PWA debugging

## Environment Variables

Required environment variables (add to `.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For production OAuth setup, configure redirect URLs in Supabase dashboard.

## Deployment

### Current Setup

- **Frontend**: Auto-deployed to Vercel on git push
- **Backend**: Managed by Supabase cloud
- **Domain**: gravity-note.vercel.app (configured in metadata)

### Production Checklist

- Environment variables configured
- OAuth providers set up with production URLs
- Database migrations applied
- Performance testing completed
- Security review passed

---

**Project Phase**: Week 1 Complete ✅ | Focus: Core Note Features (Week 2)  
**Last Updated**: August 19, 2025  
**Architecture**: Solo developer optimized with Next.js 14 + Supabase
