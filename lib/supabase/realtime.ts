'use client'

import { createClient } from './client'
import type { Database } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type Note = Database['public']['Tables']['notes']['Row']
export type NoteInsert = Database['public']['Tables']['notes']['Insert']
export type NoteUpdate = Database['public']['Tables']['notes']['Update']

export interface RealtimeNotesConfig {
  userId: string
  onInsert?: (note: Note) => void
  onUpdate?: (note: Note) => void
  onDelete?: (noteId: string) => void
  onError?: (error: Error) => void
}

export class RealtimeNotesManager {
  private channel: RealtimeChannel | null = null
  private supabase = createClient()
  private config: RealtimeNotesConfig | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // Start with 1 second
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isReconnecting = false

  /**
   * Subscribe to real-time updates for notes belonging to a specific user
   */
  subscribe(config: RealtimeNotesConfig): Promise<boolean> {
    this.config = config

    return new Promise(resolve => {
      try {
        // Prevent multiple simultaneous subscriptions
        if (this.channel && this.isConnected) {
          console.log(
            'Real-time already connected, reusing existing connection'
          )
          resolve(true)
          return
        }

        // Clean up any existing subscription
        this.unsubscribe()

        // Reset reconnection state on successful manual subscription
        this.reconnectAttempts = 0
        this.isReconnecting = false
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }

        // Create a new channel for this user's notes
        this.channel = this.supabase
          .channel(`notes:user_id=eq.${config.userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notes',
              filter: `user_id=eq.${config.userId}`,
            },
            payload => {
              const newNote = payload.new as Note
              console.log('Real-time INSERT:', newNote)
              config.onInsert?.(newNote)
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notes',
              filter: `user_id=eq.${config.userId}`,
            },
            payload => {
              const updatedNote = payload.new as Note
              console.log('Real-time UPDATE:', updatedNote)
              config.onUpdate?.(updatedNote)
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'notes',
              filter: `user_id=eq.${config.userId}`,
            },
            payload => {
              const deletedNote = payload.old as Note
              console.log('Real-time DELETE:', deletedNote.id)
              config.onDelete?.(deletedNote.id)
            }
          )
          .subscribe((status, err) => {
            if (err) {
              console.error('Real-time subscription error:', err)
              config.onError?.(new Error(`Subscription failed: ${err}`))
              this.isConnected = false
              this.scheduleReconnect()
              resolve(false)
              return
            }

            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to real-time updates')
              this.isConnected = true
              this.reconnectAttempts = 0 // Reset on successful connection
              resolve(true)
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Real-time channel error')
              config.onError?.(new Error('Channel connection failed'))
              this.isConnected = false
              this.scheduleReconnect()
              resolve(false)
            } else if (status === 'TIMED_OUT') {
              console.error('Real-time subscription timed out')
              config.onError?.(new Error('Connection timed out'))
              this.isConnected = false
              this.scheduleReconnect()
              resolve(false)
            } else if (status === 'CLOSED') {
              console.log('Real-time connection closed')
              this.isConnected = false
              // Don't immediately reconnect on close - might be intentional
              if (!this.isReconnecting) {
                this.scheduleReconnect()
              }
            }
          })
      } catch (error) {
        console.error('Failed to create real-time subscription:', error)
        config.onError?.(error as Error)
        resolve(false)
      }
    })
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(): void {
    // Cancel any pending reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.isReconnecting = false

    if (this.channel) {
      console.log('Unsubscribing from real-time updates')
      this.supabase.removeChannel(this.channel)
      this.channel = null
      this.isConnected = false
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): {
    isConnected: boolean
    channelState?: string
  } {
    const result: { isConnected: boolean; channelState?: string } = {
      isConnected: this.isConnected,
    }

    if (this.channel?.state) {
      result.channelState = this.channel.state.toString()
    }

    return result
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (
      this.isReconnecting ||
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[Realtime] Max reconnection attempts reached, giving up')
        this.config?.onError?.(new Error('Max reconnection attempts reached'))
      }
      return
    }

    this.isReconnecting = true
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    ) // Cap at 30 seconds

    console.log(
      `[Realtime] Scheduling reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} in ${delay}ms`
    )

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++
      this.reconnect()
    }, delay)
  }

  /**
   * Attempt to reconnect if disconnected
   */
  async reconnect(): Promise<boolean> {
    if (!this.config) {
      console.error('Cannot reconnect: no configuration available')
      this.isReconnecting = false
      return false
    }

    console.log(
      `[Realtime] Attempting to reconnect (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    )
    const success = await this.subscribe(this.config)

    if (!success && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.isReconnecting = false
      this.scheduleReconnect()
    }

    return success
  }

  /**
   * Reset connection state (useful for testing or manual recovery)
   */
  reset(): void {
    this.unsubscribe()
    this.reconnectAttempts = 0
    this.isReconnecting = false
  }

  /**
   * Check if real-time is available (for graceful degradation)
   */
  static async isRealtimeAvailable(): Promise<boolean> {
    try {
      const supabase = createClient()
      // Simple test to see if real-time is working
      const testChannel = supabase.channel('test-connectivity-' + Date.now())

      return new Promise(resolve => {
        const timeout = setTimeout(() => {
          supabase.removeChannel(testChannel)
          resolve(false)
        }, 5000) // 5 second timeout

        testChannel.subscribe(status => {
          clearTimeout(timeout)
          supabase.removeChannel(testChannel)
          resolve(status === 'SUBSCRIBED')
        })
      })
    } catch (error) {
      console.error('Real-time availability check failed:', error)
      return false
    }
  }
}

// Singleton instance for the app
export const realtimeNotesManager = new RealtimeNotesManager()

// Utility function to create a scoped manager for a specific user
export function createRealtimeNotesManager(): RealtimeNotesManager {
  return new RealtimeNotesManager()
}
