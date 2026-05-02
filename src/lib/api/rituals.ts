import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

export type RitualRow = Database['public']['Tables']['rituals']['Row']
export type RitualInsert = Database['public']['Tables']['rituals']['Insert']

// Define the structure of a single task block inside a ritual
export interface RitualBlock {
  id: string
  title: string
  duration_minutes: number
  category_id: string | null
}

export interface Ritual extends Omit<RitualRow, 'blocks'> {
  blocks: RitualBlock[]
}

export const ritualsApi = {
  async getRituals(supabase: SupabaseClient<Database>, userId: string): Promise<Ritual[]> {
    const { data, error } = await supabase
      .from('rituals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    
    // Parse JSON safely
    return data.map(row => ({
      ...row,
      blocks: Array.isArray(row.blocks) ? (row.blocks as any[]) : []
    }))
  },

  async createRitual(supabase: SupabaseClient<Database>, payload: RitualInsert): Promise<Ritual> {
    const { data, error } = await supabase
      .from('rituals')
      .insert([payload])
      .select()
      .single()

    if (error) throw new Error(error.message)
    return {
      ...data,
      blocks: Array.isArray(data.blocks) ? (data.blocks as any[]) : []
    }
  },

  async updateRitual(supabase: SupabaseClient<Database>, id: string, updates: Partial<RitualInsert>): Promise<void> {
    const { error } = await supabase
      .from('rituals')
      .update(updates)
      .eq('id', id)

    if (error) throw new Error(error.message)
  },

  async deleteRitual(supabase: SupabaseClient<Database>, id: string): Promise<void> {
    const { error } = await supabase
      .from('rituals')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  }
}
