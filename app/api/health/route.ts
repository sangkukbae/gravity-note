/**
 * Health Check API Endpoint
 *
 * Provides network quality testing and health information
 * for the enhanced network status monitoring system
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * Health check response interface
 */
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: 'healthy' | 'degraded' | 'unhealthy'
    auth: 'healthy' | 'degraded' | 'unhealthy'
  }
  metadata: {
    responseTime: number
    version: string
    environment: string
  }
}

/**
 * GET /api/health
 *
 * Returns health status and timing information for network quality testing
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<HealthResponse>> {
  const startTime = performance.now()

  try {
    // Basic health checks (simplified for this implementation)
    const databaseHealth = 'healthy' as const // Would check Supabase connection in real implementation
    const authHealth = 'healthy' as const // Would check auth service in real implementation

    const responseTime = Math.round(performance.now() - startTime)

    const healthResponse: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: databaseHealth,
        auth: authHealth,
      },
      metadata: {
        responseTime,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    }

    // Add cache control headers to prevent caching for network tests
    const response = NextResponse.json(healthResponse, { status: 200 })
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    )
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error('Health check failed:', error)

    const responseTime = Math.round(performance.now() - startTime)

    const errorResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unhealthy',
        auth: 'unhealthy',
      },
      metadata: {
        responseTime,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    }

    const response = NextResponse.json(errorResponse, { status: 500 })
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    )
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  }
}

/**
 * HEAD /api/health
 *
 * Returns health status headers for lightweight connectivity testing
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    const responseTime = Math.round(performance.now() - startTime)

    const response = new NextResponse(null, { status: 200 })
    response.headers.set('X-Health-Status', 'healthy')
    response.headers.set('X-Response-Time', responseTime.toString())
    response.headers.set('X-Timestamp', new Date().toISOString())
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    )
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error('Health check HEAD failed:', error)

    const responseTime = Math.round(performance.now() - startTime)

    const response = new NextResponse(null, { status: 500 })
    response.headers.set('X-Health-Status', 'unhealthy')
    response.headers.set('X-Response-Time', responseTime.toString())
    response.headers.set('X-Timestamp', new Date().toISOString())
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    )
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  }
}
