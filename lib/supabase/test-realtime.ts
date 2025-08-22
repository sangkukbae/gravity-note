/**
 * Test utilities for real-time functionality
 * This file helps verify Phase 1 implementation
 */

import { RealtimeNotesManager } from './realtime'

export interface RealtimeTestResults {
  isAvailable: boolean
  connectionTime: number | null
  errors: string[]
  success: boolean
}

/**
 * Test real-time connectivity and basic functionality
 * Use this to verify Phase 1 implementation
 */
export async function testRealtimeConnectivity(
  userId: string
): Promise<RealtimeTestResults> {
  const results: RealtimeTestResults = {
    isAvailable: false,
    connectionTime: null,
    errors: [],
    success: false,
  }

  try {
    console.log('🧪 Testing real-time connectivity...')

    // Test 1: Check if real-time is available
    const startTime = Date.now()
    const isAvailable = await RealtimeNotesManager.isRealtimeAvailable()
    const availabilityTime = Date.now() - startTime

    console.log(
      `✓ Real-time availability check: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'} (${availabilityTime}ms)`
    )
    results.isAvailable = isAvailable

    if (!isAvailable) {
      results.errors.push('Real-time service is not available')
      return results
    }

    // Test 2: Create manager and test subscription
    const manager = new RealtimeNotesManager()
    const subscriptionStartTime = Date.now()

    let subscriptionResult = false
    let testInsertReceived = false
    let testUpdateReceived = false

    try {
      subscriptionResult = await manager.subscribe({
        userId,
        onInsert: note => {
          console.log('✓ Test INSERT received:', note.id)
          testInsertReceived = true
        },
        onUpdate: note => {
          console.log('✓ Test UPDATE received:', note.id)
          testUpdateReceived = true
        },
        onDelete: noteId => {
          console.log('✓ Test DELETE received:', noteId)
        },
        onError: error => {
          console.log('❌ Real-time error during test:', error.message)
          results.errors.push(`Subscription error: ${error.message}`)
        },
      })

      const subscriptionTime = Date.now() - subscriptionStartTime
      results.connectionTime = subscriptionTime

      console.log(
        `✓ Subscription result: ${subscriptionResult ? 'SUCCESS' : 'FAILED'} (${subscriptionTime}ms)`
      )

      if (subscriptionResult) {
        const status = manager.getConnectionStatus()
        console.log('✓ Connection status:', status)
        results.success = true
      } else {
        results.errors.push('Failed to establish subscription')
      }

      // Clean up
      manager.unsubscribe()
      console.log('✓ Cleanup completed')
    } catch (subscriptionError) {
      const error = subscriptionError as Error
      console.log('❌ Subscription test failed:', error.message)
      results.errors.push(`Subscription failed: ${error.message}`)
      manager.unsubscribe()
    }
  } catch (error) {
    const err = error as Error
    console.log('❌ Real-time test failed:', err.message)
    results.errors.push(`Test failed: ${err.message}`)
  }

  return results
}

/**
 * Log real-time test results in a readable format
 */
export function logRealtimeTestResults(results: RealtimeTestResults): void {
  console.log('\n📊 Real-time Test Results:')
  console.log('================================')
  console.log(`✓ Available: ${results.isAvailable ? '✅ YES' : '❌ NO'}`)
  console.log(
    `✓ Connection Time: ${results.connectionTime ? `${results.connectionTime}ms` : 'N/A'}`
  )
  console.log(`✓ Success: ${results.success ? '✅ YES' : '❌ NO'}`)

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:')
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`)
    })
  } else {
    console.log('\n✅ No errors detected')
  }

  console.log(
    '\n🎯 Phase 1 Status:',
    results.success ? '✅ READY FOR PHASE 2' : '❌ NEEDS ATTENTION'
  )
  console.log('================================\n')
}

/**
 * Quick test function for development
 * Call this in the browser console or during development
 */
export async function quickRealtimeTest(userId?: string): Promise<void> {
  if (!userId) {
    console.log('❌ User ID required for real-time test')
    console.log('Usage: quickRealtimeTest("your-user-id")')
    return
  }

  console.log(`🚀 Starting quick real-time test for user: ${userId}`)
  const results = await testRealtimeConnectivity(userId)
  logRealtimeTestResults(results)
}

// Export for window access during development
if (typeof window !== 'undefined') {
  ;(window as any).quickRealtimeTest = quickRealtimeTest
  console.log(
    '🔧 Real-time test utilities loaded. Use quickRealtimeTest("user-id") to test.'
  )
}
