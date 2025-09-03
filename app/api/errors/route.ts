import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

/**
 * Error report interface
 */
interface ErrorReport {
  errorId: string
  message: string
  category: string
  severity: string
  stack?: string
  timestamp: string
  context: {
    operation: string
    userId: string
    url: string
    userAgent: string
    viewport: {
      width: number
      height: number
    }
    [key: string]: any
  }
}

/**
 * POST handler for error reports
 */
export async function POST(request: NextRequest) {
  try {
    const body: ErrorReport = await request.json()

    // Validate required fields
    if (!body.errorId || !body.message || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get additional request info
    const headersList = headers()
    const userAgent = headersList.get('user-agent') || 'unknown'
    const ip =
      headersList.get('x-forwarded-for') ||
      headersList.get('x-real-ip') ||
      'unknown'

    // Enhanced error report with server-side data
    const enhancedReport = {
      ...body,
      serverTimestamp: new Date().toISOString(),
      requestInfo: {
        userAgent,
        ip,
        referer: headersList.get('referer'),
        origin: headersList.get('origin'),
      },
    }

    // Log error (in production, you'd send this to a monitoring service)
    console.error('Client Error Report:', {
      errorId: body.errorId,
      category: body.category,
      severity: body.severity,
      message: body.message,
      context: body.context,
      serverInfo: enhancedReport.requestInfo,
    })

    // In a real application, you would:
    // 1. Send to monitoring service (Sentry, DataDog, etc.)
    // 2. Store in database for analysis
    // 3. Alert on critical errors
    // 4. Aggregate metrics

    // Example: Send to Sentry (if configured)
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(new Error(body.message), {
    //     tags: {
    //       category: body.category,
    //       severity: body.severity,
    //       errorId: body.errorId
    //     },
    //     contexts: {
    //       error: body.context
    //     },
    //     extra: enhancedReport
    //   })
    // }

    // Return success response
    return NextResponse.json({
      success: true,
      errorId: body.errorId,
      timestamp: enhancedReport.serverTimestamp,
    })
  } catch (error) {
    console.error('Failed to process error report:', error)

    return NextResponse.json(
      {
        error: 'Failed to process error report',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler for error statistics (optional)
 */
export async function GET(request: NextRequest) {
  // This could return error statistics, health status, etc.
  // For now, just return a simple status

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
}
