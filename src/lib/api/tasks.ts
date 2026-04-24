import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

export type Task = Database['public']['Tables']['tasks']['Row']

export const tasksApi = {
  // Pobieranie zadań dla konkretnego bloku
  async getTasks(supabase: SupabaseClient<Database>, blockId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('block_id', blockId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as Task[]
  },

  // Dodawanie nowego zadania
  async createTask(supabase: SupabaseClient<Database>, blockId: string, title: string) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ block_id: blockId, title, is_completed: false })
      .select()
      .single()

    if (error) throw error
    return data as Task
  },

  // Zmiana statusu (ukończone/nieukończone)
  async toggleTask(supabase: SupabaseClient<Database>, id: string, isCompleted: boolean) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_completed: isCompleted })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Task
  },

  // Usuwanie zadania
  async deleteTask(supabase: SupabaseClient<Database>, id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    return true
  }
}