import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gravity Note - Revolutionary Minimalist Note-Taking',
  description:
    'Capture your thoughts instantly with our revolutionary minimalist note-taking application. Perfect for quick notes, ideas, and thoughts that matter.',
}

export default function HomePage() {
  return (
    <main className='min-h-screen bg-white dark:bg-neutral-900'>
      <div className='container mx-auto px-4 py-16'>
        <div className='max-w-4xl mx-auto text-center'>
          {/* Hero Section */}
          <div className='mb-16'>
            <h1 className='text-4xl md:text-6xl font-bold text-neutral-900 dark:text-white mb-6'>
              <span className='text-gradient'>Gravity Note</span>
            </h1>
            <p className='text-xl md:text-2xl text-neutral-600 dark:text-neutral-300 mb-8 max-w-3xl mx-auto'>
              A revolutionary minimalist note-taking application that captures
              your thoughts instantly and keeps them perfectly organized.
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
              <a
                href='/auth/signup'
                className='bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg rounded-md font-medium transition-colors'
              >
                Get Started
              </a>
              <a
                href='/auth/signin'
                className='border border-input bg-background hover:bg-accent hover:text-accent-foreground px-8 py-3 text-lg rounded-md font-medium transition-colors'
              >
                Sign In
              </a>
            </div>
          </div>

          {/* Features Preview */}
          <div className='grid md:grid-cols-3 gap-8 mb-16'>
            <div className='card p-6'>
              <div className='w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4 mx-auto'>
                <svg
                  className='w-6 h-6 text-primary-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M13 10V3L4 14h7v7l9-11h-7z'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-semibold text-neutral-900 dark:text-white mb-2'>
                Instant Capture
              </h3>
              <p className='text-neutral-600 dark:text-neutral-300'>
                Capture your thoughts in under 100ms. No friction, no delay,
                just pure speed.
              </p>
            </div>

            <div className='card p-6'>
              <div className='w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4 mx-auto'>
                <svg
                  className='w-6 h-6 text-primary-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-semibold text-neutral-900 dark:text-white mb-2'>
                Smart Search
              </h3>
              <p className='text-neutral-600 dark:text-neutral-300'>
                Find any note instantly with our powerful search that
                understands context.
              </p>
            </div>

            <div className='card p-6'>
              <div className='w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4 mx-auto'>
                <svg
                  className='w-6 h-6 text-primary-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-semibold text-neutral-900 dark:text-white mb-2'>
                Universal Access
              </h3>
              <p className='text-neutral-600 dark:text-neutral-300'>
                PWA-first design means your notes work everywhere, even offline.
              </p>
            </div>
          </div>

          {/* Status */}
          <div className='bg-primary-50 dark:bg-primary-950 rounded-lg p-6'>
            <h2 className='text-2xl font-semibold text-neutral-900 dark:text-white mb-4'>
              Development Status
            </h2>
            <p className='text-neutral-600 dark:text-neutral-300 mb-4'>
              Gravity Note is currently in active development. We&apos;re
              building something amazing for you.
            </p>
            <div className='flex items-center justify-center gap-2'>
              <div className='w-2 h-2 bg-primary-500 rounded-full animate-pulse'></div>
              <span className='text-sm text-primary-600 dark:text-primary-400 font-medium'>
                Phase 1: Foundation & Core Features
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
