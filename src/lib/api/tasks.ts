import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

// Wyciągamy typy prosto z wygenerowanego pliku
export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export const tasksApi = {
  // POBIERANIE ZADAŃ DLA KONKRETNEGO BLOKU
  async getTasksByBlockId(supabase: SupabaseClient<Database>, blockId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('block_id', blockId)
      // Sortujemy od najstarszego do najnowszego, żeby checkboxy nie skakały
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return data as Task[]
  },

  // TWORZENIE NOWEGO ZADANIA
  async createTask(supabase: SupabaseClient<Database>, taskData: TaskInsert) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Task
  },

  // AKTUALIZACJA ZADANIA (głównie do odhaczania is_completed lub edycji tekstu)
  async updateTask(supabase: SupabaseClient<Database>, id: string, updates: TaskUpdate) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Task
  },

  // USUWANIE ZADANIA
  async deleteTask(supabase: SupabaseClient<Database>, id: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return true
  }
}