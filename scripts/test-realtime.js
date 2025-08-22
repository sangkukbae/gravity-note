/**
 * Browser test script for real-time functionality
 * Open browser console and paste this script to test Phase 1 implementation
 *
 * Usage:
 * 1. Login with test account: test@example.com / 123123
 * 2. Open browser console
 * 3. Paste and run this script
 * 4. Watch for real-time subscription status and events
 */

console.log('🚀 Starting Gravity Note Real-time Test...')

// Test real-time availability first
async function testPhase1() {
  try {
    // Check if quickRealtimeTest is available (from our test utilities)
    if (typeof quickRealtimeTest !== 'undefined') {
      console.log('📋 Using built-in test utilities...')

      // Get current user ID from auth store
      const user =
        window.__NEXT_DATA__?.props?.pageProps?.user ||
        JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.user

      if (user?.id) {
        console.log(`👤 Found user ID: ${user.id}`)
        await quickRealtimeTest(user.id)
      } else {
        console.log(
          '❌ No user found. Please login with: test@example.com / 123123'
        )
        console.log('💡 Try accessing localStorage auth data manually...')

        // Try to get auth data from localStorage
        const authData = localStorage.getItem('supabase.auth.token')
        if (authData) {
          const parsed = JSON.parse(authData)
          console.log('🔐 Auth data found:', !!parsed)
        }
      }
    } else {
      console.log('⚠️ Quick test utilities not loaded. Testing manually...')
      await manualRealtimeTest()
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Manual test without utilities
async function manualRealtimeTest() {
  console.log('🔧 Running manual real-time test...')

  // Test 1: Check if Supabase client is available
  if (typeof window.supabase === 'undefined') {
    console.log('❌ Supabase client not found on window object')
    return
  }

  // Test 2: Create a test channel
  const testChannel = window.supabase.channel('test-connectivity')

  const timeout = setTimeout(() => {
    console.log('❌ Real-time test timed out (5s)')
    window.supabase.removeChannel(testChannel)
  }, 5000)

  testChannel.subscribe(status => {
    clearTimeout(timeout)
    console.log(`✓ Test channel status: ${status}`)

    if (status === 'SUBSCRIBED') {
      console.log('✅ Real-time is working!')
    } else {
      console.log('❌ Real-time connection failed')
    }

    window.supabase.removeChannel(testChannel)
  })
}

// Interactive test functions
window.testPhase1 = testPhase1
window.manualRealtimeTest = manualRealtimeTest

console.log('🎯 Test functions loaded!')
console.log('📋 Available commands:')
console.log('  - testPhase1(): Run complete Phase 1 test')
console.log('  - manualRealtimeTest(): Run basic connectivity test')
console.log('')
console.log('🔥 Quick start: testPhase1()')
