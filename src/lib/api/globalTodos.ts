import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

export type GlobalTodo = Database['public']['Tables']['global_todos']['Row']

export const globalTodosApi = {
    async getTodos(supabase: SupabaseClient<Database>, userId: string, weekStart?: string, weekEnd?: string) {
        let query = supabase
            .from('global_todos')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (weekStart && weekEnd) {
            query = query
                .gte('created_at', weekStart)
                .lte('created_at', weekEnd)
        }

        const { data, error } = await query

        if (error) throw error
        return data
    },

    async createTodo(supabase: SupabaseClient<Database>, userId: string, text: string, weekStart?: string) {

        // If weekStart is provided, stamp the todo to noon of that Monday so it
        // always falls within the viewed week's filter range (regardless of timezone).
        const created_at = weekStart
            ? new Date(`${weekStart}T12:00:00`).toISOString()
            : undefined

        const { data, error } = await supabase
            .from('global_todos')
            .insert({ user_id: userId, text, ...(created_at ? { created_at } : {}) })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async toggleTodo(supabase: SupabaseClient<Database>, id: string, isCompleted: boolean) {
        const { data, error } = await supabase
            .from('global_todos')
            .update({ is_completed: isCompleted })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deleteTodo(supabase: SupabaseClient<Database>, id: string) {
        const { error } = await supabase
            .from('global_todos')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}