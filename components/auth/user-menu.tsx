'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/lib/stores/auth'
import { LogOut, User } from 'lucide-react'

export function UserMenu() {
  const { user, signOut } = useAuthStore()

  if (!user) {
    return null
  }

  // Get user initials from email or full name
  const getInitials = () => {
    const fullName = user.user_metadata?.full_name
    if (fullName) {
      return fullName
        .split(' ')
        .map((name: string) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return user.email?.[0]?.toUpperCase() || 'U'
  }

  return (
    <div className='w-full'>
      {/* Inline user info and sign out button for accessibility/integration */}
      <div className='flex items-center gap-4 p-4 border-b'>
        <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary'>
          {user.user_metadata?.full_name ? (
            getInitials()
          ) : (
            <User className='h-4 w-4' />
          )}
        </div>
        <div className='flex flex-col'>
          <p className='text-sm font-medium'>{user.email}</p>
          <p className='text-xs text-muted-foreground'>
            {user.user_metadata?.full_name || 'User'}
          </p>
        </div>
        <div className='ml-auto'>
          <Button
            type='button'
            variant='ghost'
            className='flex items-center gap-2 text-destructive'
            onClick={() => signOut()}
          >
            <LogOut className='h-4 w-4' />
            Sign out
          </Button>
        </div>
      </div>

      {/* Retain dropdown for advanced interactions; mirrors header layout */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='h-8 w-8 p-0 rounded-full hover:bg-accent/50 transition-colors touch-manipulation min-h-[44px] min-w-[44px]'
            aria-label='User menu'
          >
            <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary'>
              {user.user_metadata?.full_name ? (
                getInitials()
              ) : (
                <User className='h-4 w-4' />
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='end'
          className='w-56 dropdown-modern'
          sideOffset={8}
        >
          <div className='flex items-center gap-4 p-4 border-b'>
            <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary'>
              {user.user_metadata?.full_name ? (
                getInitials()
              ) : (
                <User className='h-4 w-4' />
              )}
            </div>
            <div className='flex flex-col'>
              <p className='text-sm font-medium'>{user.email}</p>
              <p className='text-xs text-muted-foreground'>
                {user.user_metadata?.full_name || 'User'}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut()}
            className='relative select-none rounded-sm px-2 py-1.5 text-sm outline-none transition-colors cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10'
          >
            <span className='flex items-center gap-2'>
              <LogOut className='h-4 w-4' />
              <span>Sign out</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
