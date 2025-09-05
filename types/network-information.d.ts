/**
 * Network Information API Type Declarations
 *
 * Provides TypeScript types for the experimental Network Information API
 * used in the network status monitoring system.
 */

interface NetworkInformation extends EventTarget {
  /** The effective connection type */
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g'

  /** The estimated effective round-trip time in milliseconds */
  readonly rtt: number

  /** The estimated effective bandwidth in megabits per second */
  readonly downlink: number

  /** Whether the user has requested a reduced data usage mode */
  readonly saveData: boolean

  /** Event handler for when the connection changes */
  onchange: ((this: NetworkInformation, ev: Event) => any) | null

  /** Add event listener for connection changes */
  addEventListener(
    type: 'change',
    listener: (this: NetworkInformation, ev: Event) => any,
    options?: boolean | AddEventListenerOptions
  ): void

  /** Remove event listener for connection changes */
  removeEventListener(
    type: 'change',
    listener: (this: NetworkInformation, ev: Event) => any,
    options?: boolean | EventListenerOptions
  ): void
}

declare global {
  interface Navigator {
    /** Standard Network Information API */
    readonly connection?: NetworkInformation

    /** Mozilla-prefixed Network Information API */
    readonly mozConnection?: NetworkInformation

    /** WebKit-prefixed Network Information API */
    readonly webkitConnection?: NetworkInformation
  }
}

export {}
