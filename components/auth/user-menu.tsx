'use client'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/auth'
import { LogOut, User } from 'lucide-react'

export function UserMenu() {
  const { user, signOut } = useAuthStore()

  if (!user) {
    return null
  }

  return (
    <div className='flex items-center gap-4 p-4 border-b'>
      <div className='flex items-center gap-2 flex-1'>
        <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center'>
          <User className='h-4 w-4' />
        </div>
        <div className='flex flex-col'>
          <span className='text-sm font-medium'>{user.email}</span>
          <span className='text-xs text-muted-foreground'>
            {user.user_metadata?.full_name || 'User'}
          </span>
        </div>
      </div>
      <Button
        variant='ghost'
        size='sm'
        onClick={signOut}
        className='flex items-center gap-2'
      >
        <LogOut className='h-4 w-4' />
        Sign Out
      </Button>
    </div>
  )
}
