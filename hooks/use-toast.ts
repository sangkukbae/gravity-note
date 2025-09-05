import { toast } from 'sonner'

export interface Toast {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  cancel?: React.ReactNode
  onAutoClose?: (toast: Toast) => void
  onDismiss?: (toast: Toast) => void
}

export interface ToastActionElement {
  altText: string
}

export interface Toaster {
  toast: (props: Omit<Toast, 'id'>) => string
  dismiss: (toastId?: string) => void
}

export function useToast(): {
  toast: (props: {
    title?: string
    description?: string
    variant?: 'default' | 'destructive'
  }) => void
  dismiss: (toastId?: string) => void
} {
  return {
    toast: ({ title, description, variant = 'default' }) => {
      if (variant === 'destructive') {
        toast.error(title || description || 'Something went wrong')
      } else {
        toast.success(title || description || 'Success')
      }
    },
    dismiss: toastId => {
      toast.dismiss(toastId)
    },
  }
}
