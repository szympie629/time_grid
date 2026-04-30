import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

export type Task = Database['public']['Tables']['tasks']['Row']

export const tasksApi = {
  async getTasks(supabase: SupabaseClient<Database>, blockId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('block_id', blockId)
      .order('position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as Task[]
  },

  async createTask(supabase: SupabaseClient<Database>, blockId: string, title: string) {
    // Pobierz aktualną max pozycję, żeby nowe zadanie trafiło na koniec
    const { data: existing } = await supabase
      .from('tasks')
      .select('position')
      .eq('block_id', blockId)
      .order('position', { ascending: false })
      .limit(1)

    const maxPos = existing?.[0]?.position ?? -1
    const nextPos = typeof maxPos === 'number' ? maxPos + 1 : 0

    const { data, error } = await supabase
      .from('tasks')
      .insert({ block_id: blockId, title, is_completed: false, position: nextPos })
      .select()
      .single()

    if (error) throw error
    return data as Task
  },

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

  async deleteTask(supabase: SupabaseClient<Database>, id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    return true
  },

  // Zapisuje nową kolejność: tablica tasków w docelowej kolejności
  async reorderTasks(supabase: SupabaseClient<Database>, orderedTasks: Task[]) {
    const updates = orderedTasks.map((task, index) =>
      supabase
        .from('tasks')
        .update({ position: index })
        .eq('id', task.id)
    )
    await Promise.all(updates)
  },
}