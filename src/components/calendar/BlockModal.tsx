import { useState, useRef, useEffect, useCallback } from 'react'
import { Block } from '@/lib/api/blocks'
import { Category } from '@/lib/api/categories'
import { tasksApi, Task } from '@/lib/api/tasks'
import { supabase } from '@/lib/supabase/client'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/lib/i18n/LanguageContext'
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
  onEdit: (id: string, newTitle: string) => void // Dodany prop do edycji
}

function SortableTaskItem({ task, onToggle, onDelete, onEdit }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue !== task.title) {
      onEdit(task.id, editValue.trim())
    } else {
      setEditValue(task.title) // Cofnij, jeśli puste
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit()
    if (e.key === 'Escape') {
      setEditValue(task.title)
      setIsEditing(false)
    }
  }

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
        {/* Drag handle */}
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

        {/* Przełączanie między tekstem a trybem edycji */}
        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-white dark:bg-slate-900 border border-blue-500 rounded px-2 py-0.5 text-sm text-gray-900 dark:text-white outline-none"
          />
        ) : (
          <span
            onDoubleClick={() => setIsEditing(true)}
            title={task.title} // <-- Dodany atrybut title
            className={`text-sm truncate flex-1 cursor-help ${ // <-- Dodana klasa cursor-help
              task.is_completed ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-700 dark:text-slate-200'
              }`}
          >
            {task.title}
          </span>
        )}
      </div>

      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
        {/* Ikona Edycji */}
        <button
          onClick={() => setIsEditing(true)}
          className="text-gray-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 px-1.5 transition-colors"
          title="Edytuj"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>

        {/* Ikona Usuwania */}
        <button
          onClick={() => onDelete(task.id)}
          className="text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 px-1.5 font-bold transition-colors"
          title="Usuń"
        >
          ✕
        </button>
      </div>
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
  onChangePreview?: (updates: Partial<Block>) => void
}

export default function BlockModal({ block, categories = [], onClose, onUpdate, onDelete, onCopy, onChangePreview }: Props) {
  const { t } = useTranslation()
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
  const [endDate, setEndDate] = useState(safeEnd.split('T')[0])
  const [startTime, setStartTime] = useState(safeStart.split('T')[1].substring(0, 5))
  const [endTime, setEndTime] = useState(safeEnd.split('T')[1].substring(0, 5))
  const [isMultiDay, setIsMultiDay] = useState(safeStart.split('T')[0] !== safeEnd.split('T')[0])
  const [isAllDay, setIsAllDay] = useState(getInitialDuration() >= 1439 && safeStart.includes('00:00'))
  const [categoryId, setCategoryId] = useState<string | null>(block.category_id || null)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
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

  // Skupienie (Focus)
  const [focusGoal, setFocusGoal] = useState((block as any).focus_goal || '')
  const initialMetadata = (block as any).metadata || {}
  const [pomodoroInterval, setPomodoroInterval] = useState<number>(initialMetadata.pomodoro_interval || 25)
  const [distractions, setDistractions] = useState<string[]>(initialMetadata.distractions || [])
  const [newDistraction, setNewDistraction] = useState('')

  // Timer stanu
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(pomodoroInterval * 60)

  useEffect(() => {
    if (!isTimerRunning) {
      setTimeRemaining(pomodoroInterval * 60)
    }
  }, [pomodoroInterval, isTimerRunning])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1)
      }, 1000)
    } else if (timeRemaining <= 0) {
      setIsTimerRunning(false)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, timeRemaining])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleAddDistraction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDistraction.trim()) return
    setDistractions((prev) => [newDistraction.trim(), ...prev])
    setNewDistraction('')
  }

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
    // Obliczenie domyślnych, responsywnych wymiarów modala
    const w = Math.min(500, window.innerWidth * 0.9)
    const h = Math.min(800, window.innerHeight * 0.85)
    
    // Sztywne obliczenie pozycji top/left na srodek ekranu w pikselach
    setPosition({ 
      x: (window.innerWidth - w) / 2, 
      y: (window.innerHeight - h) / 2 
    })
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

  const handleEditSubTask = async (taskId: string, newTitle: string) => {
    try {
      const updated = await tasksApi.updateTask(supabase, taskId, newTitle)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
      notifyTasksChanged()
    } catch {
      alert('Błąd edycji zadania')
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
    const getFinalDuration = () => {
      if (isMultiDay) {
        const start = new Date(`${date}T${startTime}:00`).getTime()
        const end = new Date(`${endDate}T${endTime}:00`).getTime()
        return Math.max(15, (end - start) / 60000)
      }
      return isAllDay ? 1440 : durationMins
    }
    const finalDuration = getFinalDuration()

    const updates: Partial<Block> = {
      title,
      description,
      category_id: categoryId,
      color_tag: null, // Clear old color
      is_completed: isCompleted,
      duration_minutes: finalDuration,
      focus_goal: focusGoal,
      metadata: { pomodoro_interval: pomodoroInterval, distractions } as any
    }
    if (!isBacklogItem) {
      if (isMultiDay) {
        if (isAllDay) {
          updates.start_time = `${date}T00:00:00`
          updates.end_time = `${endDate}T23:59:59`
        } else {
          updates.start_time = `${date}T${startTime}:00`
          updates.end_time = `${endDate}T${endTime}:00`
        }
      } else if (isAllDay) {
        updates.start_time = `${date}T00:00:00`
        updates.end_time = `${date}T23:59:59`
      } else {
        updates.start_time = `${date}T${startTime}:00`
        updates.end_time = `${date}T${endTime}:00`
      }
    } else {
      updates.start_time = null
      updates.end_time = null
    }
    onUpdate(block.id, updates)
    onClose()
  }

  const handleCopy = () => {
    if (!onCopy) return
    const getFinalDuration = () => {
      if (isMultiDay) {
        const start = new Date(`${date}T${startTime}:00`).getTime()
        const end = new Date(`${endDate}T${endTime}:00`).getTime()
        return Math.max(15, (end - start) / 60000)
      }
      return isAllDay ? 1440 : durationMins
    }
    const finalDuration = getFinalDuration()

    const copyData: Partial<Block> = { ...block, title, description, category_id: categoryId, color_tag: null, duration_minutes: finalDuration }
    if (!isBacklogItem) {
      if (isMultiDay) {
        if (isAllDay) {
          copyData.start_time = `${date}T00:00:00`
          copyData.end_time = `${endDate}T23:59:59`
        } else {
          copyData.start_time = `${date}T${startTime}:00`
          copyData.end_time = `${endDate}T${endTime}:00`
        }
      } else if (isAllDay) {
        copyData.start_time = `${date}T00:00:00`
        copyData.end_time = `${date}T23:59:59`
      } else {
        copyData.start_time = `${date}T${startTime}:00`
        copyData.end_time = `${date}T${endTime}:00`
      }
    } else {
      copyData.start_time = null
      copyData.end_time = null
    }
    onCopy(copyData as Block)
    onClose()
  }

  if (!isMounted) return null

  return createPortal(
    <div
      className="fixed z-[9999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-2xl w-[min(500px,90vw)] h-[min(800px,85vh)] shadow-2xl flex flex-col gap-5 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 resize overflow-hidden min-w-[360px] min-h-[400px] max-w-[95vw] max-h-[95vh]"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <div
        className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3 cursor-grab active:cursor-grabbing shrink-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold select-none text-gray-900 dark:text-white">
            {block.id.startsWith('draft') ? t('blockModal.newBlock') : t('blockModal.editBlock')}
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
            <span className="text-sm text-gray-500 dark:text-slate-400 font-semibold select-none">{t('blockModal.done')}</span>
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
      <div className="flex border-b border-gray-100 dark:border-slate-800 mb-2 overflow-x-auto no-scrollbar shrink-0">
        {[
          { id: 'main', label: t('blockModal.tabMain') },
          { id: 'todo', label: t('blockModal.tabTodo') },
          { id: 'notes', label: t('blockModal.tabNotes') },
          { id: 'focus', label: t('blockModal.tabFocus') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pr-2 flex flex-col">
        {/* ── Tab: Główne ── */}
        {activeTab === 'main' && (
          <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">{t('blockModal.title')}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">{t('blockModal.category')}</label>
            <div className="relative h-10">
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="w-full h-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-3 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white flex items-center justify-between transition-all"
              >
                {categoryId ? (
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: categories.find(c => c.id === categoryId)?.color || '#64748b' }} />
                    <span className="truncate">{categories.find(c => c.id === categoryId)?.name || 'Nieznana kategoria'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full shrink-0 bg-slate-500" />
                    <span>{t('common.noCategory')}</span>
                  </div>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0 ml-2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {isCategoryDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[150]" onClick={() => setIsCategoryDropdownOpen(false)} />
                  <ul className="absolute top-full left-0 right-0 mt-1 z-[160] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-y-auto max-h-48 py-1">
                    <li
                      className="px-3 py-2.5 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2.5 transition-colors"
                      onClick={() => { setCategoryId(null); setIsCategoryDropdownOpen(false); onChangePreview?.({ category_id: null }); }}
                    >
                      <div className="w-3.5 h-3.5 rounded-full shrink-0 bg-slate-500" />
                      <span>{t('common.noCategory')}</span>
                    </li>
                    {categories.map(c => (
                      <li
                        key={c.id}
                        className="px-3 py-2.5 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2.5 transition-colors"
                        onClick={() => { setCategoryId(c.id); setIsCategoryDropdownOpen(false); onChangePreview?.({ category_id: c.id }); }}
                      >
                        <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          {!isBacklogItem && (
            <>
              {/* Opcje Czasu (Switches) */}
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Opcje czasu:</label>
                <div className="flex items-center gap-6">
                  {/* Toggle Wielodniowe */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input type="checkbox" checked={isMultiDay} onChange={(e) => setIsMultiDay(e.target.checked)} className="sr-only peer" />
                      <div className="w-7 h-4 bg-gray-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-3 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium group-hover:text-gray-700 dark:group-hover:text-slate-200 transition-colors">Wielodniowe</span>
                  </label>
                  {/* Toggle Cały dzień */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} className="sr-only peer" />
                      <div className="w-7 h-4 bg-gray-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-3 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium group-hover:text-gray-700 dark:group-hover:text-slate-200 transition-colors">Cały dzień</span>
                  </label>
                </div>
              </div>

              {/* Grid 2-col dla Dat/Czasu/Duration */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                
                {/* LEWA KOLUMNA */}
                <div className="flex flex-col gap-4">
                  {isMultiDay ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Data Startu</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all dark:[color-scheme:dark]"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">{t('blockModal.duration')}</label>
                      {isAllDay ? (
                        <div className="flex h-[42px] items-center justify-center bg-gray-50 dark:bg-slate-800/50 rounded-lg text-sm text-gray-500 dark:text-slate-400 italic border border-dashed border-gray-200 dark:border-slate-700 select-none">
                          Cały dzień
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <div className="flex flex-1 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                              <input
                                type="number"
                                min="0"
                                value={hours}
                                onChange={(e) => handleDurationChange(Number(e.target.value) * 60 + minutes)}
                                className="w-full min-w-0 p-2 text-sm text-center outline-none bg-transparent text-gray-900 dark:text-white"
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
                                className="w-full min-w-0 p-2 text-sm text-center outline-none bg-transparent text-gray-900 dark:text-white"
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
                                className={`text-[10px] py-1 rounded-lg border transition-colors ${durationMins === mins
                                  ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/50'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                                  }`}
                              >
                                {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {!isAllDay && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">{isMultiDay ? 'Start (Godzina)' : t('blockModal.startTime')}</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => handleTimeChange('start', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all dark:[color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>

                {/* PRAWA KOLUMNA */}
                <div className="flex flex-col gap-4">
                  {isMultiDay ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Data Końca</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all dark:[color-scheme:dark]"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">{t('blockModal.date')}</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full h-[42px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all dark:[color-scheme:dark]"
                      />
                    </div>
                  )}

                  {!isAllDay && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">{isMultiDay ? 'Koniec (Godzina)' : t('blockModal.endTime')}</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => handleTimeChange('end', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white transition-all dark:[color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>

              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">{t('blockModal.description')}</label>
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
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {block.id.startsWith('draft') ? (
            <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-slate-400 text-sm italic">
              {t('blockModal.saveDraftFirst')}
            </div>
          ) : (
            <>
              <form onSubmit={handleAddTask} className="flex gap-2 shrink-0">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder={t('blockModal.addTask')}
                  className="flex-1 p-2.5 rounded-lg text-sm outline-none border transition-all bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 rounded-lg text-lg font-bold shadow-sm transition-colors bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                >
                  +
                </button>
              </form>

              {/* Podpowiedź dla użytkownika */}
              {tasks.length > 1 && (
                <p className="text-[10px] text-gray-400 shrink-0 -mt-1 flex items-center gap-1">
                  <GripIcon />
                  {t('blockModal.dragToReorder')}
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                {loadingTasks ? (
                  <p className="text-center text-gray-400 dark:text-slate-500 text-xs py-4">{t('common.loading')}</p>
                ) : tasks.length === 0 ? (
                  <p className="text-center text-gray-400 dark:text-slate-500 text-xs py-4">
                    {t('blockModal.noTasks')}
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
                          onEdit={handleEditSubTask} // <-- DODAJ TĘ LINIJKĘ
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

      {/* ── Tab: Skupienie ── */}
      {activeTab === 'focus' && (
        <div className="flex flex-col gap-4 h-[310px] overflow-y-auto no-scrollbar">
          {/* Cel Jednego Zdania */}
          <div className="flex flex-col gap-2 shrink-0">
            <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">
              {t('blockModal.focusGoalLabel')}
            </label>
            <input
              value={focusGoal}
              onChange={(e) => setFocusGoal(e.target.value)}
              placeholder={t('blockModal.focusGoalPlaceholder')}
              className="w-full bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 p-3 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-indigo-900 dark:text-indigo-100 transition-all placeholder-indigo-300 dark:placeholder-indigo-700"
            />
          </div>

          {!focusGoal.trim() ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 p-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 text-indigo-400"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">{t('blockModal.focusGoalHint')}</p>
            </div>
          ) : (
            <>
              {/* Tryb Pomodoro */}
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center gap-3 shrink-0">
                <div className="flex w-full justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('blockModal.pomodoroTimer')}</span>
                  {!isTimerRunning && (
                    <select
                      value={pomodoroInterval}
                      onChange={(e) => setPomodoroInterval(Number(e.target.value))}
                      className="text-xs bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1 outline-none font-medium cursor-pointer"
                    >
                      <option value={25}>{t('blockModal.pomodoroClassic')}</option>
                      <option value={50}>{t('blockModal.pomodoroLong')}</option>
                      <option value={90}>{t('blockModal.pomodoroDeepWork')}</option>
                    </select>
                  )}
                </div>
                
                <div className={`text-5xl font-black tabular-nums transition-colors ${isTimerRunning ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-800 dark:text-slate-200'}`}>
                  {formatTime(timeRemaining)}
                </div>
                
                <div className="flex gap-2 w-full mt-2">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
                      isTimerRunning 
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                    }`}
                  >
                    {isTimerRunning ? t('blockModal.timerPause') : (timeRemaining < pomodoroInterval * 60 ? t('blockModal.timerResume') : t('blockModal.timerStart'))}
                  </button>
                  {timeRemaining < pomodoroInterval * 60 && !isTimerRunning && (
                    <button
                      onClick={() => setTimeRemaining(pomodoroInterval * 60)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg text-sm font-bold transition-all"
                    >
                      {t('blockModal.timerReset')}
                    </button>
                  )}
                </div>
              </div>

              {/* Distraction Tracker */}
              <div className="flex flex-col gap-2 shrink-0">
                <form onSubmit={handleAddDistraction} className="flex gap-2">
                  <input
                    value={newDistraction}
                    onChange={(e) => setNewDistraction(e.target.value)}
                    placeholder={t('blockModal.distractionPlaceholder')}
                    className="flex-1 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-2.5 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 text-gray-900 dark:text-white transition-all placeholder-red-300 dark:placeholder-red-700/50"
                  />
                  <button
                    type="submit"
                    className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-colors text-white px-3 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap"
                  >
                    {t('blockModal.distractionButton')}
                  </button>
                </form>

                {distractions.length > 0 && (
                  <div className="mt-1 border border-gray-100 dark:border-slate-800 rounded-xl p-2 bg-white/50 dark:bg-slate-900/50">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{t('blockModal.distractionTitle')} ({distractions.length}):</h4>
                    <ul className="flex flex-col gap-1.5">
                      {distractions.map((dist, i) => (
                        <li key={i} className="text-xs bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 py-2 px-3 rounded-md text-gray-700 dark:text-slate-300 shadow-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                          <span className="break-words whitespace-normal">{dist}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Inne zakładki ── */}
      {activeTab === 'notes' && (
        <div className="py-10 text-center text-gray-400 dark:text-slate-500 text-sm italic h-[310px] flex items-center justify-center">
          {t('blockModal.notesComingSoon')}
        </div>
      )}
      </div>

      {/* ── Footer ── */}
      <div className="flex justify-between mt-4 border-t border-gray-100 dark:border-slate-800 pt-5 shrink-0 pr-4">
        <button
          onClick={() => confirm(t('blockModal.deleteConfirm')) && onDelete(block.id)}
          className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-xs font-bold hover:underline transition-colors"
        >
          {t('blockModal.deleteBlock')}
        </button>
        <div className="flex gap-2">
          {onCopy && !block.id.startsWith('draft') && (
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors rounded-lg text-sm font-bold"
            >
              {t('common.copy')}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 transition-colors rounded-lg text-sm font-medium"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors text-white rounded-lg text-sm font-bold shadow-sm"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}