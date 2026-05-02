'use client'

import { useState } from 'react'
import { Category, categoriesApi } from '@/lib/api/categories'
import { supabase } from '@/lib/supabase/client'

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', 
  '#f97316', '#84cc16'
]

interface Props {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  onCategoryCreated: (category: Category) => void
  onCategoryDeleted: (id: string) => void
}

export default function CategoryManagerModal({ isOpen, onClose, categories, onCategoryCreated, onCategoryDeleted }: Props) {
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState(PALETTE[0])
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const newCat = await categoriesApi.createCategory(supabase, {
        name: name.trim(),
        color: selectedColor
      })
      onCategoryCreated(newCat)
      setName('')
      setSelectedColor(PALETTE[0])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę kategorię?')) return
    try {
      await categoriesApi.deleteCategory(supabase, id)
      onCategoryDeleted(id)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Zarządzaj Kategoriami</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar">
          {/* Creator Form */}
          <div className="flex flex-col gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
            <h3 className="text-xs font-bold text-gray-500 uppercase">Nowa kategoria</h3>
            
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Nazwa kategorii..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                maxLength={30}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${selectedColor === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>

            <button
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center text-sm"
            >
              {loading ? 'Zapisywanie...' : 'Dodaj kategorię'}
            </button>
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase">Twoje kategorie</h3>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Brak kategorii. Stwórz pierwszą powyżej.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {categories.map(cat => (
                  <li key={cat.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{cat.name}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                      title="Usuń kategorię"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
