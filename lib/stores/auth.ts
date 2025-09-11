'use client'

import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
}

interface AuthActions {
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export type AuthStore = AuthState & AuthActions

function getPersistedAuth(): {
  user: User | null
  session: Session | null
} | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('auth-store')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return {
      user: parsed?.state?.user ?? null,
      session: parsed?.state?.session ?? null,
    }
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        ...((): AuthState => {
          const persisted = getPersistedAuth()
          if (persisted) {
            return {
              user: persisted.user,
              session: persisted.session,
              loading: false,
              initialized: true,
            }
          }
          return {
            user: null,
            session: null,
            loading: true,
            initialized: false,
          }
        })(),

        // Actions
        setUser: user => set({ user }),
        setSession: session => set({ session }),
        setLoading: loading => set({ loading }),
        setInitialized: initialized => set({ initialized }),

        signOut: async () => {
          const supabase = createClient()
          set({ loading: true })

          try {
            await supabase.auth.signOut()

            // Clear state and localStorage
            set({ user: null, session: null, loading: false })

            // Force clear localStorage to ensure complete cleanup
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth-store')

              // Clear session storage as well for extra security
              sessionStorage.removeItem('auth-store')

              // Security: Clear browser history to prevent back navigation to protected pages
              // Replace current history entry instead of adding new one
              window.history.replaceState(null, '', '/auth/signin')

              // Clear forward history by pushing a dummy state and then going back
              if (window.history.length > 1) {
                window.history.pushState(null, '', '/auth/signin')
                window.history.back()
              }
            }

            // Force redirect to sign-in page
            if (typeof window !== 'undefined') {
              window.location.href = '/auth/signin'
            }
          } catch (error) {
            console.error('Error signing out:', error)
            set({ loading: false })
          }
        },

        initialize: async () => {
          const supabase = createClient()

          try {
            // Get initial session
            const {
              data: { session },
            } = await supabase.auth.getSession()

            if (session) {
              set({
                user: session.user,
                session,
                loading: false,
                initialized: true,
              })
            } else {
              set({
                user: null,
                session: null,
                loading: false,
                initialized: true,
              })
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange((event, session) => {
              console.log('Auth state changed:', event, session?.user?.email)

              if (session) {
                set({ user: session.user, session, loading: false })
              } else {
                set({ user: null, session: null, loading: false })
              }
            })
          } catch (error) {
            console.error('Error initializing auth:', error)
            set({ loading: false, initialized: true })
          }
        },
      }),
      {
        name: 'auth-store',
        storage: createJSONStorage(() => localStorage),
        partialize: state => ({
          user: state.user,
          session: state.session,
        }),
        // No onRehydrateStorage: we derive initial state synchronously from localStorage
      }
    )
  )
)
