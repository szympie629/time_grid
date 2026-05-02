import { useState, useRef, useEffect, useCallback } from 'react'
import { Block } from '@/lib/api/blocks'
import { Category } from '@/lib/api/categories'
import { tasksApi, Task } from '@/lib/api/tasks'
import { supabase } from '@/lib/supabase/client'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Drag handle icon ────────────────────────────────────────────────────────
function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="4" cy="2.5" r="1" />
      <circle cx="8" cy="2.5" r="1" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="8" cy="6" r="1" />
      <circle cx="4" cy="9.5" r="1" />
      <circle cx="8" cy="9.5" r="1" />
    </svg>
  )
}

// ─── Pojedyncze sortowalne subzadanie ────────────────────────────────────────
interface SortableTaskItemProps {
  task: Task
  onToggle: (id: string, current: boolean) => void
  onDelete: (id: string) => void
}

function SortableTaskItem({ task, onToggle, onDelete }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between group bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700 transition-colors"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Drag handle — tylko ten element inicjuje przeciąganie */}
        <button
          {...listeners}
          {...attributes}
          className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing shrink-0 touch-none p-1 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          tabIndex={-1}
          title="Przeciągnij, by zmienić kolejność"
        >
          <GripIcon />
        </button>

        <input
          type="checkbox"
          checked={task.is_completed}
          onChange={() => onToggle(task.id, task.is_completed)}
          className={`w-4 h-4 cursor-pointer shrink-0 accent-green-500 rounded`}
        />
        <span
          className={`text-sm truncate ${
            task.is_completed ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-700 dark:text-slate-200'
          }`}
        >
          {task.title}
        </span>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all px-1.5 font-bold shrink-0 ml-1"
      >
        ✕
      </button>
    </div>
  )
}

// ─── Główny modal ─────────────────────────────────────────────────────────────
interface Props {
  block: Block
  categories?: Category[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Block>) => void
  onDelete: (id: string) => void
  onCopy?: (block: Block) => void
}

export default function BlockModal({ block, categories = [], onClose, onUpdate, onDelete, onCopy }: Props) {
  const isBacklogItem = block.start_time === null
  const defaultDate = new Date().toISOString().split('T')[0]
  const safeStart = block.start_time || `${defaultDate}T09:00:00`
  const safeEnd = block.end_time || `${defaultDate}T10:00:00`

  const getInitialDuration = () => {
    if (block.start_time && block.end_time) {
      const s = new Date(block.start_time).getTime()
      const e = new Date(block.end_time).getTime()
      return Math.round((e - s) / 60000)
    }
    return block.duration_minutes || 60
  }

  // Stany formularza
  const [title, setTitle] = useState(block.title)
  const [description, setDescription] = useState(block.description || '')
  const [activeTab, setActiveTab] = useState('main')
  const [date, setDate] = useState(safeStart.split('T')[0])
  const [startTime, setStartTime] = useState(safeStart.split('T')[1].substring(0, 5))
  const [endTime, setEndTime] = useState(safeEnd.split('T')[1].substring(0, 5))
  const [categoryId, setCategoryId] = useState<string | null>(block.category_id || null)
  const [isCompleted, setIsCompleted] = useState(block.is_completed ?? false)
  const [durationMins, setDurationMins] = useState(getInitialDuration())
  const [hours, setHours] = useState(Math.floor(getInitialDuration() / 60))
  const [minutes, setMinutes] = useState(getInitialDuration() % 60)

  // Stany To-Do
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loadingTasks, setLoadingTasks] = useState(false)

  // Drag modalu
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null)

  // Sensory dla DnD subzadań — dystans 5px zapobiega przypadkowemu drag
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const notifyTasksChanged = () =>
    window.dispatchEvent(new CustomEvent(`tasks-updated-${block.id}`))

  const fetchTasks = useCallback(async () => {
    if (block.id === 'draft' || block.id === 'draft-backlog') {
      setLoadingTasks(false)
      return
    }
    setLoadingTasks(true)
    try {
      const data = await tasksApi.getTasks(supabase, block.id)
      setTasks(data)
    } catch (error) {
      console.error('Błąd pobierania zadań:', error)
    } finally {
      setLoadingTasks(false)
    }
  }, [block.id])

  useEffect(() => {
    setPosition({ x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 250 })
    setIsMounted(true)
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    if (tasks.length > 0) {
      const allDone = tasks.every((t) => t.is_completed)
      setIsCompleted(allDone)
    }
  }, [tasks])

  // ── Obsługa zmiany czasu trwania ──────────────────────────────────────────
  const handleDurationChange = (newDuration: number) => {
    setDurationMins(newDuration)
    setHours(Math.floor(newDuration / 60))
    setMinutes(newDuration % 60)
    if (!isBacklogItem && startTime) {
      const [h, m] = startTime.split(':').map(Number)
      const total = h * 60 + m + newDuration
      const nh = Math.floor(total / 60) % 24
      const nm = total % 60
      setEndTime(`${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`)
    }
  }

  const handleTimeChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartTime(value)
      const [h, m] = value.split(':').map(Number)
      const total = h * 60 + m + durationMins
      const nh = Math.floor(total / 60) % 24
      const nm = total % 60
      setEndTime(`${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`)
    } else {
      setEndTime(value)
      const [sh, sm] = startTime.split(':').map(Number)
      const [eh, em] = value.split(':').map(Number)
      let diff = eh * 60 + em - (sh * 60 + sm)
      if (diff < 0) diff += 24 * 60
      setDurationMins(diff)
      setHours(Math.floor(diff / 60))
      setMinutes(diff % 60)
    }
  }

  // ── Obsługa To-Do ─────────────────────────────────────────────────────────
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    try {
      const newTask = await tasksApi.createTask(supabase, block.id, newTaskTitle)
      setTasks((prev) => [...prev, newTask])
      setNewTaskTitle('')
      notifyTasksChanged()
    } catch {
      alert('Błąd dodawania zadania')
    }
  }

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      const updated = await tasksApi.toggleTask(supabase, taskId, !currentStatus)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
      notifyTasksChanged()
    } catch {
      alert('Błąd zmiany statusu')
    }
  }

  const handleDeleteSubTask = async (taskId: string) => {
    try {
      await tasksApi.deleteTask(supabase, taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      notifyTasksChanged()
    } catch {
      alert('Błąd usuwania zadania')
    }
  }

  // ── Drag & Drop subzadań ──────────────────────────────────────────────────
  const handleTaskDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tasks.findIndex((t) => t.id === active.id)
    const newIndex = tasks.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(tasks, oldIndex, newIndex)
    setTasks(reordered) // Optymistyczna aktualizacja UI

    try {
      await tasksApi.reorderTasks(supabase, reordered)
    } catch {
      // Rollback przy błędzie
      setTasks(tasks)
      alert('Błąd zapisu kolejności')
    }

    notifyTasksChanged()
  }

  // ── Przeciąganie okna modala ───────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, initX: position.x, initY: position.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    setPosition({
      x: dragRef.current.initX + (e.clientX - dragRef.current.startX),
      y: Math.max(0, dragRef.current.initY + (e.clientY - dragRef.current.startY)),
    })
  }
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      dragRef.current = null
    }
  }

  // ── Zapis ─────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const updates: Partial<Block> = {
      title,
      description,
      category_id: categoryId,
      color_tag: null, // Clear old color
      is_completed: isCompleted,
      duration_minutes: durationMins,
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
    if (!onCopy) return
    const copyData: Partial<Block> = { ...block, title, description, category_id: categoryId, color_tag: null, duration_minutes: durationMins }
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

  if (!isMounted) return null

  return (
    <div
      className="fixed z-[100] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-2xl w-[400px] shadow-2xl flex flex-col gap-5 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* ── Header ── */}
      <div
        className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3 cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold select-none text-gray-900 dark:text-white">
            {block.id.startsWith('draft') ? 'Nowy blok' : 'Edytuj blok'}
          </h2>
          <label
            className="flex items-center gap-2 cursor-pointer"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-green-500 rounded block"
            />
            <span className="text-sm text-gray-500 dark:text-slate-400 font-semibold select-none">Wykonano</span>
          </label>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 font-bold px-2 py-1 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-100 dark:border-slate-800 mb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'main', label: 'Główne' },
          { id: 'todo', label: 'To-Do' },
          { id: 'notes', label: 'Notatki' },
          { id: 'focus', label: 'Skupienie' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Główne ── */}
      {activeTab === 'main' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Tytuł</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Czas trwania</label>
              <div className="flex gap-2">
                <div className="flex flex-1 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                  <input
                    type="number"
                    min="0"
                    value={hours}
                    onChange={(e) => handleDurationChange(Number(e.target.value) * 60 + minutes)}
                    className="w-full p-2 text-sm text-center outline-none bg-transparent text-gray-900 dark:text-white"
                  />
                  <span className="flex items-center text-xs font-medium text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 px-2.5 border-l border-gray-200 dark:border-slate-700">h</span>
                </div>
                <div className="flex flex-1 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => handleDurationChange(hours * 60 + Number(e.target.value))}
                    className="w-full p-2 text-sm text-center outline-none bg-transparent text-gray-900 dark:text-white"
                  />
                  <span className="flex items-center text-xs font-medium text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 px-2.5 border-l border-gray-200 dark:border-slate-700">m</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {[15, 30, 45, 60, 90, 120].map((mins) => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => handleDurationChange(mins)}
                    className={`text-[10px] py-1 rounded-lg border transition-colors ${
                      durationMins === mins
                        ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/50'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Kategoria</label>
              <div className="flex gap-2 items-center h-10">
                <select
                  value={categoryId || ''}
                  onChange={e => setCategoryId(e.target.value || null)}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2 rounded text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="">⚪ Brak kategorii</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {!isBacklogItem && (
                <div className="flex flex-col gap-1 mt-2">
                  <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Data</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {!isBacklogItem && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleTimeChange('start', e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Koniec</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleTimeChange('end', e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Opis</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3 rounded-lg h-24 resize-none text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
            />
          </div>
        </div>
      )}

      {/* ── Tab: To-Do z sortowalnymi subzadaniami ── */}
      {activeTab === 'todo' && (
        <div className="flex flex-col gap-3 h-[310px]">
          {block.id.startsWith('draft') ? (
            <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-slate-400 text-sm italic">
              Najpierw zapisz blok, aby móc dodawać do niego zadania To-Do.
            </div>
          ) : (
            <>
              <form onSubmit={handleAddTask} className="flex gap-2 shrink-0">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Dodaj zadanie..."
                  className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors text-white px-4 rounded-lg text-lg font-bold shadow-sm"
                >
                  +
                </button>
              </form>

              {/* Podpowiedź dla użytkownika */}
              {tasks.length > 1 && (
                <p className="text-[10px] text-gray-400 shrink-0 -mt-1 flex items-center gap-1">
                  <GripIcon />
                  Przeciągnij za uchwyt, by zmienić kolejność
                </p>
              )}

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 min-h-0">
                {loadingTasks ? (
                  <p className="text-center text-gray-400 dark:text-slate-500 text-xs py-4">Ładowanie...</p>
                ) : tasks.length === 0 ? (
                  <p className="text-center text-gray-400 dark:text-slate-500 text-xs py-4">
                    Brak zadań. Dodaj pierwsze!
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleTaskDragEnd}
                  >
                    <SortableContext
                      items={tasks.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {tasks.map((task) => (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          onToggle={handleToggleTask}
                          onDelete={handleDeleteSubTask}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Inne zakładki ── */}
      {activeTab !== 'main' && activeTab !== 'todo' && (
        <div className="py-10 text-center text-gray-400 dark:text-slate-500 text-sm italic h-[310px] flex items-center justify-center">
          Sekcja {activeTab === 'notes' ? 'Notatki' : 'Skupienie'} będzie dostępna wkrótce...
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex justify-between mt-4 border-t border-gray-100 dark:border-slate-800 pt-5">
        <button
          onClick={() => confirm('Usunąć cały blok?') && onDelete(block.id)}
          className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-xs font-bold hover:underline transition-colors"
        >
          USUŃ BLOK
        </button>
        <div className="flex gap-2">
          {onCopy && !block.id.startsWith('draft') && (
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors rounded-lg text-sm font-bold"
            >
              Kopiuj
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 transition-colors rounded-lg text-sm font-medium"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors text-white rounded-lg text-sm font-bold shadow-sm"
          >
            Zapisz
          </button>
        </div>
      </div>
    </div>
  )
}