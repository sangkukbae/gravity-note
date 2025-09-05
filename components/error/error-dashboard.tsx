'use client'

import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  Bug,
  TrendingUp,
  Users,
  Clock,
  Filter,
  Download,
  RefreshCw,
  Settings,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  AlertCircle,
} from 'lucide-react'
import { useErrorStats } from '@/contexts/error-context'
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/classification'

// Mock data interface - in real app, this would come from your backend/Sentry
interface ErrorSummary {
  id: string
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  count: number
  firstSeen: Date
  lastSeen: Date
  userCount: number
  tags: string[]
}

interface FeedbackSummary {
  id: string
  type: 'bug' | 'suggestion' | 'question' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  submittedAt: Date
  userEmail?: string
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
}

// Mock data - in real implementation, fetch from API
const mockErrorSummaries: ErrorSummary[] = [
  {
    id: 'err_001',
    message: 'Failed to fetch notes',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    count: 45,
    firstSeen: new Date('2024-01-01'),
    lastSeen: new Date('2024-01-15'),
    userCount: 12,
    tags: ['api', 'timeout'],
  },
  {
    id: 'err_002',
    message: 'Authentication token expired',
    category: ErrorCategory.AUTH,
    severity: ErrorSeverity.MEDIUM,
    count: 23,
    firstSeen: new Date('2024-01-05'),
    lastSeen: new Date('2024-01-14'),
    userCount: 8,
    tags: ['auth', 'token'],
  },
  {
    id: 'err_003',
    message: 'Database connection failed',
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.CRITICAL,
    count: 3,
    firstSeen: new Date('2024-01-10'),
    lastSeen: new Date('2024-01-12'),
    userCount: 15,
    tags: ['database', 'connection'],
  },
]

const mockFeedbackSummaries: FeedbackSummary[] = [
  {
    id: 'fb_001',
    type: 'bug',
    severity: 'high',
    description: 'Search function is not working properly',
    submittedAt: new Date('2024-01-14'),
    userEmail: 'user@example.com',
    status: 'in-progress',
  },
  {
    id: 'fb_002',
    type: 'suggestion',
    severity: 'medium',
    description: 'Add dark mode toggle in settings',
    submittedAt: new Date('2024-01-13'),
    userEmail: 'another@example.com',
    status: 'open',
  },
]

interface ErrorDashboardProps {
  className?: string
  enableSimulation?: boolean
}

export function ErrorDashboard({
  className = '',
  enableSimulation = process.env.NODE_ENV === 'development',
}: ErrorDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('7d')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')

  const errorStats = useErrorStats()

  // Simulated error functions for testing
  const simulateError = (type: string) => {
    switch (type) {
      case 'network':
        throw new Error('Simulated network error')
      case 'auth':
        throw new Error('Simulated authentication error')
      case 'validation':
        throw new Error('Simulated validation error')
      case 'critical':
        throw new Error('Simulated critical error')
      default:
        throw new Error('Simulated generic error')
    }
  }

  // Filter errors based on selection
  const filteredErrors = useMemo(() => {
    return mockErrorSummaries.filter(error => {
      if (selectedCategory !== 'all' && error.category !== selectedCategory) {
        return false
      }
      if (selectedSeverity !== 'all' && error.severity !== selectedSeverity) {
        return false
      }
      return true
    })
  }, [selectedCategory, selectedSeverity])

  // Calculate statistics
  const stats = useMemo(() => {
    const totalErrors = filteredErrors.reduce(
      (sum, error) => sum + error.count,
      0
    )
    const totalUsers = new Set(
      filteredErrors.flatMap(error => Array(error.userCount).fill(error.id))
    ).size
    const criticalCount = filteredErrors.filter(
      error => error.severity === ErrorSeverity.CRITICAL
    ).length

    return {
      totalErrors,
      totalUsers,
      criticalCount,
      avgErrorsPerUser:
        totalUsers > 0 ? Math.round(totalErrors / totalUsers) : 0,
    }
  }, [filteredErrors])

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case ErrorSeverity.HIGH:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case ErrorSeverity.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  const getCategoryIcon = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.NETWORK:
        return <Activity className='h-4 w-4' />
      case ErrorCategory.AUTH:
        return <Users className='h-4 w-4' />
      case ErrorCategory.DATABASE:
        return <BarChart3 className='h-4 w-4' />
      case ErrorCategory.VALIDATION:
        return <AlertCircle className='h-4 w-4' />
      default:
        return <Bug className='h-4 w-4' />
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Error Dashboard</h2>
          <p className='text-muted-foreground'>
            Monitor errors and user feedback across the application
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm'>
            <Download className='h-4 w-4 mr-2' />
            Export
          </Button>
          <Button variant='outline' size='sm'>
            <RefreshCw className='h-4 w-4 mr-2' />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Filter className='h-5 w-5' />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap gap-4'>
            <div className='flex flex-col gap-2'>
              <label className='text-sm font-medium'>Time Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className='w-32'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='1d'>Last 24h</SelectItem>
                  <SelectItem value='7d'>Last 7 days</SelectItem>
                  <SelectItem value='30d'>Last 30 days</SelectItem>
                  <SelectItem value='90d'>Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-2'>
              <label className='text-sm font-medium'>Category</label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Categories</SelectItem>
                  <SelectItem value={ErrorCategory.NETWORK}>Network</SelectItem>
                  <SelectItem value={ErrorCategory.AUTH}>
                    Authentication
                  </SelectItem>
                  <SelectItem value={ErrorCategory.DATABASE}>
                    Database
                  </SelectItem>
                  <SelectItem value={ErrorCategory.VALIDATION}>
                    Validation
                  </SelectItem>
                  <SelectItem value={ErrorCategory.RUNTIME}>Runtime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-2'>
              <label className='text-sm font-medium'>Severity</label>
              <Select
                value={selectedSeverity}
                onValueChange={setSelectedSeverity}
              >
                <SelectTrigger className='w-32'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Severities</SelectItem>
                  <SelectItem value={ErrorSeverity.CRITICAL}>
                    Critical
                  </SelectItem>
                  <SelectItem value={ErrorSeverity.HIGH}>High</SelectItem>
                  <SelectItem value={ErrorSeverity.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={ErrorSeverity.LOW}>Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Errors</CardTitle>
            <Bug className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.totalErrors}</div>
            <p className='text-xs text-muted-foreground'>
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Affected Users
            </CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.totalUsers}</div>
            <p className='text-xs text-muted-foreground'>
              +5% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Critical Errors
            </CardTitle>
            <AlertTriangle className='h-4 w-4 text-red-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>
              {stats.criticalCount}
            </div>
            <p className='text-xs text-muted-foreground'>
              -50% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Avg Errors/User
            </CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.avgErrorsPerUser}</div>
            <p className='text-xs text-muted-foreground'>
              -8% from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue='errors' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='errors'>Error Summary</TabsTrigger>
          <TabsTrigger value='feedback'>User Feedback</TabsTrigger>
          <TabsTrigger value='analytics'>Analytics</TabsTrigger>
          {enableSimulation && (
            <TabsTrigger value='simulate'>Error Simulation</TabsTrigger>
          )}
        </TabsList>

        {/* Error Summary Tab */}
        <TabsContent value='errors'>
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>
                Most common errors in the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {filteredErrors.map(error => (
                  <div
                    key={error.id}
                    className='flex items-center justify-between p-4 rounded-lg border'
                  >
                    <div className='flex items-start gap-3'>
                      {getCategoryIcon(error.category)}
                      <div>
                        <div className='font-medium'>{error.message}</div>
                        <div className='text-sm text-muted-foreground'>
                          {error.count} occurrences • {error.userCount} users
                          affected
                        </div>
                        <div className='flex items-center gap-2 mt-2'>
                          <Badge className={getSeverityColor(error.severity)}>
                            {error.severity}
                          </Badge>
                          <Badge variant='outline'>{error.category}</Badge>
                          {error.tags.map(tag => (
                            <Badge
                              key={tag}
                              variant='secondary'
                              className='text-xs'
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className='text-right text-sm text-muted-foreground'>
                      <div>Last seen</div>
                      <div>{error.lastSeen.toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}

                {filteredErrors.length === 0 && (
                  <div className='text-center py-8 text-muted-foreground'>
                    No errors found matching the selected filters
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Feedback Tab */}
        <TabsContent value='feedback'>
          <Card>
            <CardHeader>
              <CardTitle>User Feedback</CardTitle>
              <CardDescription>
                Recent feedback and reports from users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {mockFeedbackSummaries.map(feedback => (
                  <div
                    key={feedback.id}
                    className='flex items-center justify-between p-4 rounded-lg border'
                  >
                    <div className='flex items-start gap-3'>
                      <div className='mt-1'>
                        {feedback.type === 'bug' && (
                          <Bug className='h-4 w-4 text-red-500' />
                        )}
                        {feedback.type === 'suggestion' && (
                          <Zap className='h-4 w-4 text-blue-500' />
                        )}
                        {feedback.type === 'question' && (
                          <AlertCircle className='h-4 w-4 text-yellow-500' />
                        )}
                      </div>
                      <div className='flex-1'>
                        <div className='font-medium'>
                          {feedback.description}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          {feedback.userEmail &&
                            `From ${feedback.userEmail} • `}
                          {feedback.submittedAt.toLocaleDateString()}
                        </div>
                        <div className='flex items-center gap-2 mt-2'>
                          <Badge
                            className={getSeverityColor(
                              feedback.severity as any
                            )}
                          >
                            {feedback.severity}
                          </Badge>
                          <Badge variant='outline'>{feedback.type}</Badge>
                          <Badge
                            variant={
                              feedback.status === 'resolved'
                                ? 'default'
                                : feedback.status === 'in-progress'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {feedback.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {mockFeedbackSummaries.length === 0 && (
                  <div className='text-center py-8 text-muted-foreground'>
                    No feedback submissions found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value='analytics'>
          <div className='grid gap-4 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <PieChart className='h-5 w-5' />
                  Error Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {Object.values(ErrorCategory).map(category => {
                    const count = errorStats.errorsByCategory[category] || 0
                    const percentage =
                      Math.round((count / errorStats.totalErrors) * 100) || 0

                    return (
                      <div
                        key={category}
                        className='flex items-center justify-between'
                      >
                        <div className='flex items-center gap-2'>
                          {getCategoryIcon(category)}
                          <span className='text-sm'>{category}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <div className='w-16 bg-gray-200 rounded-full h-2'>
                            <div
                              className='bg-blue-600 h-2 rounded-full'
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className='text-sm text-muted-foreground'>
                            {count} ({percentage}%)
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Clock className='h-5 w-5' />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {errorStats.recentErrors.slice(0, 5).map((error, index) => (
                    <div
                      key={index}
                      className='flex items-center justify-between'
                    >
                      <div className='flex items-center gap-2'>
                        {getCategoryIcon(error.category)}
                        <span className='text-sm truncate'>
                          {error.message}
                        </span>
                      </div>
                      <Badge className={getSeverityColor(error.severity)}>
                        {error.severity}
                      </Badge>
                    </div>
                  ))}

                  {errorStats.recentErrors.length === 0 && (
                    <div className='text-center py-4 text-muted-foreground'>
                      No recent errors
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Error Simulation Tab (Development Only) */}
        {enableSimulation && (
          <TabsContent value='simulate'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Settings className='h-5 w-5' />
                  Error Simulation
                </CardTitle>
                <CardDescription>
                  Test error handling by simulating different types of errors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                  <Button
                    variant='outline'
                    onClick={() => simulateError('network')}
                    className='flex flex-col gap-2 h-auto py-4'
                  >
                    <Activity className='h-6 w-6' />
                    Network Error
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => simulateError('auth')}
                    className='flex flex-col gap-2 h-auto py-4'
                  >
                    <Users className='h-6 w-6' />
                    Auth Error
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => simulateError('validation')}
                    className='flex flex-col gap-2 h-auto py-4'
                  >
                    <AlertCircle className='h-6 w-6' />
                    Validation Error
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => simulateError('critical')}
                    className='flex flex-col gap-2 h-auto py-4'
                  >
                    <AlertTriangle className='h-6 w-6 text-red-500' />
                    Critical Error
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => simulateError('generic')}
                    className='flex flex-col gap-2 h-auto py-4'
                  >
                    <Bug className='h-6 w-6' />
                    Generic Error
                  </Button>
                </div>

                <div className='mt-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800'>
                  <div className='flex items-start gap-2'>
                    <AlertTriangle className='h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5' />
                    <div>
                      <div className='font-medium text-yellow-800 dark:text-yellow-200'>
                        Development Mode Only
                      </div>
                      <div className='text-sm text-yellow-700 dark:text-yellow-300'>
                        These simulation buttons are only available in
                        development mode to test error handling and feedback
                        collection.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
