'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  useAuthFormValidation,
  usePasswordStrength,
} from '@/hooks/use-auth-validation'
import { PasswordStrengthIndicator } from './password-strength-indicator'
import { analyzePasswordStrength } from '@/lib/validations/auth-validation'

interface AuthFormProps {
  mode: 'signin' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  // Resolve a reliable base URL at runtime to avoid env drift between
  // environments (prevents accidental redirects to localhost in prod).
  const runtimeBaseUrl = (() => {
    // In browser, always use window.location.origin (most reliable)
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin
    }

    // Fallback for SSR or when window is not available
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      return process.env.NEXT_PUBLIC_BASE_URL
    }

    // Production fallback - detect Vercel deployment
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }

    // Final fallback for development
    return 'http://localhost:3000'
  })()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  const supabase = createClient()

  // Initialize validation for the form
  const validation = useAuthFormValidation({
    mode,
    realTimeValidation: true,
    enablePasswordStrength: mode === 'signup',
  })

  // Password strength analysis for signup mode
  const passwordStrength = usePasswordStrength(password)

  // Handle email input change with validation
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setEmail(value)

      // Clear server errors when user starts typing
      if (error) setError(null)

      // Validate email if user has started typing
      if (value.length > 0) {
        validation.email.validateDebounced(value)
      } else {
        validation.email.clearError()
      }
    },
    [validation.email, error]
  )

  // Handle password input change with validation
  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setPassword(value)

      // Clear server errors when user starts typing
      if (error) setError(null)

      // Validate password if user has started typing
      if (value.length > 0) {
        validation.password.validateDebounced(value)
      } else {
        validation.password.clearError()
      }

      // For signup mode, also check if passwords match
      if (mode === 'signup' && confirmPassword) {
        validation.validatePasswordsMatch(value, confirmPassword)
      }
    },
    [error, mode, confirmPassword, validation]
  )

  // Handle confirm password input change (signup only)
  const handleConfirmPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setConfirmPassword(value)

      // Clear server errors when user starts typing
      if (error) setError(null)

      // Check if passwords match
      if (mode === 'signup') {
        validation.validatePasswordsMatch(password, value)
      }
    },
    [error, mode, validation, password]
  )

  // Validate form before submission
  const validateFormForSubmission = useCallback(() => {
    // Force validation of all fields
    const emailValidation = validation.email.validate(email)
    const passwordValidation = validation.password.validate(password)

    let confirmPasswordValid = true
    if (mode === 'signup' && validation.confirmPassword) {
      const confirmPasswordValidation =
        validation.confirmPassword.validate(confirmPassword)
      validation.validatePasswordsMatch(password, confirmPassword)
      confirmPasswordValid =
        confirmPasswordValidation.success && password === confirmPassword
    }

    // Also validate the entire form with Zod schema
    const formData =
      mode === 'signup'
        ? { email, password, confirmPassword }
        : { email, password }

    const formValidation = validation.validateForm(formData)

    return (
      emailValidation.success &&
      passwordValidation.success &&
      confirmPasswordValid &&
      formValidation.success
    )
  }, [validation, email, password, confirmPassword, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    // Validate form before submission
    if (!validateFormForSubmission()) {
      setError('Please fix the validation errors before submitting.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${runtimeBaseUrl}/auth/callback`,
          },
        })

        if (error) {
          setError(error.message)
        } else {
          setMessage('Check your email for the confirmation link!')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${runtimeBaseUrl}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Determine if submit button should be disabled
  const isSubmitDisabled =
    loading ||
    !email.trim() ||
    !password.trim() ||
    (mode === 'signup' && !confirmPassword.trim()) ||
    validation.formState.isValidating

  return (
    <Card className='w-full max-w-md'>
      <CardHeader>
        <CardTitle>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</CardTitle>
        <CardDescription>
          {mode === 'signin'
            ? 'Enter your credentials to access your account'
            : 'Create a new account to get started'}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Email Field */}
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              placeholder='Enter your email'
              value={email}
              onChange={handleEmailChange}
              disabled={loading}
              className={cn(
                validation.email.state.error &&
                  validation.email.state.hasBeenValidated
                  ? 'border-red-500 focus-visible:ring-red-500'
                  : validation.email.state.isValid &&
                      validation.email.state.hasBeenValidated
                    ? 'border-green-500 focus-visible:ring-green-500'
                    : ''
              )}
            />
            {validation.email.state.error &&
              validation.email.state.hasBeenValidated && (
                <p className='text-sm text-red-600 flex items-center space-x-1'>
                  <svg
                    className='w-4 h-4'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span>{validation.email.state.error}</span>
                </p>
              )}
          </div>

          {/* Password Field */}
          <div className='space-y-2'>
            <Label htmlFor='password'>
              Password
              {mode === 'signup' && (
                <span className='text-sm text-gray-500 ml-1'>
                  (minimum 8 characters)
                </span>
              )}
            </Label>
            <Input
              id='password'
              type='password'
              placeholder={
                mode === 'signin'
                  ? 'Enter your password'
                  : 'Create a strong password'
              }
              value={password}
              onChange={handlePasswordChange}
              disabled={loading}
              className={cn(
                validation.password.state.error &&
                  validation.password.state.hasBeenValidated
                  ? 'border-red-500 focus-visible:ring-red-500'
                  : validation.password.state.isValid &&
                      validation.password.state.hasBeenValidated
                    ? 'border-green-500 focus-visible:ring-green-500'
                    : ''
              )}
            />
            {validation.password.state.error &&
              validation.password.state.hasBeenValidated && (
                <p className='text-sm text-red-600 flex items-center space-x-1'>
                  <svg
                    className='w-4 h-4'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span>{validation.password.state.error}</span>
                </p>
              )}

            {/* Password Strength Indicator for Signup */}
            {mode === 'signup' && (
              <PasswordStrengthIndicator
                strength={passwordStrength}
                isVisible={passwordStrength.isVisible}
                showFeedback={true}
                className='mt-2'
              />
            )}
          </div>

          {/* Confirm Password Field (Signup Only) */}
          {mode === 'signup' && (
            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Confirm Password</Label>
              <Input
                id='confirmPassword'
                type='password'
                placeholder='Confirm your password'
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                disabled={loading}
                className={cn(
                  validation.confirmPassword?.state.error &&
                    validation.confirmPassword.state.hasBeenValidated
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : validation.confirmPassword?.state.isValid &&
                        validation.confirmPassword.state.hasBeenValidated
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : ''
                )}
              />
              {validation.confirmPassword?.state.error &&
                validation.confirmPassword.state.hasBeenValidated && (
                  <p className='text-sm text-red-600 flex items-center space-x-1'>
                    <svg
                      className='w-4 h-4'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                        clipRule='evenodd'
                      />
                    </svg>
                    <span>{validation.confirmPassword.state.error}</span>
                  </p>
                )}
            </div>
          )}

          {/* Server Error */}
          {error && (
            <Alert variant='destructive'>
              <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                <path
                  fillRule='evenodd'
                  d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                  clipRule='evenodd'
                />
              </svg>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {message && (
            <Alert className='border-green-200 bg-green-50'>
              <svg
                className='w-4 h-4 text-green-600'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                  clipRule='evenodd'
                />
              </svg>
              <AlertDescription className='text-green-800'>
                {message}
              </AlertDescription>
            </Alert>
          )}

          <Button type='submit' className='w-full' disabled={isSubmitDisabled}>
            {loading ? (
              <div className='flex items-center space-x-2'>
                <svg
                  className='animate-spin h-4 w-4'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  />
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  />
                </svg>
                <span>
                  {mode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                </span>
              </div>
            ) : mode === 'signin' ? (
              'Sign In'
            ) : (
              'Sign Up'
            )}
          </Button>
        </form>

        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background px-2 text-muted-foreground'>
              Or continue with
            </span>
          </div>
        </div>

        <Button
          type='button'
          variant='outline'
          onClick={handleGoogleSignIn}
          disabled={loading}
          className='w-full'
        >
          <svg className='mr-2 h-4 w-4' viewBox='0 0 24 24'>
            <path
              d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
              fill='#4285F4'
            />
            <path
              d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
              fill='#34A853'
            />
            <path
              d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
              fill='#FBBC05'
            />
            <path
              d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
              fill='#EA4335'
            />
          </svg>
          Continue with Google
        </Button>

        <div className='text-center text-sm'>
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <Button
                type='button'
                variant='link'
                className='p-0'
                onClick={() => router.push('/auth/signup')}
              >
                Sign up
              </Button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Button
                type='button'
                variant='link'
                className='p-0'
                onClick={() => router.push('/auth/signin')}
              >
                Sign in
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
