# Gravity Note Authentication Setup

This document outlines the complete authentication system implemented for Gravity Note using Next.js 14 App Router and Supabase.

## 🚀 Features Implemented

### ✅ Core Authentication

- Email/password authentication with Supabase
- Google OAuth integration (requires OAuth app setup)
- Session management with server-side cookies
- Automatic user profile creation
- Secure middleware for session handling

### ✅ UI Components

- Modern authentication forms with shadcn/ui
- Responsive design with Tailwind CSS
- Loading states and error handling
- User menu with sign out functionality
- Protected route wrapper component

### ✅ State Management

- Zustand store for authentication state
- React Query for server state management
- Persistent session storage
- Real-time auth state synchronization

### ✅ Database Schema

- `profiles` table with user information
- `notes` table with user-owned notes
- Row Level Security (RLS) policies
- Automatic profile creation on signup

## 🔧 Configuration Required

### 1. Google OAuth Setup (Optional)

To enable Google sign-in, you need to:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://lymablvfuvfkxznfemiy.supabase.co/auth/v1/callback`
   - `http://localhost:3001/auth/callback` (for development)

6. Update your `.env.local` with your Google credentials:

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

7. Configure Google OAuth in Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Client ID and Client Secret

### 2. Email Configuration

For production, configure SMTP settings in Supabase:

- Go to Settings > Auth
- Configure SMTP settings for email confirmations

## 📁 File Structure

```
├── app/
│   ├── auth/
│   │   ├── signin/page.tsx          # Sign in page
│   │   ├── signup/page.tsx          # Sign up page
│   │   ├── callback/route.ts        # OAuth callback handler
│   │   └── auth-code-error/page.tsx # Error page
│   ├── dashboard/page.tsx           # Protected dashboard
│   └── layout.tsx                   # Root layout with providers
├── components/
│   ├── auth/
│   │   ├── auth-form.tsx           # Authentication form
│   │   ├── protected-route.tsx     # Route protection wrapper
│   │   └── user-menu.tsx           # User menu component
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client
│   │   └── middleware.ts           # Middleware helper
│   ├── stores/
│   │   └── auth.ts                 # Zustand auth store
│   ├── providers/
│   │   ├── auth-provider.tsx       # Auth initialization
│   │   └── query-provider.tsx      # React Query setup
│   └── actions/
│       └── auth.ts                 # Server actions
├── middleware.ts                   # Next.js middleware
└── types/
    └── database.ts                 # TypeScript types
```

## 🔐 Security Features

### Row Level Security (RLS)

- Users can only access their own profiles and notes
- Database-level security enforcement
- Automatic user context from JWT

### Session Management

- Secure HTTP-only cookies
- Automatic session refresh
- Multi-tab synchronization
- Middleware-based session validation

### Protected Routes

- Client-side route protection
- Server-side middleware enforcement
- Automatic redirects for unauthenticated users

## 🎯 Usage Examples

### Client-Side Authentication State

```tsx
import { useAuthStore } from '@/lib/stores/auth'

function MyComponent() {
  const { user, loading, signOut } = useAuthStore()

  if (loading) return <div>Loading...</div>
  if (!user) return <div>Not authenticated</div>

  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

### Server-Side User Access

```tsx
import { createClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  return <div>Hello, {user.email}!</div>
}
```

### Protected Routes

```tsx
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <div>This content is only visible to authenticated users</div>
    </ProtectedRoute>
  )
}
```

## 🚀 Getting Started

1. **Install dependencies** (already done):

   ```bash
   pnpm install
   ```

2. **Environment setup** (already done):
   - `.env.local` is configured with Supabase credentials

3. **Database setup** (already done):
   - Tables and RLS policies are created
   - User profile creation trigger is set up

4. **Start development server**:

   ```bash
   pnpm dev
   ```

5. **Test the authentication**:
   - Visit `http://localhost:3001`
   - Click "Get Started" to create an account
   - Or click "Sign In" to access existing account

## 🔗 Important URLs

- **Homepage**: `http://localhost:3001/`
- **Sign In**: `http://localhost:3001/auth/signin`
- **Sign Up**: `http://localhost:3001/auth/signup`
- **Dashboard**: `http://localhost:3001/dashboard`
- **Supabase Dashboard**: `https://supabase.com/dashboard/project/lymablvfuvfkxznfemiy`

## 🛠️ Next Steps

1. **Configure Google OAuth** (optional but recommended)
2. **Customize email templates** in Supabase Dashboard
3. **Add password reset functionality**
4. **Implement email verification flow**
5. **Add user profile management**
6. **Set up production email SMTP**

The authentication system is now fully functional and ready for development!
