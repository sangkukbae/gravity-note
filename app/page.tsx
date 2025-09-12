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
                The revolutionary minimalist note-taking app
              </span>
            </h1>
            <p className='text-xl md:text-2xl text-neutral-600 dark:text-neutral-300 mb-8 max-w-3xl mx-auto'>
              Captures your thoughts instantly and keeps them perfectly
              organized
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
              <a href='/auth/signup' className='btn-landing-primary'>
                Get Started
              </a>
              <a href='/auth/signin' className='btn-landing-secondary'>
                Sign In
              </a>
            </div>
          </div>

          {/* Features Preview */}
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

            <div className='text-center py-16'>
              <h3 className='text-2xl font-semibold text-neutral-900 dark:text-white mb-4'>
                Ready to Transform Your Note-Taking?
              </h3>
              <p className='text-neutral-600 dark:text-neutral-300 mb-8'>
                Start capturing your thoughts with unprecedented speed and
                simplicity.
              </p>
              <a href='/auth/signup' className='btn-landing-primary'>
                Start Your Journey
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
