import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

export type BacklogItem = Database['public']['Tables']['backlog']['Row']
export type Block = Database['public']['Tables']['blocks']['Row']

export const backlogApi = {
  // Pobieranie aktywnych elementów backlogu
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

  // Przeniesienie z Backlogu na Kalendarz
  async moveToCalendar(
    supabase: SupabaseClient<Database>, 
    backlogItem: BacklogItem, 
    startTime: string, 
    endTime: string
  ) {
    // 1. Dodaj do blocks
    const { error: insertError } = await supabase
      .from('blocks')
      .insert({
        user_id: backlogItem.user_id,
        title: backlogItem.title,
        description: backlogItem.description,
        color_tag: backlogItem.color_tag,
        start_time: startTime,
        end_time: endTime,
        is_completed: backlogItem.is_completed || false,
        is_deleted: false
      })

    if (insertError) throw new Error(insertError.message)

    // 2. Oflaguj jako usunięte w backlogu
    const { error: deleteError } = await supabase
      .from('backlog')
      .update({ is_deleted: true })
      .eq('id', backlogItem.id)

    if (deleteError) throw new Error(deleteError.message)
  },

  // Przeniesienie z Kalendarza do Backlogu
  async moveToBacklog(
    supabase: SupabaseClient<Database>, 
    block: Block, 
    durationMinutes: number
  ) {
    // 1. Dodaj do backlogu
    const { error: insertError } = await supabase
      .from('backlog')
      .insert({
        user_id: block.user_id,
        title: block.title,
        description: block.description,
        color_tag: block.color_tag,
        duration_minutes: durationMinutes,
        is_completed: block.is_completed || false,
        is_deleted: false
      })

    if (insertError) throw new Error(insertError.message)

    // 2. Oflaguj jako usunięte w blocks
    const { error: deleteError } = await supabase
      .from('blocks')
      .update({ is_deleted: true })
      .eq('id', block.id)

    if (deleteError) throw new Error(deleteError.message)
  }
}