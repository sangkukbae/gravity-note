'use client'

import type { Metadata } from 'next'
import { useCosmicScroll } from '@/hooks/use-cosmic-scroll'

export default function HomePage() {
  const { gradientCenterY, opacity, scrollProgress, scrollY } =
    useCosmicScroll()

  // Dynamic header styling based on scroll position
  const scrollThreshold = 20 // Start transition early for smoother effect
  const transitionRange = 80 // Distance over which transition occurs

  // Calculate opacity for smooth transition (0 to 1 over transition range)
  const headerOpacity =
    scrollY <= scrollThreshold
      ? 0
      : Math.min((scrollY - scrollThreshold) / transitionRange, 1)

  const isScrolled = scrollY > scrollThreshold

  const cosmicStyles = {
    '--cosmic-center-x': '50%',
    '--cosmic-center-y': `${gradientCenterY}%`,
    '--cosmic-opacity': opacity,
    '--cosmic-glow-x': '50%',
    '--cosmic-glow-y': `${gradientCenterY + 5}%`,
    '--cosmic-glow-opacity': opacity * 0.7,
  } as React.CSSProperties

  // Dynamic header classes - always include base transition
  const headerClasses = `
    header-glass-dynamic transition-all duration-500 ease-out
    border-b
    ${
      isScrolled ? 'border-white/20 dark:border-white/10' : 'border-transparent'
    }
  `.trim()

  return (
    <main className='min-h-screen relative overflow-hidden'>
      {/* Navigation Header */}
      <header className='fixed top-0 left-0 right-0 z-50'>
        <nav
          className={headerClasses}
          style={
            {
              backdropFilter: `blur(${headerOpacity * 12}px)`,
              WebkitBackdropFilter: `blur(${headerOpacity * 12}px)`, // Safari support
              // Use CSS custom properties for dark mode compatibility
              '--header-bg-opacity': headerOpacity,
            } as React.CSSProperties
          }
        >
          <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex items-center justify-between h-14 sm:h-16'>
              {/* Logo */}
              <div className='flex-shrink-0'>
                <a href='/' className='group'>
                  <h1 className='text-lg sm:text-xl font-semibold transition-all duration-200 group-hover:scale-105'>
                    <span className='text-gradient'>Gravity Note</span>
                  </h1>
                </a>
              </div>

              {/* Navigation Buttons */}
              <div className='flex items-center space-x-2 sm:space-x-3'>
                <a
                  href='/auth/signin'
                  className='inline-flex items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10 rounded-md transition-all duration-200'
                >
                  Log in
                </a>
                <a
                  href='/auth/signup'
                  className='inline-flex items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-all duration-200 shadow-sm hover:shadow-md border border-primary-500/20'
                >
                  Sign up
                </a>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Cosmic Gradient Background */}
      <div
        className='cosmic-gradient-container cosmic-animated'
        style={cosmicStyles}
      >
        {/* Deep space background */}
        <div className='cosmic-space-background' />

        {/* Primary cosmic orb */}
        <div className='cosmic-orb-primary' />

        {/* Secondary glow effect */}
        <div className='cosmic-glow-secondary' />

        {/* Grain texture overlay for depth */}
        <div
          className='absolute inset-0 opacity-[0.015] dark:opacity-[0.01]'
          style={{
            backgroundImage: `url(/images/grain.png)`,
            backgroundRepeat: 'repeat',
            backgroundSize: '100px 100px',
            backgroundPosition: 'left top',
            backgroundBlendMode: 'overlay',
            mixBlendMode: 'overlay',
          }}
        />
      </div>

      {/* Content */}
      <div className='relative z-10 container mx-auto px-4 pt-28 sm:pt-32 pb-16'>
        <div className='max-w-4xl mx-auto text-center'>
          {/* Hero Section */}
          <div className='mb-16'>
            <h1 className='text-4xl md:text-6xl font-bold text-neutral-900 dark:text-white mb-6'>
              <span className='text-gradient'>
                Your thoughts deserve gravity, not folders
              </span>
            </h1>
            <p className='text-xl md:text-2xl text-neutral-600 dark:text-neutral-300 mb-6 max-w-3xl mx-auto'>
              Inspired by Andrej Karpathy&apos;s append-and-review methodology.
            </p>
            <p className='text-lg md:text-xl text-neutral-500 dark:text-neutral-400 mb-8 max-w-2xl mx-auto'>
              One infinite stream. Zero organization overhead. Pure thought
              capture.
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
              <a href='/auth/signup' className='btn-landing-primary'>
                Start Your Stream
              </a>
              <a href='#philosophy' className='btn-landing-secondary'>
                See the Philosophy
              </a>
            </div>
          </div>

          {/* Philosophy Benefits */}
          <div className='grid md:grid-cols-3 gap-8 mb-16'>
            <div className='feature-card-modern'>
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
                    d='M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-semibold text-neutral-900 dark:text-white mb-2'>
                One Stream, Infinite Clarity
              </h3>
              <p className='text-neutral-600 dark:text-neutral-300'>
                No folders to navigate. No tags to manage. Just one continuous
                stream where every thought lands instantly. Your mind stays in
                flow state.
              </p>
            </div>

            <div className='feature-card-modern'>
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
                    d='M7 11l5-5m0 0l5 5m-5-5v12'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-semibold text-neutral-900 dark:text-white mb-2'>
                Natural Gravity Review
              </h3>
              <p className='text-neutral-600 dark:text-neutral-300'>
                Important ideas naturally rise through periodic review. Rescue
                valuable thoughts back to the surface. Let irrelevant notes sink
                naturally.
              </p>
            </div>

            <div className='feature-card-modern'>
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
                100ms to Capture
              </h3>
              <p className='text-neutral-600 dark:text-neutral-300'>
                From thought to saved in under 100ms. No decisions, no friction.
                Open, type, done. Your working memory stays free for thinking.
              </p>
            </div>
          </div>

          {/* The Methodology Section */}
          <div id='philosophy' className='mt-32 mb-16'>
            <div className='text-center mb-12'>
              <h2 className='text-3xl font-bold text-neutral-900 dark:text-white mb-4'>
                Why Gravity Over Organization?
              </h2>
              <p className='text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto'>
                Your brain doesn&apos;t organize thoughts in folders. Neither
                should your notes.
              </p>
            </div>

            <div className='grid md:grid-cols-3 gap-8 mb-16'>
              {/* Traditional Apps Problem */}
              <div className='text-center p-6 bg-white/50 dark:bg-neutral-800/30 backdrop-blur-sm border border-white/20 dark:border-neutral-700/30 rounded-xl'>
                <div className='w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mb-4 mx-auto'>
                  <svg
                    className='w-6 h-6 text-red-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z'
                    />
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M8 1v6m8-6v6'
                    />
                  </svg>
                </div>
                <h3 className='text-lg font-semibold text-neutral-900 dark:text-white mb-3'>
                  Traditional Apps Force Structure
                </h3>
                <ul className='text-sm text-neutral-600 dark:text-neutral-300 space-y-2 text-left'>
                  <li>• Folders interrupt thought flow</li>
                  <li>• Tags create decision fatigue</li>
                  <li>• Categories become mental prisons</li>
                  <li>• Organization becomes procrastination</li>
                </ul>
              </div>

              {/* Gravity Note Solution */}
              <div className='text-center p-6 bg-primary-50/50 dark:bg-neutral-800/40 backdrop-blur-sm border border-primary-200/20 dark:border-primary-800/30 rounded-xl'>
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
                      d='M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
                    />
                  </svg>
                </div>
                <h3 className='text-lg font-semibold text-neutral-900 dark:text-white mb-3'>
                  Gravity Note Uses Time
                </h3>
                <ul className='text-sm text-neutral-600 dark:text-neutral-300 space-y-2 text-left'>
                  <li>• Recent thoughts stay visible</li>
                  <li>• Important ideas get rescued up</li>
                  <li>• Irrelevant notes naturally sink</li>
                  <li>• Time provides natural organization</li>
                </ul>
              </div>

              {/* Brain Science */}
              <div className='text-center p-6 bg-green-50/50 dark:bg-neutral-800/30 backdrop-blur-sm border border-green-200/20 dark:border-green-800/30 rounded-xl'>
                <div className='w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4 mx-auto'>
                  <svg
                    className='w-6 h-6 text-green-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9.663 17h4.673M12 3v1m6.364-.707l-.707.707M21 12h-1M17.657 17.657l-.707-.707M12 21v-1m-6.364.707l.707-.707M3 12h1M6.343 6.343l.707.707'
                    />
                  </svg>
                </div>
                <h3 className='text-lg font-semibold text-neutral-900 dark:text-white mb-3'>
                  Your Brain Works This Way
                </h3>
                <ul className='text-sm text-neutral-600 dark:text-neutral-300 space-y-2 text-left'>
                  <li>• Memory naturally fades over time</li>
                  <li>• Repetition strengthens recall</li>
                  <li>• Attention creates importance</li>
                  <li>• Context emerges through patterns</li>
                </ul>
              </div>
            </div>

            {/* Quote from Karpathy */}
            <div className='bg-white/30 dark:bg-neutral-800/50 backdrop-blur-sm border border-white/20 dark:border-neutral-700/30 rounded-xl p-8 max-w-3xl mx-auto'>
              <blockquote className='text-lg italic text-neutral-700 dark:text-neutral-300 text-center mb-4'>
                &quot;I have a single .txt file on all my devices that is always
                available where I jot down random ideas. No structure, no
                organization, just pure append-and-review.&quot;
              </blockquote>
              <p className='text-sm text-neutral-500 dark:text-neutral-400 text-center'>
                — Andrej Karpathy, AI Researcher & Former Director of AI at
                Tesla
              </p>
            </div>
          </div>

          {/* Additional content to make page scrollable for testing */}
          <div className='mt-32 space-y-16'>
            <div className='text-center'>
              <h2 className='text-3xl font-bold text-neutral-900 dark:text-white mb-4'>
                Experience the Future of Note-Taking
              </h2>
              <p className='text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto'>
                Join thousands of users who have transformed their thought
                capture process with our revolutionary approach.
              </p>
            </div>

            <div className='grid md:grid-cols-2 gap-12 items-center'>
              <div>
                <h3 className='text-2xl font-semibold text-neutral-900 dark:text-white mb-4'>
                  Effortless Capture
                </h3>
                <p className='text-neutral-600 dark:text-neutral-300 mb-6'>
                  No folders, no tags, no decisions. Just pure, friction-free
                  thought capture that lets your ideas flow naturally.
                </p>
                <ul className='space-y-3 text-neutral-600 dark:text-neutral-300'>
                  <li className='flex items-center'>
                    <span className='w-2 h-2 bg-primary-500 rounded-full mr-3'></span>
                    Instant note creation in under 100ms
                  </li>
                  <li className='flex items-center'>
                    <span className='w-2 h-2 bg-primary-500 rounded-full mr-3'></span>
                    Real-time sync across all devices
                  </li>
                  <li className='flex items-center'>
                    <span className='w-2 h-2 bg-primary-500 rounded-full mr-3'></span>
                    Powerful full-text search
                  </li>
                </ul>
              </div>
              <div className='bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm border border-white/20 dark:border-neutral-700/30 rounded-xl p-8'>
                <div className='space-y-4'>
                  <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4'></div>
                  <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2'></div>
                  <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6'></div>
                  <div className='h-4 bg-primary-200 dark:bg-primary-800 rounded w-2/3'></div>
                </div>
              </div>
            </div>

            {/* Trust & Transparency Section */}
            <div className='bg-white/50 dark:bg-neutral-800/40 backdrop-blur-sm border border-white/20 dark:border-neutral-700/30 rounded-xl p-8 mb-16'>
              <div className='text-center mb-8'>
                <h3 className='text-2xl font-semibold text-neutral-900 dark:text-white mb-4'>
                  Your Data, Your Control
                </h3>
                <p className='text-neutral-600 dark:text-neutral-300'>
                  Radical simplicity shouldn&apos;t mean giving up control.
                </p>
              </div>

              <div className='grid md:grid-cols-3 gap-6'>
                <div className='text-center'>
                  <div className='w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-3 mx-auto'>
                    <svg
                      className='w-5 h-5 text-green-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                      />
                    </svg>
                  </div>
                  <h4 className='font-semibold text-neutral-900 dark:text-white mb-2'>
                    Private by Default
                  </h4>
                  <p className='text-sm text-neutral-600 dark:text-neutral-300'>
                    Your notes are encrypted and only you can access them. No AI
                    training, no data mining.
                  </p>
                </div>

                <div className='text-center'>
                  <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-3 mx-auto'>
                    <svg
                      className='w-5 h-5 text-blue-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10'
                      />
                    </svg>
                  </div>
                  <h4 className='font-semibold text-neutral-900 dark:text-white mb-2'>
                    Export Anytime
                  </h4>
                  <p className='text-sm text-neutral-600 dark:text-neutral-300'>
                    One-click export to plain text. No lock-in, no proprietary
                    formats. Your data is portable.
                  </p>
                </div>

                <div className='text-center'>
                  <div className='w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-3 mx-auto'>
                    <svg
                      className='w-5 h-5 text-purple-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                  </div>
                  <h4 className='font-semibold text-neutral-900 dark:text-white mb-2'>
                    Try Risk-Free
                  </h4>
                  <p className='text-sm text-neutral-600 dark:text-neutral-300'>
                    30-day trial with full functionality. Cancel anytime with
                    complete data export.
                  </p>
                </div>
              </div>
            </div>

            <div className='text-center py-16'>
              <h3 className='text-2xl font-semibold text-neutral-900 dark:text-white mb-4'>
                Ready to Let Your Thoughts Flow?
              </h3>
              <p className='text-neutral-600 dark:text-neutral-300 mb-8'>
                Join the movement toward friction-free thinking. No folders, no
                tags, just pure thought capture.
              </p>
              <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
                <a href='/auth/signup' className='btn-landing-primary'>
                  Start Your Stream
                </a>
                <a href='/auth/signin' className='btn-landing-secondary'>
                  Watch Demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
