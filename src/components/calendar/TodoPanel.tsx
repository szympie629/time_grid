'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { globalTodosApi, type GlobalTodo } from '@/lib/api/globalTodos'

export default function TodoPanel() {
  const [todos, setTodos] = useState<GlobalTodo[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchTodos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      try {
        const data = await globalTodosApi.getTodos(supabase, user.id)
        setTodos(data)
      } catch (e) {
        console.error('Błąd pobierania:', e)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const addTodo = async () => {
    if (!input.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const newTodo = await globalTodosApi.createTodo(supabase, user.id, input.trim())
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

  const pending = todos.filter(t => !t.is_completed)
  const completed = todos.filter(t => t.is_completed)

  if (loading) return <div className="p-4 text-xs text-gray-400">Ładowanie...</div>

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">To-Do</h3>
          <div className="group relative flex items-center z-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] rounded shadow-xl z-50 font-normal normal-case tracking-normal">
              Szybkie zadania i drobne obowiązki. Lista rzeczy do zrobienia w tzw. międzyczasie, które nie wymagają rezerwacji bloku w kalendarzu.
              <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <span className="text-[10px] text-gray-400 dark:text-slate-600">
          {pending.length > 0 ? `${pending.length} do zrobienia` : ''}
        </span>
      </div>

      <div className="flex gap-2 mb-3 shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="Dodaj zadanie..."
          className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        />
        <button
          onClick={addTodo}
          disabled={!input.trim()}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
        {todos.length === 0 && (
          <div className="flex-1 flex items-center justify-center opacity-40">
            <p className="text-xs text-gray-500 dark:text-slate-500">Brak zadań.</p>
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