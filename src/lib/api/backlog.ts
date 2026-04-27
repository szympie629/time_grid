import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

export type BacklogItem = Database['public']['Tables']['backlog']['Row']
export type Block = Database['public']['Tables']['blocks']['Row']

export const backlogApi = {
  async getBacklog(supabase: SupabaseClient<Database>, userId: string) {
    const { data, error } = await supabase
      .from('backlog')
      .select('*')
      .eq('user_id', userId)
      .is('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data as BacklogItem[]
  },

  async moveToCalendar(
    supabase: SupabaseClient<Database>, 
    backlogItem: BacklogItem, 
    startTime: string, 
    endTime: string
  ) {
    const { data: newBlock, error: insertError } = await supabase.from('blocks').insert({
      user_id: backlogItem.user_id,
      title: backlogItem.title,
      description: backlogItem.description,
      color_tag: backlogItem.color_tag,
      start_time: startTime,
      end_time: endTime,
      is_completed: backlogItem.is_completed || false,
      is_deleted: false
    }).select().single() // POBIERZ NOWY REKORD

    if (insertError) throw new Error(insertError.message)

    // Twardy DELETE ze źródła
    const { error: deleteError } = await supabase.from('backlog').delete().eq('id', backlogItem.id)
    if (deleteError) throw new Error(deleteError.message)
    
    return newBlock // ZWRÓĆ NOWY REKORD
  },

  async moveToBacklog(
    supabase: SupabaseClient<Database>, 
    block: Block, 
    durationMinutes: number
  ) {
    const { error: insertError } = await supabase.from('backlog').insert({
      user_id: block.user_id,
      title: block.title,
      description: block.description,
      color_tag: block.color_tag,
      duration_minutes: durationMinutes,
      is_completed: block.is_completed || false,
      is_deleted: false
    })
    if (insertError) throw new Error(insertError.message)

    // Twardy DELETE ze źródła
    const { error: deleteError } = await supabase.from('blocks').delete().eq('id', block.id)
    if (deleteError) throw new Error(deleteError.message)
  }
}