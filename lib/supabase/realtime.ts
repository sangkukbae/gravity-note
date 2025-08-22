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

  /**
   * Subscribe to real-time updates for notes belonging to a specific user
   */
  subscribe(config: RealtimeNotesConfig): Promise<boolean> {
    this.config = config

    return new Promise(resolve => {
      try {
        // Clean up any existing subscription
        this.unsubscribe()

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
              resolve(false)
              return
            }

            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to real-time updates')
              this.isConnected = true
              resolve(true)
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Real-time channel error')
              config.onError?.(new Error('Channel connection failed'))
              this.isConnected = false
              resolve(false)
            } else if (status === 'TIMED_OUT') {
              console.error('Real-time subscription timed out')
              config.onError?.(new Error('Connection timed out'))
              this.isConnected = false
              resolve(false)
            } else if (status === 'CLOSED') {
              console.log('Real-time connection closed')
              this.isConnected = false
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
   * Attempt to reconnect if disconnected
   */
  async reconnect(): Promise<boolean> {
    if (!this.config) {
      console.error('Cannot reconnect: no configuration available')
      return false
    }

    console.log('Attempting to reconnect to real-time...')
    return this.subscribe(this.config)
  }

  /**
   * Check if real-time is available (for graceful degradation)
   */
  static async isRealtimeAvailable(): Promise<boolean> {
    try {
      const supabase = createClient()
      // Simple test to see if real-time is working
      const testChannel = supabase.channel('test-connectivity')

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
