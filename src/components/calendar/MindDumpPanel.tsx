'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { mindDumpApi, type MindDump } from '@/lib/api/mindDump'
import { globalTodosApi } from '@/lib/api/globalTodos'
import { stickyNotesApi } from '@/lib/api/stickyNotes'
import { Tooltip } from '../ui/Tooltip'
import { useDraggable } from '@dnd-kit/core'

type TagId = 'idea' | 'worry' | 'question' | 'todo' | 'note'
const TAGS: { id: TagId, label: string, color: string, bg: string }[] = [
  { id: 'idea', label: '#pomysł', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'worry', label: '#niepokój', color: 'text-red-400', bg: 'bg-red-400/10' },
  { id: 'question', label: '#pytanie', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'todo', label: '#todo', color: 'text-green-400', bg: 'bg-green-400/10' },
  { id: 'note', label: '#notatka', color: 'text-slate-400', bg: 'bg-slate-400/10' },
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
      if (entry.tag === 'todo') {
        await globalTodosApi.createTodo(supabase, user.id, entry.text)
        window.dispatchEvent(new CustomEvent('todo-added'))
      } else {
        const colorMap: Record<string, string> = {
          idea: 'yellow',
          worry: 'pink',
          question: 'blue',
          note: 'purple'
        }
        const color = colorMap[entry.tag] || 'yellow'
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

      <div className="flex gap-1 flex-wrap mb-2 shrink-0">
        {TAGS.map(tag => (
          <button key={tag.id} onClick={() => setSelectedTag(tag.id)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${selectedTag === tag.id ? `${tag.color} ${tag.bg} ring-1 ring-current` : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
            {tag.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
        {entries.map(entry => {
          const tag = TAGS.find(t => t.id === entry.tag)!
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