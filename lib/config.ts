export const runtimeConfig = {
  // PWA and offline capabilities can be toggled independently if desired
  ENABLE_PWA:
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_ENABLE_PWA === 'true'
      : false,
  OFFLINE_ENABLED:
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_OFFLINE_ENABLED === 'true'
      : false,
}

export function isOfflineFeaturesEnabled() {
  // Always disable in development mode
  if (
    typeof process !== 'undefined' &&
    process.env.NODE_ENV === 'development'
  ) {
    return false
  }

  // Keep offline features gated behind explicit flag; fall back to PWA flag if set
  return runtimeConfig.OFFLINE_ENABLED || runtimeConfig.ENABLE_PWA
}
