'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Tooltip } from '../ui/Tooltip'
import { supabase } from '@/lib/supabase/client'
import { stickyNotesApi, type StickyNote } from '@/lib/api/stickyNotes'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useTranslation } from '@/lib/i18n/LanguageContext'

const COLORS = [
  { id: 'yellow', class: 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100', dot: 'bg-amber-300 dark:bg-amber-600' },
  { id: 'pink', class: 'bg-pink-100 dark:bg-pink-900 text-pink-900 dark:text-pink-100', dot: 'bg-pink-300 dark:bg-pink-600' },
  { id: 'blue', class: 'bg-sky-100 dark:bg-sky-900 text-sky-900 dark:text-sky-100', dot: 'bg-sky-300 dark:bg-sky-600' },
  { id: 'green', class: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100', dot: 'bg-emerald-300 dark:bg-emerald-600' },
  { id: 'purple', class: 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100', dot: 'bg-purple-300 dark:bg-purple-600' },
]

const DraggableStickyNote = ({ note, COLORS, deleteNote, changeNoteColor, saveEdit, t, editingId, setEditingId, editContent, setEditContent, bringToFront, zIndex }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `stickynote-${note.id}`,
    data: { type: 'stickynote', item: note }
  })
  const colorObj = COLORS.find((c: any) => c.id === note.color) || COLORS[0]
  const editInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editingId === note.id && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.setSelectionRange(editInputRef.current.value.length, editInputRef.current.value.length)
    }
  }, [editingId, note.id])

  const style = {
    position: 'absolute' as const,
    left: note.position_x || 0,
    top: note.position_y || 0,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 99999 : (zIndex || 10),
    boxShadow: isDragging
      ? '0 20px 40px -8px rgba(0,0,0,0.30), 0 8px 16px -4px rgba(0,0,0,0.20), 0 0 0 2px rgba(99,102,241,0.4)'
      : '0 2px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)',
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-xl group flex flex-col w-36 shrink-0 ${colorObj.class} ${isDragging
        ? 'scale-105 cursor-grabbing ring-2 ring-inset ring-indigo-400'
        : 'transition-all duration-200 cursor-grab hover:-translate-y-0.5'
      }`}
      onClick={(e) => {
        if (!editingId) {
          e.stopPropagation()
          setEditContent(note.content)
          setEditingId(note.id)
        }
      }}
      {...(!editingId ? { 
        ...attributes, 
        ...listeners,
        onPointerDown: (e: any) => {
          bringToFront(note.id);
          if (listeners?.onPointerDown) {
            listeners.onPointerDown(e);
          }
        }
      } : {})}
    >
      <div className={`flex-1 grid min-w-0 w-full ${editingId === note.id ? 'cursor-text' : 'pointer-events-none'}`}>
        <div className={`col-start-1 row-start-1 text-xs leading-relaxed whitespace-pre-wrap break-words min-w-0 w-full pointer-events-none ${editingId === note.id ? 'invisible' : ''}`}>
          {(editingId === note.id ? editContent : note.content) + '\u200b'}
        </div>
        {editingId === note.id && (
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
            rows={1}
            className="col-start-1 row-start-1 w-full h-full bg-transparent resize-none focus:outline-none text-xs leading-relaxed p-0 m-0 border-none overflow-hidden whitespace-pre-wrap break-words min-w-0"
          />
        )}
      </div>
      
      {!editingId && (
        <div className="absolute -top-8 right-0 flex flex-row items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white dark:bg-slate-800 shadow-md rounded-md p-0.5 border border-gray-100 dark:border-slate-700 z-50">
          <div className="relative group/color">
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-sm text-gray-500 dark:text-slate-400 transition-colors cursor-pointer" title={t('panels.stickyChangeColor')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            </button>
            <div className="absolute top-full right-0 pt-1.5 hidden group-hover/color:block z-50">
              <div className="flex bg-white dark:bg-slate-800 shadow-lg rounded-md p-1 gap-1 border border-gray-100 dark:border-slate-700 cursor-default" onClick={e => e.stopPropagation()}>
                {COLORS.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={(e) => { e.stopPropagation(); changeNoteColor(note.id, c.id); }}
                    className={`w-3 h-3 rounded-full ${c.dot} hover:scale-110 transition-transform ${note.color === c.id ? 'ring-1 ring-offset-1 dark:ring-offset-slate-800 ring-indigo-500' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="w-px h-3 bg-gray-200 dark:bg-slate-700 mx-0.5"></div>

          <button 
            onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm text-red-500 transition-colors cursor-pointer"
            title={t('panels.stickyDelete')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default function StickyNotesPanel() {
  const { setNodeRef, isOver } = useDroppable({ id: 'droppable-stickynotes' })
  const { t } = useTranslation()

  const [notes, setNotes] = useState<StickyNote[]>([])
  const [input, setInput] = useState('')
  const [selectedColor, setSelectedColor] = useState('yellow')
  const [loading, setLoading] = useState(true)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const [zIndexes, setZIndexes] = useState<Record<string, number>>({})
  const maxZRef = useRef(10)

  const bringToFront = useCallback((id: string) => {
    maxZRef.current += 1
    const nextZ = maxZRef.current
    setZIndexes(prev => ({ ...prev, [id]: nextZ }))
  }, [])

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
    const handleStickyNoteMoved = (e: any) => {
      const { id, position_x, position_y } = e.detail
      // Use requestAnimationFrame to let dnd-kit fully reset its transform
      // before we update position_x/y — otherwise both run simultaneously
      // which causes the visible "bounce" jitter after dropping.
      requestAnimationFrame(() => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, position_x, position_y } : n))
      })
    }
    window.addEventListener('sticky-note-added', handleStickyNoteAdded)
    window.addEventListener('sticky-note-moved', handleStickyNoteMoved)
    return () => {
      window.removeEventListener('sticky-note-added', handleStickyNoteAdded)
      window.removeEventListener('sticky-note-moved', handleStickyNoteMoved)
    }
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
      const x = Math.floor(Math.random() * 200) + 20;
      const y = Math.floor(Math.random() * 200) + 20;
      const newNote = await stickyNotesApi.createNote(supabase, user.id, input.trim(), selectedColor, x, y)
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
    <div ref={setNodeRef} className="flex flex-col h-full min-h-0 relative overflow-hidden">
      {isOver && <div className="absolute -inset-4 z-50 rounded-2xl ring-2 ring-inset ring-amber-500 bg-amber-50/30 dark:bg-amber-900/20 pointer-events-none transition-all" />}
      {/* Fixed-width inner container — like the desk canvas, clips rather than wraps when panel narrows */}
      <div className="w-[220px] flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h3 className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Sticky Notes</h3>
        <Tooltip position="bottom" content={t('panels.stickyTooltip')}>
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
          placeholder={t('panels.stickyPlaceholder')}
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
            className="px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-slate-700"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar relative" id="sticky-scroll-container">
        <div 
          className="w-[2000px] h-[2000px] relative bg-slate-50/50 dark:bg-slate-900/20"
        >
        {loading ? (
          <div className="w-full flex items-center justify-center h-full opacity-40">
            <p className="text-xs text-gray-500">{t('common.loading')}</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-gray-400 dark:text-slate-600">
              <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
              <polyline points="15 3 15 9 21 9" />
            </svg>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-500">{t('panels.stickyEmpty')}</p>
          </div>
        ) : (
          notes.map(note => (
            <DraggableStickyNote
              key={note.id}
              note={note}
              COLORS={COLORS}
              deleteNote={deleteNote}
              changeNoteColor={changeNoteColor}
              saveEdit={saveEdit}
              t={t}
              editingId={editingId}
              setEditingId={setEditingId}
              editContent={editContent}
              setEditContent={setEditContent}
              bringToFront={bringToFront}
              zIndex={zIndexes[note.id]}
            />
          ))
        )}
        </div>
      </div>
      </div>
    </div>
  )
}