import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Offline - Gravity Note',
  description: 'You are currently offline. Some features may be limited.',
}

export default function OfflinePage() {
  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
      <div className='max-w-md w-full text-center'>
        <div className='mb-8'>
          <h1 className='text-4xl font-bold text-gray-900 mb-4'>
            You&apos;re Offline
          </h1>
          <p className='text-lg text-gray-600 mb-6'>
            Don&apos;t worry! You can still access your recently viewed notes
            and create new ones. They&apos;ll sync when you&apos;re back online.
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border p-6 mb-6'>
          <h2 className='text-xl font-semibold text-gray-900 mb-4'>
            Available Offline Features
          </h2>
          <ul className='text-left space-y-2 text-gray-600'>
            <li className='flex items-center'>
              <span className='w-2 h-2 bg-green-500 rounded-full mr-3'></span>
              View cached notes
            </li>
            <li className='flex items-center'>
              <span className='w-2 h-2 bg-green-500 rounded-full mr-3'></span>
              Create new notes
            </li>
            <li className='flex items-center'>
              <span className='w-2 h-2 bg-green-500 rounded-full mr-3'></span>
              Edit existing notes
            </li>
            <li className='flex items-center'>
              <span className='w-2 h-2 bg-yellow-500 rounded-full mr-3'></span>
              Search (limited to cached content)
            </li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className='bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors'
        >
          Try Again
        </button>

        <p className='text-sm text-gray-500 mt-4'>
          Your changes will automatically sync when you reconnect to the
          internet.
        </p>
      </div>
    </div>
  )
}
