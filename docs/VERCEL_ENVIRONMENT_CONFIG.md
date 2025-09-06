# Vercel Environment Configuration Guide

## Overview

This document outlines the required environment variable configuration for the Gravity Note application to work correctly in production, particularly for OAuth authentication flows.

## Critical OAuth Redirect Issue Resolution

### Problem
Google OAuth authentication from production (`https://gravity-note.vercel.app/auth/signin`) was redirecting users to `http://localhost:3000/?code=...` instead of staying on the production domain.

### Root Cause
Missing `NEXT_PUBLIC_BASE_URL` environment variable in the Vercel production deployment, causing the application to fall back to development defaults.

### Solution Implemented
Enhanced URL resolution with multiple fallback layers:

1. **Runtime browser detection** - `window.location.origin` (most reliable)
2. **Environment variables** - `NEXT_PUBLIC_BASE_URL` 
3. **Vercel automatic variables** - `VERCEL_URL`
4. **Production domain detection** - HTTPS enforcement for known domains
5. **Development fallback** - `http://localhost:3000`

## Required Vercel Environment Variables

### Production Environment

Set these variables in the Vercel Dashboard (Project Settings → Environment Variables):

```bash
# Critical: Base URL for OAuth redirects
NEXT_PUBLIC_BASE_URL=https://gravity-note.vercel.app

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://lymablvfuvfkxznfemiy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=gravity-note
SENTRY_AUTH_TOKEN=your_sentry_auth_token

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_SENTRY=true
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_OFFLINE_ENABLED=true
NEXT_PUBLIC_SENTRY_REPLAY=true
NEXT_PUBLIC_SENTRY_PROFILING=true
NEXT_PUBLIC_SENTRY_TRACING=true
```

### Environment Variable Scopes

Set the following scopes for each environment variable:

- **Production**: All production deployments
- **Preview**: Branch previews (optional, will use VERCEL_URL fallback)
- **Development**: Local development (use `.env.local` instead)

## Deployment Checklist

### Before Deploying OAuth Changes

- [ ] Verify `NEXT_PUBLIC_BASE_URL` is set in Vercel Dashboard
- [ ] Confirm the URL matches your production domain exactly
- [ ] Check that Supabase project has the correct redirect URLs configured
- [ ] Test OAuth flow in a preview deployment first

### After Deployment

- [ ] Test Google OAuth login from production domain
- [ ] Verify redirect URLs are correct (should stay on production domain)
- [ ] Check browser developer tools for any environment-related warnings
- [ ] Monitor Sentry for any authentication-related errors

## Supabase Configuration

### Required Redirect URLs

In your Supabase project (Authentication → URL Configuration), add:

```
# Site URL
https://gravity-note.vercel.app

# Redirect URLs
https://gravity-note.vercel.app/auth/callback
https://gravity-note.vercel.app/auth/auth-code-error

# For preview branches (optional)
https://*.vercel.app/auth/callback
https://*.vercel.app/auth/auth-code-error
```

## Technical Implementation Details

### Enhanced URL Resolution Function

The application now uses a sophisticated URL resolution strategy in both:
- `components/auth/auth-form.tsx` - Client-side OAuth initiation
- `app/auth/callback/route.ts` - Server-side callback handling

Key features:
- **Multi-layered fallbacks** prevent localhost redirects in production
- **Production domain detection** automatically enforces HTTPS
- **Header-based resolution** works with Vercel's proxy infrastructure
- **Error handling** for malformed environment variables

### Environment Variable Priority

1. **Runtime browser detection**: `window.location.origin`
2. **Explicit configuration**: `NEXT_PUBLIC_BASE_URL`
3. **Vercel automatic**: `VERCEL_URL` (set automatically by Vercel)
4. **Development fallback**: `http://localhost:3000`

## Troubleshooting

### OAuth Redirects to Localhost

**Symptoms**: OAuth login redirects to `http://localhost:3000/?code=...`

**Solution**:
1. Check Vercel environment variables
2. Ensure `NEXT_PUBLIC_BASE_URL=https://gravity-note.vercel.app`
3. Redeploy the application
4. Test with a fresh browser session

### Environment Variable Not Taking Effect

**Symptoms**: Changes to environment variables don't work

**Solution**:
1. Verify variable is set for correct environment (Production/Preview)
2. Redeploy the application (environment variables only apply to new deployments)
3. Check for typos in variable names
4. Ensure `NEXT_PUBLIC_` prefix for client-side variables

### Preview Branch Issues

**Symptoms**: Preview branches have incorrect URLs

**Solution**:
- Preview branches automatically use `VERCEL_URL` fallback
- No additional configuration needed for basic functionality
- For testing OAuth, add preview URLs to Supabase redirect list

## Security Considerations

### Open Redirect Protection

Both auth components include protection against open redirect attacks:

```typescript
// Prevent open redirect: only allow same-origin paths
const rawNext = searchParams.get('next') ?? '/dashboard'
const next = rawNext.startsWith('/') ? rawNext : '/dashboard'
```

### HTTPS Enforcement

Production domains automatically enforce HTTPS:

```typescript
// Ensure production uses HTTPS
if (host.includes('vercel.app') || host.includes('gravity-note.') || host.includes('gravity-note-')) {
  protocol = 'https'
}
```

## Monitoring and Maintenance

### Regular Checks

- Monitor Sentry for authentication errors
- Verify OAuth flow works after any environment changes
- Check for environment variable drift between deployments

### When to Update

- Domain changes
- New OAuth providers
- Supabase project migration
- Environment restructuring

## Contact and Support

For issues with this configuration:
1. Check Vercel deployment logs
2. Review Supabase Auth logs
3. Monitor Sentry error tracking
4. Test in preview environment first

---

*Last updated: January 2025*
*Related issues: Production OAuth redirect bug resolution*