'use client'

import { useState, useEffect } from 'react'
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
  onCategoryUpdated: (category: Category) => void
}

export default function CategoryManagerModal({ isOpen, onClose, categories, onCategoryCreated, onCategoryDeleted, onCategoryUpdated }: Props) {
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState(PALETTE[0])
  const [timeLimitHours, setTimeLimitHours] = useState<string>('')
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 1. Deklaracja funkcji wyciągnięta NAJPIERW
  const handleCancelEdit = () => {
    setEditingId(null)
    setName('')
    setSelectedColor(PALETTE[0])
    setTimeLimitHours('')
    setTimeLimitMinutes('')
    setError(null)
  }

  // 2. DOPIERO POTEM użycie jej w useEffect
  // Reset form when opened or editingId changes
  useEffect(() => {
    if (!isOpen) {
      handleCancelEdit()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleEditInit = (cat: Category) => {
    setEditingId(cat.id)
    setName(cat.name)
    setSelectedColor(cat.color)
    if (cat.time_limit_minutes) {
      setTimeLimitHours(Math.floor(cat.time_limit_minutes / 60).toString())
      setTimeLimitMinutes((cat.time_limit_minutes % 60).toString())
    } else {
      setTimeLimitHours('')
      setTimeLimitMinutes('')
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const hrs = parseInt(timeLimitHours) || 0
      const mins = parseInt(timeLimitMinutes) || 0
      const totalMinutes = (hrs * 60) + mins

      const payload = {
        name: name.trim(),
        color: selectedColor,
        time_limit_minutes: totalMinutes > 0 ? totalMinutes : null
      }

      if (editingId) {
        const updated = await categoriesApi.updateCategory(supabase, editingId, payload)
        onCategoryUpdated(updated)
      } else {
        const newCat = await categoriesApi.createCategory(supabase, payload)
        onCategoryCreated(newCat)
      }
      handleCancelEdit()
    } catch (e: any) {
      console.error('Category save error:', e)
      setError(e?.message || 'Wystąpił nieznany błąd przy zapisie kategorii.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę kategorię? Zostanie odpięta ze wszystkich zadań!')) return
    try {
      await categoriesApi.deleteCategory(supabase, id)
      onCategoryDeleted(id)
      if (editingId === id) handleCancelEdit()
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar">
          {/* Creator Form */}
          <div className="flex flex-col gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-500 uppercase">{editingId ? 'Edytuj kategorię' : 'Nowa kategoria'}</h3>
              {editingId && (
                <button onClick={handleCancelEdit} className="text-xs text-blue-500 hover:text-blue-600">Anuluj edycję</button>
              )}
            </div>

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

            <div className="flex flex-col gap-2">
              <span className="text-xs text-gray-500 font-medium">Tygodniowy limit czasu (opcjonalnie)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Godziny"
                  value={timeLimitHours}
                  onChange={e => setTimeLimitHours(e.target.value)}
                  className="w-24 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                  min="0"
                  max="168"
                />
                <span className="text-sm text-gray-500 font-medium">h</span>
                <input
                  type="number"
                  placeholder="Minuty"
                  value={timeLimitMinutes}
                  onChange={e => setTimeLimitMinutes(e.target.value)}
                  className="w-24 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                  min="0"
                  max="59"
                />
                <span className="text-sm text-gray-500 font-medium">m</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 items-center">
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${selectedColor === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}

              <label
                className={`relative w-6 h-6 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center hover:scale-110 ${!PALETTE.includes(selectedColor) ? 'border-gray-900 dark:border-white scale-110' : 'border-dashed border-gray-400 dark:border-slate-500'}`}
                style={{ backgroundColor: !PALETTE.includes(selectedColor) ? selectedColor : 'transparent', background: !PALETTE.includes(selectedColor) ? undefined : 'conic-gradient(red, yellow, green, cyan, blue, magenta, red)' }}
                title="Wybierz własny kolor z palety"
              >
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {!PALETTE.includes(selectedColor) && (
                  <div className="w-full h-full absolute inset-0 rounded-full mix-blend-overlay opacity-20 bg-white"></div>
                )}
              </label>
            </div>

            <button
              onClick={handleSave}
              disabled={!name.trim() || loading}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center text-sm"
            >
              {loading ? 'Zapisywanie...' : editingId ? 'Zapisz zmiany' : 'Dodaj kategorię'}
            </button>

            {error && (
              <p className="text-xs text-red-500 mt-1 px-1">{error}</p>
            )}
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase">Twoje kategorie</h3>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Brak kategorii. Stwórz pierwszą powyżej.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {categories.map(cat => (
                  <li key={cat.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 group hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1" onClick={() => handleEditInit(cat)}>
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{cat.name}</span>
                        {cat.time_limit_minutes ? (
                          <span className="text-[10px] text-gray-500">Limit: {Math.floor(cat.time_limit_minutes / 60)}h {cat.time_limit_minutes % 60}m</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Brak limitu</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditInit(cat)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-colors"
                        title="Edytuj"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                        title="Usuń kategorię"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
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