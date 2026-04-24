import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

// Wyciągamy typy prosto z wygenerowanego pliku
export type Block = Database['public']['Tables']['blocks']['Row']
export type BlockInsert = Database['public']['Tables']['blocks']['Insert']
export type BlockUpdate = Database['public']['Tables']['blocks']['Update']

export const blocksApi = {
  // POBIERANIE BLOKÓW (np. dla konkretnego tygodnia)
  async getBlocks(supabase: SupabaseClient<Database>, userId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('user_id', userId) // Wymuszamy filtrację po Twoim ID
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: true })

    if (error) throw new Error(error.message)
    return data as Block[]
  },

  // TWORZENIE NOWEGO BLOKU
  async createBlock(supabase: SupabaseClient<Database>, blockData: BlockInsert) {
    const { data, error } = await supabase
      .from('blocks')
      .insert(blockData)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Block
  },

  // AKTUALIZACJA BLOKU (np. po przesunięciu Drag & Drop)
  async updateBlock(supabase: SupabaseClient<Database>, id: string, updates: BlockUpdate) {
    const { data, error } = await supabase
      .from('blocks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Block
  },

  // USUWANIE BLOKU
  async deleteBlock(supabase: SupabaseClient<Database>, id: string) {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return true
  }
}