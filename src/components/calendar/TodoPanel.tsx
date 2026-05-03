'use client'

import { useState } from 'react'

interface TodoItem {
  id: string
  text: string
  completed: boolean
}

export default function TodoPanel() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [input, setInput] = useState('')

  const addTodo = () => {
    if (!input.trim()) return
    setTodos(prev => [
      ...prev,
      { id: crypto.randomUUID(), text: input.trim(), completed: false }
    ])
    setInput('')
  }

  const toggleTodo = (id: string) => {
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    )
  }

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const pending = todos.filter(t => !t.completed)
  const completed = todos.filter(t => t.completed)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header + Input */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h3 className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">To-Do</h3>
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

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
        {todos.length === 0 && (
          <div className="flex-1 flex items-center justify-center opacity-40">
            <p className="text-xs text-gray-500 dark:text-slate-500">Brak zadań. Dodaj pierwsze powyżej.</p>
          </div>
        )}

        {pending.map(todo => (
          <div
            key={todo.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 group transition-colors"
          >
            <input
              type="checkbox"
              checked={false}
              onChange={() => toggleTodo(todo.id)}
              className="w-3.5 h-3.5 cursor-pointer accent-blue-500 rounded shrink-0"
            />
            <span className="text-xs text-gray-800 dark:text-slate-200 flex-1 min-w-0 truncate">
              {todo.text}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}

        {completed.length > 0 && (
          <>
            {pending.length > 0 && (
              <div className="h-px w-full bg-gray-200 dark:bg-slate-700/50 my-1" />
            )}
            {completed.map(todo => (
              <div
                key={todo.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg opacity-40 hover:opacity-60 group transition-all"
              >
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggleTodo(todo.id)}
                  className="w-3.5 h-3.5 cursor-pointer accent-blue-500 rounded shrink-0"
                />
                <span className="text-xs text-gray-500 dark:text-slate-500 flex-1 min-w-0 truncate line-through">
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-0.5"
                >
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
