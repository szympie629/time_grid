import { useState, useRef, useEffect } from 'react'
import { Block } from '@/lib/api/blocks'
import { tasksApi, Task } from '@/lib/api/tasks'
import { supabase } from '@/lib/supabase/client'

interface Props {
  block: Block
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Block>) => void
  onDelete: (id: string) => void
  onCopy?: (block: Block) => void
}

export default function BlockModal({ block, onClose, onUpdate, onDelete, onCopy }: Props) {
  const isBacklogItem = block.start_time === null
  const defaultDate = new Date().toISOString().split('T')[0]
  const safeStart = block.start_time || `${defaultDate}T09:00:00`
  const safeEnd = block.end_time || `${defaultDate}T10:00:00`

  // Wyliczanie początkowego czasu trwania
  const getInitialDuration = () => {
    if (block.start_time && block.end_time) {
      const s = new Date(block.start_time).getTime()
      const e = new Date(block.end_time).getTime()
      return Math.round((e - s) / 60000)
    }
    return block.duration_minutes || 60
  }

  // --- Stany formularza głównego ---
  const [title, setTitle] = useState(block.title)
  const [description, setDescription] = useState(block.description || '')
  const [activeTab, setActiveTab] = useState('main')
  const [date, setDate] = useState(safeStart.split('T')[0])
  const [startTime, setStartTime] = useState(safeStart.split('T')[1].substring(0, 5))
  const [endTime, setEndTime] = useState(safeEnd.split('T')[1].substring(0, 5))
  const [colorTag, setColorTag] = useState(block.color_tag || '#3b82f6')
  const [isCompleted, setIsCompleted] = useState(block.is_completed ?? false)
  
  const [durationMins, setDurationMins] = useState(getInitialDuration())
  const [hours, setHours] = useState(Math.floor(durationMins / 60))
  const [minutes, setMinutes] = useState(durationMins % 60)

  // --- Stany dla To-Do ---
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loadingTasks, setLoadingTasks] = useState(false)

  // --- Logika przesuwania okna ---
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null)
  const notifyTasksChanged = () => window.dispatchEvent(new CustomEvent(`tasks-updated-${block.id}`))

  const fetchTasks = async () => {
    if (block.id === 'draft' || block.id === 'draft-backlog') {
      setLoadingTasks(false)
      return
    }
    setLoadingTasks(true)
    try {
      const data = await tasksApi.getTasks(supabase, block.id)
      setTasks(data)
    } catch (error) {
      console.error("Błąd pobierania zadań:", error)
    } finally {
      setLoadingTasks(false)
    }
  }

  useEffect(() => {
    setPosition({ x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 250 })
    setIsMounted(true)
    fetchTasks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (tasks.length > 0) {
      const allDone = tasks.every(t => t.is_completed)
      setIsCompleted(allDone)
    }
  }, [tasks])

  const handleDurationChange = (newDuration: number) => {
    setDurationMins(newDuration)
    setHours(Math.floor(newDuration / 60))
    setMinutes(newDuration % 60)

    if (!isBacklogItem && startTime) {
      const [h, m] = startTime.split(':').map(Number)
      const totalMins = h * 60 + m + newDuration
      const newH = Math.floor(totalMins / 60) % 24
      const newM = totalMins % 60
      setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`)
    }
  }

  const handleTimeChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
       setStartTime(value)
       const [h, m] = value.split(':').map(Number)
       const totalMins = h * 60 + m + durationMins
       const newH = Math.floor(totalMins / 60) % 24
       const newM = totalMins % 60
       setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`)
    } else {
       setEndTime(value)
       const [sh, sm] = startTime.split(':').map(Number)
       const [eh, em] = value.split(':').map(Number)
       let diff = (eh * 60 + em) - (sh * 60 + sm)
       if (diff < 0) diff += 24 * 60
       setDurationMins(diff)
       setHours(Math.floor(diff / 60))
       setMinutes(diff % 60)
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    try {
      const newTask = await tasksApi.createTask(supabase, block.id, newTaskTitle)
      setTasks(prev => [...prev, newTask])
      setNewTaskTitle('')
      notifyTasksChanged()
    } catch (error) {
      alert("Błąd dodawania zadania")
    }
  }

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      const updated = await tasksApi.toggleTask(supabase, taskId, !currentStatus)
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t))
      notifyTasksChanged()
    } catch (error) {
      alert("Błąd zmiany statusu")
    }
  }

  const handleDeleteSubTask = async (taskId: string) => {
    try {
      await tasksApi.deleteTask(supabase, taskId)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      notifyTasksChanged()
    } catch (error) {
      alert("Błąd usuwania zadania")
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, initX: position.x, initY: position.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPosition({ x: dragRef.current.initX + dx, y: Math.max(0, dragRef.current.initY + dy) })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      dragRef.current = null
    }
  }

  const handleSave = () => {
    const updates: Partial<Block> = {
      title,
      description,
      color_tag: colorTag,
      is_completed: isCompleted,
      duration_minutes: durationMins
    }

    if (!isBacklogItem) {
      updates.start_time = `${date}T${startTime}:00`
      updates.end_time = `${date}T${endTime}:00`
    } else {
      updates.start_time = null
      updates.end_time = null
    }

    onUpdate(block.id, updates)
    onClose()
  }

  const handleCopy = () => {
    if (onCopy) {
      const copyData: Partial<Block> = {
        ...block,
        title,
        description,
        color_tag: colorTag,
        duration_minutes: durationMins
      }

      if (!isBacklogItem) {
        copyData.start_time = `${date}T${startTime}:00`
        copyData.end_time = `${date}T${endTime}:00`
      } else {
        copyData.start_time = null
        copyData.end_time = null
      }

      onCopy(copyData as Block)
      onClose()
    }
  }

  if (!isMounted) return null

  return (
    <div 
      className="fixed z-[100] bg-white p-6 rounded-lg w-[400px] shadow-2xl flex flex-col gap-4 text-black border border-gray-200"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div 
        className="flex justify-between items-center border-b pb-2 cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold select-none">{block.id.startsWith('draft') ? 'Nowy blok' : 'Edytuj blok'}</h2>
          <label 
            className="flex items-center gap-2 cursor-pointer"
            onPointerDown={(e) => e.stopPropagation()} 
          >
            <input 
              type="checkbox" 
              checked={isCompleted} 
              onChange={(e) => setIsCompleted(e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-green-600"
            />
            <span className="text-sm text-gray-500 font-semibold select-none">Wykonano</span>
          </label>
        </div>
        
        <button 
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={onClose} 
          className="text-gray-400 hover:text-red-500 font-bold px-2 py-1 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex border-b border-gray-100 mb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'main', label: 'Główne' },
          { id: 'todo', label: 'To-Do' },
          { id: 'notes', label: 'Notatki' },
          { id: 'focus', label: 'Skupienie' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'main' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Tytuł</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="border border-gray-200 p-2 rounded text-sm outline-none focus:border-blue-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
               <label className="text-[10px] uppercase font-bold text-gray-400">Czas trwania</label>
               <div className="flex gap-2">
                 <div className="flex border border-gray-200 rounded overflow-hidden">
                    <input type="number" min="0" value={hours} onChange={e => handleDurationChange(Number(e.target.value) * 60 + minutes)} className="w-12 p-2 text-sm text-center outline-none bg-white" />
                    <span className="flex items-center text-xs text-gray-500 bg-gray-50 px-2 border-l border-gray-200">h</span>
                 </div>
                 <div className="flex border border-gray-200 rounded overflow-hidden">
                    <input type="number" min="0" max="59" value={minutes} onChange={e => handleDurationChange(hours * 60 + Number(e.target.value))} className="w-12 p-2 text-sm text-center outline-none bg-white" />
                    <span className="flex items-center text-xs text-gray-500 bg-gray-50 px-2 border-l border-gray-200">m</span>
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-1 mt-1">
                 {[15, 30, 45, 60, 90, 120].map(mins => (
                   <button type="button" key={mins} onClick={() => handleDurationChange(mins)} className={`text-[10px] py-1 rounded border transition-colors ${durationMins === mins ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                     {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                   </button>
                 ))}
               </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Kolor</label>
              <div className="flex gap-2 items-center h-10">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(c => (
                  <button key={c} onClick={() => setColorTag(c)} className={`w-6 h-6 rounded-full border-2 ${colorTag === c ? 'border-black' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
              {!isBacklogItem && (
                 <div className="flex flex-col gap-1 mt-2">
                   <label className="text-[10px] uppercase font-bold text-gray-400">Data</label>
                   <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-200 p-2 rounded text-sm outline-none focus:border-blue-500" />
                 </div>
              )}
            </div>
          </div>

          {!isBacklogItem && (
            <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Start</label>
                  <input type="time" value={startTime} onChange={e => handleTimeChange('start', e.target.value)} className="border border-gray-200 p-2 rounded text-sm outline-none focus:border-blue-500" />
               </div>
               <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Koniec</label>
                  <input type="time" value={endTime} onChange={e => handleTimeChange('end', e.target.value)} className="border border-gray-200 p-2 rounded text-sm outline-none focus:border-blue-500" />
               </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Opis</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="border border-gray-200 p-2 rounded h-20 resize-none text-sm outline-none focus:border-blue-500" />
          </div>
        </div>
      )}

      {activeTab === 'todo' && (
        <div className="flex flex-col gap-4 h-[310px]">
          {block.id.startsWith('draft') ? (
            <div className="flex-1 flex items-center justify-center text-center text-gray-500 text-sm italic">
              Najpierw zapisz blok, aby móc dodawać do niego zadania To-Do.
            </div>
          ) : (
            <>
              <form onSubmit={handleAddTask} className="flex gap-2">
                <input 
                  value={newTaskTitle} 
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="Dodaj zadanie..." 
                  className="flex-1 border border-gray-200 p-2 rounded text-sm outline-none focus:border-blue-500"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-3 py-1 rounded text-sm font-bold">+</button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                {loadingTasks ? (
                  <p className="text-center text-gray-400 text-xs py-4">Ładowanie...</p>
                ) : tasks.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-4">Brak zadań. Dodaj pierwsze!</p>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between group bg-gray-50 p-2 rounded border border-gray-100">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={task.is_completed} 
                          onChange={() => handleToggleTask(task.id, task.is_completed)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className={`text-sm ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {task.title}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDeleteSubTask(task.id)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all px-1 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab !== 'main' && activeTab !== 'todo' && (
        <div className="py-10 text-center text-gray-400 text-sm italic h-[310px] flex items-center justify-center">
          Sekcja {['main', 'todo', 'notes', 'focus'].find(t => t === activeTab) === 'notes' ? 'Notatki' : 'Skupienie'} będzie dostępna wkrótce...
        </div>
      )}

      <div className="flex justify-between mt-4 border-t pt-4">
        <button onClick={() => confirm('Usunąć cały blok?') && onDelete(block.id)} className="text-red-600 text-xs font-bold hover:underline">USUŃ BLOK</button>
        <div className="flex gap-2">
          {onCopy && !block.id.startsWith('draft') && (
            <button onClick={handleCopy} className="px-4 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors rounded text-sm font-bold">Kopiuj</button>
          )}
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors rounded text-sm font-medium">Anuluj</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded text-sm font-bold">Zapisz</button>
        </div>
      </div>
    </div>
  )
}