import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

export type MindDump = Database['public']['Tables']['mind_dumps']['Row']

export const mindDumpApi = {
    async getEntries(supabase: SupabaseClient<Database>, userId: string) {
        const { data, error } = await supabase
            .from('mind_dumps')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    async createEntry(supabase: SupabaseClient<Database>, userId: string, text: string, tag: string) {
        const { data, error } = await supabase
            .from('mind_dumps')
            .insert({ user_id: userId, text, tag })
            .select().single()
        if (error) throw error
        return data
    },

    async deleteEntry(supabase: SupabaseClient<Database>, id: string) {
        const { error } = await supabase.from('mind_dumps').delete().eq('id', id)
        if (error) throw error
    }
}