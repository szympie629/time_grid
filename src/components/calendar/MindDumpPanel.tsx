'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { mindDumpApi, type MindDump } from '@/lib/api/mindDump'
import { globalTodosApi } from '@/lib/api/globalTodos'
import { stickyNotesApi } from '@/lib/api/stickyNotes'
import { Tooltip } from '../ui/Tooltip'
import { useDraggable } from '@dnd-kit/core'

type TagId = 'idea' | 'worry' | 'question' | 'todo' | 'note' | string

export interface MindDumpTag {
  id: string
  label: string
  color: string
  bg: string
  destination?: 'todo' | 'sticky'
  stickyColor?: string
}

const DEFAULT_TAGS: MindDumpTag[] = [
  { id: 'idea', label: '#pomysł', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'worry', label: '#niepokój', color: 'text-red-400', bg: 'bg-red-400/10' },
  { id: 'question', label: '#pytanie', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'todo', label: '#todo', color: 'text-green-400', bg: 'bg-green-400/10', destination: 'todo' },
  { id: 'note', label: '#notatka', color: 'text-slate-400', bg: 'bg-slate-400/10' },
]

const TAG_COLORS = [
  { name: 'amber', color: 'text-amber-500', bg: 'bg-amber-500/10', sticky: 'yellow' },
  { name: 'red', color: 'text-red-400', bg: 'bg-red-400/10', sticky: 'pink' },
  { name: 'blue', color: 'text-blue-400', bg: 'bg-blue-400/10', sticky: 'blue' },
  { name: 'green', color: 'text-green-400', bg: 'bg-green-400/10', sticky: 'green' },
  { name: 'slate', color: 'text-slate-400', bg: 'bg-slate-400/10', sticky: 'purple' },
  { name: 'purple', color: 'text-purple-400', bg: 'bg-purple-400/10', sticky: 'purple' },
  { name: 'pink', color: 'text-pink-400', bg: 'bg-pink-400/10', sticky: 'pink' },
]

function DraggableMindDumpItem({ entry, tag, onMove, onDelete }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `minddump-${entry.id}`,
    data: { type: 'minddump', item: entry },
  })

  return (
    <div 
      ref={setNodeRef} 

      className={`flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 group ${isDragging ? 'opacity-50 z-50 bg-white dark:bg-slate-800 shadow-md ring-1 ring-gray-200 dark:ring-slate-700' : ''}`}
    >
      <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-500 shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </div>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${tag.color} ${tag.bg}`}>{tag.label}</span>
      <span className="text-xs text-gray-800 dark:text-slate-200 flex-1 leading-relaxed break-words">{entry.text}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
        <button onClick={() => onMove(entry)} title="Przenieś" className="text-green-500 p-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
        </button>
        <button onClick={() => onDelete(entry.id)} className="text-gray-400 hover:text-red-500 p-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
    </div>
  )
}

export default function MindDumpPanel() {
  const [entries, setEntries] = useState<MindDump[]>([])
  const [input, setInput] = useState('')
  const [selectedTag, setSelectedTag] = useState<TagId>('idea')
  const [loading, setLoading] = useState(true)
  
  const [customTags, setCustomTags] = useState<MindDumpTag[]>([])
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [newTagDestination, setNewTagDestination] = useState<'todo' | 'sticky'>('sticky')

  const allTags = [...DEFAULT_TAGS, ...customTags]

  useEffect(() => {
    const savedTags = localStorage.getItem('mindDumpCustomTags')
    if (savedTags) {
      try {
        setCustomTags(JSON.parse(savedTags))
      } catch (e) {
        console.error('Failed to parse custom tags', e)
      }
    }
  }, [])

  const saveCustomTag = () => {
    if (!newTagName.trim()) return
    const newTag: MindDumpTag = {
      id: `custom-${Date.now()}`,
      label: `#${newTagName.trim()}`,
      color: newTagColor.color,
      bg: newTagColor.bg,
      destination: newTagDestination,
      stickyColor: newTagColor.sticky
    }
    const updatedTags = [...customTags, newTag]
    setCustomTags(updatedTags)
    localStorage.setItem('mindDumpCustomTags', JSON.stringify(updatedTags))
    setSelectedTag(newTag.id)
    setIsTagModalOpen(false)
    setNewTagName('')
  }

  const fetchEntries = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      try {
        const data = await mindDumpApi.getEntries(supabase, user.id)
        setEntries(data)
      } catch (e) {
        console.error('Błąd pobierania:', e)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    const handleMindDumpDeleted = (e: Event) => {
      const customEvent = e as CustomEvent
      setEntries(prev => prev.filter(entry => entry.id !== customEvent.detail.id))
    }
    window.addEventListener('minddump-deleted', handleMindDumpDeleted)
    return () => window.removeEventListener('minddump-deleted', handleMindDumpDeleted)
  }, [])

  const addEntry = async () => {
    if (!input.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const next = await mindDumpApi.createEntry(supabase, user.id, input.trim(), selectedTag)
    setEntries(prev => [next, ...prev])
    setInput('')
  }

  const handleMove = async (entry: MindDump) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try {
      const tagInfo = allTags.find(t => t.id === entry.tag)
      const destination = tagInfo?.destination || (entry.tag === 'todo' ? 'todo' : 'sticky')

      if (destination === 'todo') {
        await globalTodosApi.createTodo(supabase, user.id, entry.text)
        window.dispatchEvent(new CustomEvent('todo-added'))
      } else {
        const colorMap: Record<string, string> = {
          idea: 'yellow',
          worry: 'pink',
          question: 'blue',
          note: 'purple'
        }
        const color = tagInfo?.stickyColor || colorMap[entry.tag] || 'yellow'
        await stickyNotesApi.createNote(supabase, user.id, `[${entry.tag}] ${entry.text}`, color)
        window.dispatchEvent(new CustomEvent('sticky-note-added'))
      }
      await mindDumpApi.deleteEntry(supabase, entry.id)
      setEntries(prev => prev.filter(e => e.id !== entry.id))
    } catch (e) { alert("Błąd przenoszenia") }
  }

  if (loading) return <div className="p-4 text-xs text-gray-400">Ładowanie...</div>

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mind Dump</h3>
        <Tooltip content="Bufor na luźne myśli i pomysły. Wrzucaj tu wszystko, co odrywa Cię od pracy, a wieczorem zadecyduj, co z tym zrobić.">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </Tooltip>
      </div>

      <div className="flex gap-1.5 mb-2 shrink-0">
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addEntry()}
          placeholder="Wrzuć myśl..."
          className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
        />
        <button onClick={addEntry} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors">+</button>
      </div>

      <div className="flex gap-1 flex-wrap mb-2 shrink-0 items-center relative">
        {allTags.map(tag => (
          <button key={tag.id} onClick={() => setSelectedTag(tag.id)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${selectedTag === tag.id ? `${tag.color} ${tag.bg} ring-1 ring-current` : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
            {tag.label}
          </button>
        ))}
        <button 
          onClick={() => setIsTagModalOpen(true)}
          title="Dodaj nowy tag"
          className="p-1 rounded-full text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors ml-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>

        {isTagModalOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setIsTagModalOpen(false)}></div>
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 p-3 z-[70] flex flex-col gap-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-200">Nowy tag</span>
                <button onClick={() => setIsTagModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Nazwa</label>
                <div className="flex items-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <span className="pl-2 pr-1 py-1.5 text-xs text-gray-400 font-bold bg-gray-100 dark:bg-slate-800">#</span>
                  <input 
                    type="text" 
                    value={newTagName} 
                    onChange={e => setNewTagName(e.target.value)}
                    placeholder="nazwa_tagu"
                    className="flex-1 bg-transparent px-2 py-1.5 text-xs text-gray-800 dark:text-slate-200 focus:outline-none"
                    onKeyDown={e => e.key === 'Enter' && saveCustomTag()}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Kolor</label>
                <div className="flex gap-1.5 flex-wrap">
                  {TAG_COLORS.map(colorOption => (
                    <button 
                      key={colorOption.name}
                      onClick={() => setNewTagColor(colorOption)}
                      className={`w-5 h-5 rounded-full ${colorOption.bg} ${newTagColor.name === colorOption.name ? 'ring-2 ring-offset-1 ring-current ' + colorOption.color : ''} border border-transparent hover:border-gray-300 dark:hover:border-slate-600 transition-all`}
                      title={colorOption.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Gdzie przenieść po użyciu</label>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="destination" 
                      checked={newTagDestination === 'sticky'} 
                      onChange={() => setNewTagDestination('sticky')}
                      className="text-indigo-500 focus:ring-indigo-500"
                    />
                    Notatki
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="destination" 
                      checked={newTagDestination === 'todo'} 
                      onChange={() => setNewTagDestination('todo')}
                      className="text-indigo-500 focus:ring-indigo-500"
                    />
                    Todo
                  </label>
                </div>
              </div>

              <button 
                onClick={saveCustomTag}
                disabled={!newTagName.trim()}
                className="w-full py-1.5 mt-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Dodaj tag
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
        {entries.map(entry => {
          const tag = allTags.find(t => t.id === entry.tag) || DEFAULT_TAGS[0]
          return (
            <DraggableMindDumpItem
              key={entry.id}
              entry={entry}
              tag={tag}
              onMove={handleMove}
              onDelete={async (id: string) => {
                await mindDumpApi.deleteEntry(supabase, id)
                setEntries(prev => prev.filter(e => e.id !== id))
              }}
            />
          )
        })}
      </div>
    </div>
  )
}