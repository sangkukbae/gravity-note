export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string | null
          content: string
          created_at: string
          updated_at: string
          is_rescued: boolean
          original_note_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          content: string
          created_at?: string
          updated_at?: string
          is_rescued?: boolean
          original_note_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          content?: string
          created_at?: string
          updated_at?: string
          is_rescued?: boolean
          original_note_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
