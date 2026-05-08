import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

export const stickyNotesApi = {
    async createNote(supabase: SupabaseClient<Database>, userId: string, content: string) {
        const { data, error } = await supabase
            .from('sticky_notes')
            .insert({ user_id: userId, content })
            .select().single()
        if (error) throw error
        return data
    }
}