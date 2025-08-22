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
      <DropdownMenuContent align='end' className='w-56' sideOffset={8}>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm font-medium leading-none'>{user.email}</p>
            {user.user_metadata?.full_name && (
              <p className='text-xs leading-none text-muted-foreground'>
                {user.user_metadata.full_name}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className='cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10'
        >
          <LogOut className='mr-2 h-4 w-4' />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
