'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { mindDumpApi, type MindDump } from '@/lib/api/mindDump'
import { globalTodosApi } from '@/lib/api/globalTodos'
import { stickyNotesApi } from '@/lib/api/stickyNotes'

type TagId = 'idea' | 'worry' | 'question' | 'todo' | 'note'
const TAGS: { id: TagId, label: string, color: string, bg: string }[] = [
  { id: 'idea', label: '#pomysł', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'worry', label: '#niepokój', color: 'text-red-400', bg: 'bg-red-400/10' },
  { id: 'question', label: '#pytanie', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'todo', label: '#todo', color: 'text-green-400', bg: 'bg-green-400/10' },
  { id: 'note', label: '#notatka', color: 'text-slate-400', bg: 'bg-slate-400/10' },
]

export default function MindDumpPanel() {
  const [entries, setEntries] = useState<MindDump[]>([])
  const [input, setInput] = useState('')
  const [selectedTag, setSelectedTag] = useState<TagId>('note')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setEntries(await mindDumpApi.getEntries(supabase, user.id))
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

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
      } else {
        await stickyNotesApi.createNote(supabase, user.id, `[${entry.tag}] ${entry.text}`)
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
      </div>

      <div className="flex gap-1.5 mb-2 shrink-0">
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addEntry()}
          placeholder="Wrzuć myśl..."
          className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
        />
        <button onClick={addEntry} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg">+</button>
      </div>

      <div className="flex gap-1 flex-wrap mb-2 shrink-0">
        {TAGS.map(tag => (
          <button key={tag.id} onClick={() => setSelectedTag(tag.id)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${selectedTag === tag.id ? `${tag.color} ${tag.bg} ring-1 ring-current` : 'text-gray-400'}`}>
            {tag.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
        {entries.map(entry => {
          const tag = TAGS.find(t => t.id === entry.tag)!
          return (
            <div key={entry.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 group">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${tag.color} ${tag.bg}`}>{tag.label}</span>
              <span className="text-xs text-gray-800 dark:text-slate-200 flex-1 leading-relaxed">{entry.text}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <button onClick={() => handleMove(entry)} title="Przenieś" className="text-green-500 p-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                </button>
                <button onClick={() => { mindDumpApi.deleteEntry(supabase, entry.id); setEntries(prev => prev.filter(e => e.id !== entry.id)) }} className="text-gray-400 hover:text-red-500 p-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}