import { AuthForm } from '@/components/auth/auth-form'

export default function SignUpPage() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4'>
      <AuthForm mode='signup' />
    </div>
  )
}
