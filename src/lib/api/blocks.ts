import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

export type Block = Database['public']['Tables']['blocks']['Row']
export type BlockInsert = Database['public']['Tables']['blocks']['Insert']
export type BlockUpdate = Database['public']['Tables']['blocks']['Update']

export const blocksApi = {
  // Pobieramy WSZYSTKIE bloki użytkownika (zarówno z datą na kalendarz, jak i bez daty na backlog)
  async getBlocks(supabase: SupabaseClient<Database>, userId: string) {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('user_id', userId)
      .is('is_deleted', false) // Tylko te, które nie są w koszu
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data as Block[]
  },

  async createBlock(supabase: SupabaseClient<Database>, blockData: BlockInsert) {
    const { data, error } = await supabase
      .from('blocks')
      .insert(blockData)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Block
  },

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

  // Przechodzimy na Soft Delete (wymagane dla "Kosza")
  async deleteBlock(supabase: SupabaseClient<Database>, id: string) {
    const { error } = await supabase
      .from('blocks')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) throw new Error(error.message)
    return true
  }
}