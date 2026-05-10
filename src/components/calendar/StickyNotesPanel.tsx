'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Tooltip } from '../ui/Tooltip'
import { supabase } from '@/lib/supabase/client'
import { stickyNotesApi, type StickyNote } from '@/lib/api/stickyNotes'
import { useDroppable } from '@dnd-kit/core'

const COLORS = [
  { id: 'yellow', class: 'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100', dot: 'bg-amber-300 dark:bg-amber-600' },
  { id: 'pink', class: 'bg-pink-100 dark:bg-pink-900/50 text-pink-900 dark:text-pink-100', dot: 'bg-pink-300 dark:bg-pink-600' },
  { id: 'blue', class: 'bg-sky-100 dark:bg-sky-900/50 text-sky-900 dark:text-sky-100', dot: 'bg-sky-300 dark:bg-sky-600' },
  { id: 'green', class: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100', dot: 'bg-emerald-300 dark:bg-emerald-600' },
  { id: 'purple', class: 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100', dot: 'bg-purple-300 dark:bg-purple-600' },
]

export default function StickyNotesPanel() {
  const { setNodeRef, isOver } = useDroppable({ id: 'droppable-stickynotes' })

  const [notes, setNotes] = useState<StickyNote[]>([])
  const [input, setInput] = useState('')
  const [selectedColor, setSelectedColor] = useState('yellow')
  const [loading, setLoading] = useState(true)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const fetchNotes = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      try {
        const data = await stickyNotesApi.getNotes(supabase, user.id)
        setNotes(data)
      } catch (e) {
        console.error('Błąd pobierania notatek:', e)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  useEffect(() => {
    const handleStickyNoteAdded = () => fetchNotes()
    window.addEventListener('sticky-note-added', handleStickyNoteAdded)
    return () => window.removeEventListener('sticky-note-added', handleStickyNoteAdded)
  }, [fetchNotes])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.setSelectionRange(editInputRef.current.value.length, editInputRef.current.value.length)
    }
  }, [editingId])

  const addNote = async () => {
    if (!input.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const newNote = await stickyNotesApi.createNote(supabase, user.id, input.trim(), selectedColor)
      setNotes(prev => [newNote, ...prev])
      setInput('')
    } catch (e) {
      alert("Błąd dodawania notatki")
    }
  }

  const deleteNote = async (id: string) => {
    try {
      await stickyNotesApi.deleteNote(supabase, id)
      setNotes(prev => prev.filter(n => n.id !== id))
    } catch (e) {
      alert("Błąd usuwania")
    }
  }

  const saveEdit = async (id: string) => {
    if (!editContent.trim()) {
      deleteNote(id)
      setEditingId(null)
      return
    }
    
    try {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, content: editContent.trim() } : n))
      await stickyNotesApi.updateNote(supabase, id, { content: editContent.trim() })
    } catch (e) {
      alert("Błąd zapisywania edycji")
      fetchNotes() // revert on error
    }
    setEditingId(null)
  }

  const changeNoteColor = async (id: string, color: string) => {
    try {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, color } : n))
      await stickyNotesApi.updateNote(supabase, id, { color })
    } catch (e) {
      alert("Błąd zmiany koloru")
      fetchNotes()
    }
  }

  return (
    <div ref={setNodeRef} className="flex flex-col h-full min-h-0 relative">
      {isOver && <div className="absolute -inset-4 z-50 rounded-2xl ring-2 ring-inset ring-amber-500 bg-amber-50/30 dark:bg-amber-900/20 pointer-events-none transition-all" />}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h3 className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Sticky Notes</h3>
        <Tooltip position="bottom" content="Ważne myśli, cele lub informacje na cały tydzień, które chcesz mieć przed oczami.">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-2 mb-4 shrink-0 bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/50">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              addNote()
            }
          }}
          placeholder="Nowa notatka..."
          className="w-full bg-transparent resize-none text-xs text-gray-800 dark:text-slate-200 placeholder-gray-400 focus:outline-none min-h-[40px]"
          rows={2}
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedColor(c.id)}
                className={`w-4 h-4 rounded-full ${c.dot} transition-transform ${selectedColor === c.id ? 'scale-125 ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 ring-indigo-500' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                title="Wybierz kolor"
              />
            ))}
          </div>
          <button
            onClick={addNote}
            disabled={!input.trim()}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white text-[10px] font-bold rounded-lg transition-colors uppercase tracking-wider"
          >
            Dodaj
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-wrap content-start items-start gap-3">
        {loading ? (
          <div className="w-full flex items-center justify-center h-full opacity-40">
            <p className="text-xs text-gray-500">Ładowanie...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="w-full flex-1 flex flex-col items-center justify-center opacity-40 min-h-[150px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-gray-400 dark:text-slate-600">
              <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
              <polyline points="15 3 15 9 21 9" />
            </svg>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-500">Brak notatek</p>
          </div>
        ) : (
          notes.map(note => {
            const colorObj = COLORS.find(c => c.id === note.color) || COLORS[0]
            
            return (
              <div 
                key={note.id} 
                className={`relative p-3 rounded-xl shadow-sm hover:shadow-md transition-all group flex flex-col w-36 min-h-36 shrink-0 ${colorObj.class}`}
              >
                {editingId === note.id ? (
                  <textarea
                    ref={editInputRef}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    onBlur={() => saveEdit(note.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        editInputRef.current?.blur()
                      }
                      if (e.key === 'Escape') {
                        setEditingId(null)
                      }
                    }}
                    className="flex-1 w-full bg-transparent resize-none focus:outline-none text-xs leading-relaxed"
                  />
                ) : (
                  <div 
                    onClick={() => {
                      setEditContent(note.content)
                      setEditingId(note.id)
                    }}
                    className="flex-1 text-xs leading-relaxed whitespace-pre-wrap cursor-text break-words"
                  >
                    {note.content}
                  </div>
                )}
                
                {/* Przyciski akcji widoczne po najechaniu myszką */}
                {!editingId && (
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => deleteNote(note.id)}
                      className="p-1 bg-white/50 hover:bg-white dark:bg-black/20 dark:hover:bg-black/40 rounded-md text-red-500 transition-colors"
                      title="Usuń"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    
                    <div className="relative group/color">
                      <button className="p-1 bg-white/50 hover:bg-white dark:bg-black/20 dark:hover:bg-black/40 rounded-md transition-colors" title="Zmień kolor">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                      </button>
                      <div className="absolute right-full top-1/2 -translate-y-1/2 pr-1 hidden group-hover/color:block z-10">
                        <div className="flex bg-white dark:bg-slate-800 shadow-lg rounded-lg p-1.5 gap-1.5">
                          {COLORS.map(c => (
                            <button
                              key={c.id}
                              onClick={() => changeNoteColor(note.id, c.id)}
                              className={`w-3.5 h-3.5 rounded-full ${c.dot} hover:scale-110 transition-transform ${note.color === c.id ? 'ring-1 ring-offset-1 ring-indigo-500' : ''}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}