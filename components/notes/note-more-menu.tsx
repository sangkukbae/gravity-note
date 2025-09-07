'use client'

import { useCallback, useState, memo } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, PencilIcon } from 'lucide-react'

interface NoteMoreMenuProps {
  canEdit: boolean
  onEdit: () => void
}

export const NoteMoreMenu = memo(function NoteMoreMenu({
  canEdit,
  onEdit,
}: NoteMoreMenuProps) {
  const [open, setOpen] = useState(false)
  const handleOpenChange = useCallback((next: boolean) => setOpen(next), [])
  const handleEdit = useCallback(() => {
    onEdit()
    setOpen(false)
  }, [onEdit])

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-muted-foreground/60 hover:text-foreground'
          aria-label='More actions'
        >
          <MoreVertical className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-40'>
        <DropdownMenuItem
          className='cursor-pointer'
          disabled={!canEdit}
          onClick={handleEdit}
        >
          <PencilIcon className='h-4 w-4 mr-2' /> Edit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
