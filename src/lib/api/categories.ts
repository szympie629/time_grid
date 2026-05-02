import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export const categoriesApi = {
  async getCategories(supabase: SupabaseClient<Database>) {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as Category[]
  },

  async createCategory(supabase: SupabaseClient<Database>, category: Omit<CategoryInsert, 'user_id'>) {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('categories')
      .insert({ ...category, user_id: userData.user.id })
      .select()
      .single()

    if (error) throw error
    return data as Category
  },

  async updateCategory(supabase: SupabaseClient<Database>, id: string, category: CategoryUpdate) {
    const { data, error } = await supabase
      .from('categories')
      .update(category)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Category
  },

  async deleteCategory(supabase: SupabaseClient<Database>, id: string) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
