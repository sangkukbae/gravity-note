'use client'

import React from 'react'
import { cn } from '@/lib/utils'

type CheckboxProps = {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

export function Checkbox({
  id,
  checked = false,
  onCheckedChange,
  className,
}: CheckboxProps) {
  return (
    <input
      id={id}
      type='checkbox'
      className={cn('h-4 w-4 rounded border border-input', className)}
      checked={checked}
      onChange={e => onCheckedChange?.(e.target.checked)}
    />
  )
}

export default Checkbox
