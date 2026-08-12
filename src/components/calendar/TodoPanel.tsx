'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { globalTodosApi, type GlobalTodo } from '@/lib/api/globalTodos'
import { Tooltip } from '../ui/Tooltip'
import { useDroppable } from '@dnd-kit/core'
import { useTranslation } from '@/lib/i18n/LanguageContext'


interface Props {
  weekStart: string // ISO date string e.g. '2025-05-05'
  weekEnd: string   // ISO date string e.g. '2025-05-11'
}

export default function TodoPanel({ weekStart, weekEnd }: Props) {
  const { t } = useTranslation()
  const [todos, setTodos] = useState<GlobalTodo[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)

  const { setNodeRef, isOver } = useDroppable({
    id: 'droppable-todo',
  })

  const fetchTodos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      try {
        // Build ISO timestamps covering the full local week (Mon 00:00 → Sun 23:59)
        // We do NOT use "Z" suffix – Supabase compares timestamps in UTC, so we let
        // the JS Date handle the timezone conversion by constructing real Date objects.
        const startDate = new Date(`${weekStart}T00:00:00`)
        const endDate = new Date(`${weekEnd}T23:59:59.999`)
        const data = await globalTodosApi.getTodos(
          supabase,
          user.id,
          startDate.toISOString(),
          endDate.toISOString()
        )
        setTodos(data)
      } catch (e) {
        console.error('Błąd pobierania:', e)
      }
    }
    setLoading(false)
  }, [weekStart, weekEnd])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  useEffect(() => {
    const handleTodoAdded = () => fetchTodos()
    window.addEventListener('todo-added', handleTodoAdded)
    return () => window.removeEventListener('todo-added', handleTodoAdded)
  }, [fetchTodos])

  const pending = todos.filter(t => !t.is_completed)
  const isLimitReached = pending.length >= 5

  const addTodo = async () => {
    if (!input.trim() || isLimitReached) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const newTodo = await globalTodosApi.createTodo(supabase, user.id, input.trim(), weekStart)
      setTodos(prev => [newTodo, ...prev])
      setInput('')
    } catch (e) {
      alert("Błąd dodawania")
    }
  }

  const toggleTodo = async (id: string, currentStatus: boolean) => {
    try {
      await globalTodosApi.toggleTodo(supabase, id, !currentStatus)
      setTodos(prev => prev.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t))
    } catch (e) {
      alert("Błąd zmiany statusu")
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      await globalTodosApi.deleteTodo(supabase, id)
      setTodos(prev => prev.filter(t => t.id !== id))
    } catch (e) {
      alert("Błąd usuwania")
    }
  }

  const completed = todos.filter(t => t.is_completed)

  if (loading) return <div className="p-4 text-xs text-gray-400">{t('common.loading')}</div>

  return (
    <div ref={setNodeRef} className="flex flex-col h-full min-h-0 relative">
      {isOver && <div className="absolute -inset-4 z-50 rounded-2xl ring-2 ring-inset ring-blue-500 bg-blue-50/30 dark:bg-blue-900/20 pointer-events-none transition-all" />}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">To-Do</h3>
          <Tooltip content={t('panels.todoTooltip')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </Tooltip>
        </div>
        <div className="flex-1" />
        <span className="text-[10px] text-gray-400 dark:text-slate-600">
          {pending.length > 0 ? `${pending.length} ${t('panels.todoPending')}` : ''}
        </span>
      </div>

      <div className="flex gap-2 mb-3 shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder={isLimitReached ? "Limit (5/5). Zakończ zadanie." : t('panels.todoPlaceholder')}
          disabled={isLimitReached}
          className={`flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none transition-colors ${
            isLimitReached
              ? "bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 cursor-not-allowed opacity-70"
              : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          }`}
        />
        <button
          onClick={addTodo}
          disabled={!input.trim() || isLimitReached}
          className={`px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors shrink-0 ${
            isLimitReached
              ? "bg-gray-300 dark:bg-slate-700 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-slate-700"
          }`}
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
        {todos.length === 0 && (
          <div className="flex-1 flex items-center justify-center opacity-40">
            <p className="text-xs text-gray-500 dark:text-slate-500">{t('panels.todoEmpty')}</p>
          </div>
        )}

        {pending.map(todo => (
          <div key={todo.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 group transition-colors">
            <input
              type="checkbox"
              checked={false}
              onChange={() => toggleTodo(todo.id, todo.is_completed)}
              className="w-3.5 h-3.5 cursor-pointer accent-blue-500 rounded shrink-0"
            />
            <span className="text-xs text-gray-800 dark:text-slate-200 flex-1 min-w-0 truncate">
              {todo.text}
            </span>
            <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}

        {completed.length > 0 && (
          <>
            <div className="h-px w-full bg-gray-200 dark:bg-slate-700/50 my-1" />
            {completed.map(todo => (
              <div key={todo.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg opacity-40 hover:opacity-60 group transition-all">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggleTodo(todo.id, todo.is_completed)}
                  className="w-3.5 h-3.5 cursor-pointer accent-blue-500 rounded shrink-0"
                />
                <span className="text-xs text-gray-500 dark:text-slate-500 flex-1 min-w-0 truncate line-through">
                  {todo.text}
                </span>
                <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}