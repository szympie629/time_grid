'use client'

import { useState } from 'react'
import { Category } from '@/lib/api/categories'
import { supabase } from '@/lib/supabase/client'
import { ritualsApi, Ritual, RitualItem, RitualInsert } from '@/lib/api/rituals'
import { formatTaskCount } from '@/utils/grammar'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="4" cy="2.5" r="1" />
      <circle cx="8" cy="2.5" r="1" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="8" cy="6" r="1" />
      <circle cx="4" cy="9.5" r="1" />
      <circle cx="8" cy="9.5" r="1" />
    </svg>
  )
}

export const RITUAL_ICONS = [
  { id: 'document', svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg> },
  { id: 'coffee', svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg> },
  { id: 'sun', svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> },
  { id: 'moon', svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> },
  { id: 'star', svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> },
  { id: 'heart', svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> },
  { id: 'zap', svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> },
  { id: 'book', svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> }
]

const RITUAL_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b']

interface SortableRitualItemProps {
  item: RitualItem;
  idx: number;
  categories: Category[];
  openCategoryIndex: number | null;
  setOpenCategoryIndex: (idx: number | null) => void;
  updateItem: (idx: number, updates: Partial<RitualItem>) => void;
  removeItem: (idx: number) => void;
}

function SortableRitualItem({ item, idx, categories, openCategoryIndex, setOpenCategoryIndex, updateItem, removeItem }: SortableRitualItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  const selectedCategoryColor = categories.find(c => c.id === item.category_id)?.color || '#94a3b8';

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-center bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 rounded-xl p-3 relative group">
      <div className="flex flex-col gap-1 mr-1">
        <button
          {...listeners}
          {...attributes}
          className="text-gray-400 hover:text-blue-500 cursor-grab active:cursor-grabbing touch-none p-1 transition-colors"
          title="Przeciągnij, by zmienić kolejność"
        >
          <GripIcon />
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
        <div className="flex gap-2 items-center relative">
          <input
            type="number"
            value={item.duration_minutes}
            onChange={(e) => updateItem(idx, { duration_minutes: parseInt(e.target.value) || 0 })}
            className="w-20 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2 rounded-lg text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-white"
            min="5" step="5"
          />
          <span className="text-sm text-gray-500">min</span>
          
          <div className="flex-1 relative">
            <button
              type="button"
              onClick={() => setOpenCategoryIndex(openCategoryIndex === idx ? null : idx)}
              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 py-2 px-3 rounded-lg text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-white flex items-center justify-between"
            >
              {item.category_id ? (
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedCategoryColor }} />
                  <span className="truncate">{categories.find(c => c.id === item.category_id)?.name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0 bg-slate-400" />
                  <span>Brak kategorii</span>
                </div>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            {openCategoryIndex === idx && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenCategoryIndex(null)} />
                <ul className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-y-auto max-h-48 py-1">
                  <li
                    className="px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2"
                    onClick={() => { updateItem(idx, { category_id: null }); setOpenCategoryIndex(null); }}
                  >
                    <div className="w-3 h-3 rounded-full shrink-0 bg-slate-400" />
                    <span>Brak kategorii</span>
                  </li>
                  {categories.map(c => (
                    <li
                      key={c.id}
                      className="px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2"
                      onClick={() => { updateItem(idx, { category_id: c.id }); setOpenCategoryIndex(null); }}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="truncate">{c.name}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const [icon, setIcon] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [items, setItems] = useState<RitualItem[]>([])
  const [loading, setLoading] = useState(false)
  const [openCategoryIndex, setOpenCategoryIndex] = useState<number | null>(null)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  if (!isOpen) return null

  const handleOpenEdit = (ritual?: Ritual) => {
    if (ritual) {
      setEditingId(ritual.id)
      setName(ritual.name)
      setIcon(ritual.icon || null)
      setColor(ritual.color || null)
      setItems(ritual.items)
    } else {
      setEditingId(null)
      setName('')
      setIcon('document')
      setColor('#3b82f6')
      setItems([
        { id: crypto.randomUUID(), title: 'Nowe zadanie', duration_minutes: 30, category_id: null }
      ])
    }
    setView('edit')
    setOpenCategoryIndex(null)
  }

  const handleSave = async () => {
    if (!name.trim() || items.length === 0) return
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (editingId) {
        await ritualsApi.updateRitual(supabase, editingId, { name: name.trim(), icon, color, items: items as any })
        onRitualUpdated({ id: editingId, name: name.trim(), icon, color, items, user_id: user.id, created_at: new Date().toISOString() })
      } else {
        const payload: RitualInsert = {
          user_id: user.id,
          name: name.trim(),
          icon,
          color,
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((t) => t.id === active.id)
    const newIndex = items.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    setItems(arrayMove(items, oldIndex, newIndex))
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
                  {rituals.map(ritual => {
                    const iconObj = RITUAL_ICONS.find(i => i.id === ritual.icon) || RITUAL_ICONS[0];
                    return (
                      <li key={ritual.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden relative group">
                        {ritual.color && (
                          <div className="absolute right-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: ritual.color }}></div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300" style={{ color: ritual.color || undefined }}>
                            {iconObj.svg}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900 dark:text-slate-200 text-sm">{ritual.name}</span>
                            <span className="text-xs text-gray-500 dark:text-slate-400">{formatTaskCount(ritual.items?.length || 0)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mr-2">
                          <button onClick={() => handleOpenEdit(ritual)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          <button onClick={() => handleDelete(ritual.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </li>
                    );
                  })}
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
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Nazwa Rytuału</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Poranna Rutyna"
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
                />
              </div>
              <div className="relative">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Wygląd</label>
                <button 
                  onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                  className="h-[42px] px-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="text-gray-600 dark:text-slate-300" style={{ color: color || undefined }}>
                    {(RITUAL_ICONS.find(i => i.id === icon) || RITUAL_ICONS[0]).svg}
                  </div>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color || '#3b82f6' }}></div>
                </button>
                
                {isIconPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-[210]" onClick={() => setIsIconPickerOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl rounded-xl p-3 z-[220] w-64">
                      <div className="mb-3">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Ikona</label>
                        <div className="grid grid-cols-4 gap-2">
                          {RITUAL_ICONS.map(i => (
                            <button
                              key={i.id}
                              onClick={() => setIcon(i.id)}
                              className={`p-2 rounded-lg flex items-center justify-center transition-colors ${icon === i.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400'}`}
                            >
                              {i.svg}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Kolor</label>
                        <div className="grid grid-cols-5 gap-2">
                          {RITUAL_COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => setColor(c)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Zadania ({items.length})</label>
              <div className="flex flex-col gap-3">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {items.map((item, idx) => (
                      <SortableRitualItem
                        key={item.id}
                        item={item}
                        idx={idx}
                        categories={categories}
                        openCategoryIndex={openCategoryIndex}
                        setOpenCategoryIndex={setOpenCategoryIndex}
                        updateItem={updateItem}
                        removeItem={removeItem}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
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
