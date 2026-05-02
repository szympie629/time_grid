'use client'

import { useState } from 'react'
import { Category } from '@/lib/api/categories'
import { supabase } from '@/lib/supabase/client'
import { ritualsApi, Ritual, RitualItem, RitualInsert } from '@/lib/api/rituals'

interface Props {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  rituals: Ritual[]
  onRitualCreated: (ritual: Ritual) => void
  onRitualUpdated: (ritual: Ritual) => void
  onRitualDeleted: (id: string) => void
}

export default function RitualManagerModal({ isOpen, onClose, categories, rituals, onRitualCreated, onRitualUpdated, onRitualDeleted }: Props) {
  const [view, setView] = useState<'list' | 'edit'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [name, setName] = useState('')
  const [items, setItems] = useState<RitualItem[]>([])
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleOpenEdit = (ritual?: Ritual) => {
    if (ritual) {
      setEditingId(ritual.id)
      setName(ritual.name)
      setItems(ritual.items)
    } else {
      setEditingId(null)
      setName('')
      setItems([
        { id: crypto.randomUUID(), title: 'Nowe zadanie', duration_minutes: 30, category_id: null }
      ])
    }
    setView('edit')
  }

  const handleSave = async () => {
    if (!name.trim() || items.length === 0) return
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (editingId) {
        await ritualsApi.updateRitual(supabase, editingId, { name: name.trim(), items: items as any })
        onRitualUpdated({ id: editingId, name: name.trim(), items, user_id: user.id, created_at: new Date().toISOString() })
      } else {
        const payload: RitualInsert = {
          user_id: user.id,
          name: name.trim(),
          items: items as any
        }
        const newRitual = await ritualsApi.createRitual(supabase, payload)
        onRitualCreated(newRitual)
      }
      setView('list')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten rytuał?')) return
    try {
      await ritualsApi.deleteRitual(supabase, id)
      onRitualDeleted(id)
    } catch (e) {
      console.error(e)
    }
  }

  const addItem = () => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), title: '', duration_minutes: 30, category_id: null }])
  }

  const updateItem = (index: number, updates: Partial<RitualItem>) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === items.length - 1)) return;
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 transition-opacity">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {view === 'list' ? 'Zarządzaj Rytuałami' : (editingId ? 'Edytuj Rytuał' : 'Nowy Rytuał')}
          </h3>
          <button 
            onClick={() => view === 'edit' ? setView('list') : onClose()} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            {view === 'edit' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            )}
          </button>
        </div>

        {view === 'list' ? (
          <div className="flex flex-col flex-1 min-h-[300px] overflow-hidden">
            <div className="p-4 flex-1 overflow-y-auto">
              {rituals.length === 0 ? (
                <div className="text-center py-10 text-gray-500 dark:text-slate-400 text-sm">
                  Nie masz jeszcze żadnych rytuałów.<br/>Stwórz swój pierwszy zestaw zadań!
                </div>
              ) : (
                <ul className="space-y-2">
                  {rituals.map(ritual => (
                    <li key={ritual.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-slate-200 text-sm">{ritual.name}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">{ritual.items?.length || 0} zadań</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenEdit(ritual)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onClick={() => handleDelete(ritual.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 mt-auto">
              <button 
                onClick={() => handleOpenEdit()}
                className="w-full py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl font-medium transition-colors border border-blue-200 dark:border-blue-900/50 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Stwórz Nowy Rytuał
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Nazwa Rytuału</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Poranna Rutyna"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Zadania ({items.length})</label>
              <div className="flex flex-col gap-3">
                {items.map((item, idx) => {
                  const selectedCategoryColor = categories.find(c => c.id === item.category_id)?.color || '#94a3b8';
                  
                  return (
                    <div key={item.id} className="flex gap-2 items-center bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 rounded-xl p-3 relative group">
                      <div className="flex flex-col gap-1 mr-1">
                        <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        </button>
                        <button onClick={() => moveItem(idx, 'down')} disabled={idx === items.length - 1} className="text-gray-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                      </div>

                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex justify-between items-center gap-2">
                          <input
                            value={item.title}
                            onChange={(e) => updateItem(idx, { title: e.target.value })}
                            placeholder="Nazwa zadania"
                            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2 rounded-lg text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                          />
                          <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Usuń zadanie">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            value={item.duration_minutes}
                            onChange={(e) => updateItem(idx, { duration_minutes: parseInt(e.target.value) || 0 })}
                            className="w-20 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2 rounded-lg text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                            min="5" step="5"
                          />
                          <span className="text-sm text-gray-500">min</span>
                          
                          <div className="flex-1 relative flex items-center">
                            <div className="absolute left-3 w-3 h-3 rounded-full z-10" style={{ backgroundColor: !item.category_id ? '#94a3b8' : selectedCategoryColor }}></div>
                            <select
                              value={item.category_id || ''}
                              onChange={(e) => updateItem(idx, { category_id: e.target.value || null })}
                              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 py-2 pl-8 pr-2 rounded-lg text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-white appearance-none"
                            >
                              <option value="">Brak kategorii</option>
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <div className="absolute right-2 pointer-events-none text-gray-400">
                               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button 
                onClick={addItem}
                className="mt-3 w-full py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 transition-colors"
              >
                + Dodaj zadanie
              </button>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-slate-800">
              <button 
                onClick={handleSave}
                disabled={loading || !name.trim() || items.length === 0}
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {loading ? 'Zapisywanie...' : 'Zapisz Rytuał'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
