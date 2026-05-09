import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

export type StickyNote = Database['public']['Tables']['sticky_notes']['Row']

export const stickyNotesApi = {
    async getNotes(supabase: SupabaseClient<Database>, userId: string) {
        const { data, error } = await supabase
            .from('sticky_notes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data as StickyNote[]
    },

    async createNote(supabase: SupabaseClient<Database>, userId: string, content: string, color: string | null = 'yellow') {
        const { data, error } = await supabase
            .from('sticky_notes')
            .insert({ user_id: userId, content, color })
            .select().single()
        if (error) throw error
        return data as StickyNote
    },

    async updateNote(supabase: SupabaseClient<Database>, id: string, updates: Partial<Database['public']['Tables']['sticky_notes']['Update']>) {
        const { data, error } = await supabase
            .from('sticky_notes')
            .update(updates)
            .eq('id', id)
            .select().single()
        if (error) throw error
        return data as StickyNote
    },

    async deleteNote(supabase: SupabaseClient<Database>, id: string) {
        const { error } = await supabase
            .from('sticky_notes')
            .delete()
            .eq('id', id)
        if (error) throw error
    }
}