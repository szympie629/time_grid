'use client'

import { useState } from 'react'

type TagId = 'idea' | 'worry' | 'question' | 'todo' | 'note'

interface Tag {
  id: TagId
  label: string
  color: string
  bg: string
}

const TAGS: Tag[] = [
  { id: 'idea',     label: '#pomysł',    color: 'text-amber-500',  bg: 'bg-amber-500/10' },
  { id: 'worry',    label: '#niepokój',  color: 'text-red-400',    bg: 'bg-red-400/10' },
  { id: 'question', label: '#pytanie',   color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  { id: 'todo',     label: '#todo',      color: 'text-green-400',  bg: 'bg-green-400/10' },
  { id: 'note',     label: '#notatka',   color: 'text-slate-400',  bg: 'bg-slate-400/10' },
]

interface DumpEntry {
  id: string
  text: string
  tag: TagId
  createdAt: Date
}

interface Props {
  onMovedToTodo?: (text: string) => void
}

export default function MindDumpPanel({ onMovedToTodo }: Props) {
  const [entries, setEntries] = useState<DumpEntry[]>([])
  const [input, setInput] = useState('')
  const [selectedTag, setSelectedTag] = useState<TagId>('note')
  const [filterTag, setFilterTag] = useState<TagId | null>(null)

  const addEntry = () => {
    if (!input.trim()) return
    setEntries(prev => [
      { id: crypto.randomUUID(), text: input.trim(), tag: selectedTag, createdAt: new Date() },
      ...prev,
    ])
    setInput('')
  }

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const getTag = (id: TagId) => TAGS.find(t => t.id === id)!

  const filtered = filterTag ? entries.filter(e => e.tag === filterTag) : entries

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h3 className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Mind Dump</h3>
        <div className="flex-1" />
        <span className="text-[10px] text-gray-400 dark:text-slate-600">{entries.length > 0 ? `${entries.length} myśli` : ''}</span>
      </div>

      {/* Input row */}
      <div className="flex gap-1.5 mb-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addEntry()}
          placeholder="Wrzuć myśl..."
          className="flex-1 min-w-0 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
        <button
          onClick={addEntry}
          disabled={!input.trim()}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
        >
          +
        </button>
      </div>

      {/* Tag selector */}
      <div className="flex gap-1 flex-wrap mb-2 shrink-0">
        {TAGS.map(tag => (
          <button
            key={tag.id}
            onClick={() => setSelectedTag(tag.id)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all ${
              selectedTag === tag.id
                ? `${tag.color} ${tag.bg} ring-1 ring-current`
                : 'text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-400'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      {entries.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2 shrink-0 border-t border-gray-100 dark:border-slate-800 pt-2">
          <button
            onClick={() => setFilterTag(null)}
            className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
              filterTag === null
                ? 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-semibold'
                : 'text-gray-400 dark:text-slate-600 hover:text-gray-500'
            }`}
          >
            wszystkie
          </button>
          {TAGS.filter(tag => entries.some(e => e.tag === tag.id)).map(tag => (
            <button
              key={tag.id}
              onClick={() => setFilterTag(tag.id === filterTag ? null : tag.id)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all ${
                filterTag === tag.id
                  ? `${tag.color} ${tag.bg} ring-1 ring-current`
                  : 'text-gray-400 dark:text-slate-600 hover:text-gray-500'
              }`}
            >
              {tag.label} ({entries.filter(e => e.tag === tag.id).length})
            </button>
          ))}
        </div>
      )}

      {/* Entries list */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
        {filtered.length === 0 && (
          <div className="flex-1 flex items-center justify-center opacity-40">
            <p className="text-xs text-gray-500 dark:text-slate-500 text-center">
              {entries.length === 0 ? 'Wrzuć pierwszą myśl powyżej.' : 'Brak myśli z tym tagiem.'}
            </p>
          </div>
        )}

        {filtered.map(entry => {
          const tag = getTag(entry.tag)
          return (
            <div
              key={entry.id}
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 group transition-colors"
            >
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${tag.color} ${tag.bg}`}>
                {tag.label}
              </span>
              <span className="text-xs text-gray-800 dark:text-slate-200 flex-1 min-w-0 leading-relaxed">
                {entry.text}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                {entry.tag === 'todo' && onMovedToTodo && (
                  <button
                    title="Przenieś do To-Do"
                    onClick={() => { onMovedToTodo(entry.text); deleteEntry(entry.id) }}
                    className="text-green-500 hover:text-green-600 transition-colors p-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
