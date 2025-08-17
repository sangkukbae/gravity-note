import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function AuthCodeError() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle className='text-destructive'>
            Authentication Error
          </CardTitle>
          <CardDescription>
            Sorry, we couldn&apos;t complete your authentication request.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-sm text-muted-foreground'>
            This could be due to an expired or invalid authentication code.
            Please try signing in again.
          </p>
          <div className='flex gap-2'>
            <Button asChild className='flex-1'>
              <Link href='/auth/signin'>Try Again</Link>
            </Button>
            <Button variant='outline' asChild className='flex-1'>
              <Link href='/'>Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
