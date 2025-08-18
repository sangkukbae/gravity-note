import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/auth/user-menu'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className='min-h-screen bg-gradient-to-br from-background to-muted'>
        <div className='container mx-auto p-4'>
          <UserMenu />

          <div className='mt-8'>
            <h1 className='text-3xl font-bold mb-6'>Welcome to Gravity Note</h1>

            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Notes</CardTitle>
                  <CardDescription>
                    Capture your thoughts instantly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground'>
                    Your note-taking journey starts here. Create, organize, and
                    access your notes seamlessly.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    See what you&apos;ve been working on
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground'>
                    Track your recent notes and edits in one convenient place.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Customize your experience</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground'>
                    Personalize Gravity Note to work exactly how you want it to.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
