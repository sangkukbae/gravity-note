'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/auth/user-menu'
import { NotesContainer } from '@/components/notes'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className='min-h-screen bg-background'>
        {/* Minimal header with user menu */}
        <header className='sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 z-20'>
          <div className='container mx-auto px-4 py-2'>
            <div className='flex justify-between items-center'>
              <h1 className='text-lg font-medium text-muted-foreground/80'>
                Gravity Note
              </h1>
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Main notes interface */}
        <main className='container mx-auto h-[calc(100vh-73px)]'>
          <NotesContainer
            className='h-full'
            // TODO: Connect to actual Supabase operations in Week 2
            onCreateNote={async content => {
              // Placeholder - will be replaced with actual Supabase call
              const mockNote = {
                id: `mock-${Date.now()}`,
                content,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                user_id: 'mock-user',
                is_rescued: false,
              }

              // Simulate API delay
              await new Promise(resolve => setTimeout(resolve, 100))
              return mockNote
            }}
            onRescueNote={async noteId => {
              // Placeholder - will be replaced with actual Supabase call
              console.log('Rescuing note:', noteId)
              await new Promise(resolve => setTimeout(resolve, 200))
            }}
            onSearchNotes={async query => {
              // Placeholder - will be replaced with actual Supabase search
              console.log('Searching for:', query)
              await new Promise(resolve => setTimeout(resolve, 300))
              return []
            }}
            initialNotes={[]}
          />
        </main>
      </div>
    </ProtectedRoute>
  )
}
