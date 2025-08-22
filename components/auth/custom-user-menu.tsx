'use client'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/auth'
import { LogOut, User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function CustomUserMenu() {
  const { user, signOut } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen])

  if (!user) {
    return null
  }

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

  const handleSignOut = () => {
    setIsOpen(false)
    signOut()
  }

  return (
    <div className='relative' ref={menuRef}>
      <Button
        variant='ghost'
        className='h-8 w-8 p-0 rounded-full hover:bg-accent/50 transition-colors touch-manipulation min-h-[44px] min-w-[44px]'
        aria-label='User menu'
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary'>
          {user.user_metadata?.full_name ? (
            getInitials()
          ) : (
            <User className='h-4 w-4' />
          )}
        </div>
      </Button>

      {isOpen && (
        <div
          className='absolute right-0 mt-2 w-56 bg-popover border border-border rounded-md shadow-md z-50 animate-in fade-in-0 zoom-in-95'
          style={{ top: '100%' }}
        >
          <div className='p-3 border-b border-border'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm font-medium leading-none'>{user.email}</p>
              {user.user_metadata?.full_name && (
                <p className='text-xs leading-none text-muted-foreground'>
                  {user.user_metadata.full_name}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className='flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none transition-colors'
          >
            <LogOut className='h-4 w-4' />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  )
}
