import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

export type GlobalTodo = Database['public']['Tables']['global_todos']['Row']

export const globalTodosApi = {
    async getTodos(supabase: SupabaseClient<Database>, userId: string) {
        const { data, error } = await supabase
            .from('global_todos')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    async createTodo(supabase: SupabaseClient<Database>, userId: string, text: string) {
        const { data, error } = await supabase
            .from('global_todos')
            .insert({ user_id: userId, text })
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