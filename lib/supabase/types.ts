// lib/supabase/types.ts

export type Database = {
  public: {
    Tables: {
      memberships: {
        Row: {
          id: string
          athlete_id: string
          plan: string
          start_date: string
          end_date: string
          status: string
          created_at: string | null
        }
        Insert: {
          id?: string
          athlete_id: string
          plan: string
          start_date: string
          end_date: string
          status?: string
          created_at?: string | null
        }
        Update: {
          plan?: string
          start_date?: string
          end_date?: string
          status?: string
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
