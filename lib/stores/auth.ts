'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
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

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        user: null,
        session: null,
        loading: true,
        initialized: false,

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
            set({ user: null, session: null })
          } catch (error) {
            console.error('Error signing out:', error)
          } finally {
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
        partialize: state => ({
          user: state.user,
          session: state.session,
        }),
      }
    )
  )
)
