'use client'

import { useDraggable } from '@dnd-kit/core'
import { Block } from '@/lib/api/blocks'
import { useState, useRef, useEffect } from 'react'
import { tasksApi, Task } from '@/lib/api/tasks'
import { supabase } from '@/lib/supabase/client'

interface Props {
  block: Block;
  style?: React.CSSProperties;
  idPrefix?: string;
  isOverlay?: boolean;
  onResizeEnd: (blockId: string, newHeightPixels: number) => void;
  onClick: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onUpdate: (blockId: string, updates: Partial<Block>) => void;
  recentlyDroppedId?: string | null;
  onCopy?: (block: Block) => void;
}

export default function DraggableBlock({ block, style, idPrefix = 'calendar-', isOverlay = false, onResizeEnd, onClick, onDelete, onUpdate, recentlyDroppedId, onCopy }: Props) {
  const isDraft = block.id === 'draft'
  const type = idPrefix.replace('-', '')
  
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `${idPrefix}${block.id}`,
    data: { type, block },
    disabled: isDraft
  })

  const [isResizing, setIsResizing] = useState(false)
  const [resizeHeight, setResizeHeight] = useState<number | null>(null)
  const initialHeightRef = useRef<number>(0)
  const startYRef = useRef<number>(0)
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [ripple, setRipple] = useState(false)
  const posKey = `${block.start_time || 'backlog'}-${style?.top || 0}-${style?.left || 0}`
  const posRef = useRef(posKey)

  let baseHeight = style?.height ? parseInt(style.height as string) : 80;
  if (isOverlay && block.start_time && block.end_time) {
    const startT = block.start_time.split('T')[1];
    const endT = block.end_time.split('T')[1];
    if (startT && endT) {
      const [sHours, sMinutes] = startT.split(':').map(Number);
      const [eHours, eMinutes] = endT.split(':').map(Number);
      baseHeight = ((eHours + eMinutes / 60) - (sHours + sMinutes / 60)) * 80;
    }
  }
  const currentHeight = resizeHeight !== null ? resizeHeight : baseHeight

  useEffect(() => {
    if (isOverlay || isResizing) return

    const positionChanged = posRef.current !== posKey
    const justDropped = recentlyDroppedId === block.id

    if (positionChanged || justDropped) {
      setRipple(true)
      const timer = setTimeout(() => setRipple(false), 600)
      posRef.current = posKey
      return () => clearTimeout(timer)
    }
  }, [posKey, isOverlay, isResizing, recentlyDroppedId, block.id])

  useEffect(() => {
    let isMounted = true
    const fetchTasks = async () => {
      try {
        const data = await tasksApi.getTasks(supabase, block.id)
        if (isMounted) setTasks(data)
      } catch (error) {
        console.error("Błąd pobierania zadań w kafelku:", error)
      }
    }
    fetchTasks()
    const handleTasksUpdate = () => fetchTasks()
    window.addEventListener(`tasks-updated-${block.id}`, handleTasksUpdate)
    return () => { 
      isMounted = false
      window.removeEventListener(`tasks-updated-${block.id}`, handleTasksUpdate)
    }
  }, [block.id, isOverlay])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isOverlay) return;
    e.stopPropagation() 
    e.preventDefault()
    setIsResizing(true)
    startYRef.current = e.clientY
    initialHeightRef.current = baseHeight
  }

  useEffect(() => {
    if (!isResizing) return
    const handlePointerMove = (e: PointerEvent) => {
      const deltaY = e.clientY - startYRef.current
      const newHeight = Math.max(20, initialHeightRef.current + deltaY) 
      const snappedHeight = Math.round(newHeight / 20) * 20
      setResizeHeight(snappedHeight)
    }
    const handlePointerUp = () => {
      setIsResizing(false)
      if (resizeHeight !== null && resizeHeight !== initialHeightRef.current) {
         onResizeEnd(block.id, resizeHeight)
      }
      setResizeHeight(null)
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isResizing, resizeHeight, block.id, onResizeEnd])

  const transformStyle = transform && !isResizing ? { opacity: 0.3 } : undefined

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.is_completed).length
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const pendingTasks = tasks.filter(t => !t.is_completed)

  // Wyliczanie czasu trwania (80px = 60m)
  const durationMinutes = Math.round((currentHeight / 80) * 60)
  const hours = Math.floor(durationMinutes / 60)
  const mins = durationMinutes % 60
  const durationText = hours > 0 ? `${hours}h ${mins > 0 ? mins + 'm' : ''}`.trim() : `${mins}m`

  const overlayClass = isOverlay ? 'scale-105 shadow-2xl -rotate-1 opacity-90 transition-transform duration-200 cursor-grabbing' : ''
  const dragClass = isDraft ? '' : (isResizing ? 'cursor-ns-resize z-50' : 'cursor-grab active:cursor-grabbing')
  const rippleClass = ripple ? 'ripple-effect' : ''
  const completedClass = block.is_completed ? 'opacity-40 grayscale line-through' : ''
  const draftClass = isDraft ? 'opacity-60 border-2 border-dashed border-white pointer-events-none animate-pulse' : 'border border-black/10 hover:shadow-md'

 return (
    <div
      ref={setNodeRef}
      id={`${idPrefix}${block.id}`}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        if (!isResizing && !isOverlay && !isDraft) onClick(block.id);
      }}
      className={`${isOverlay ? 'relative' : 'absolute'} rounded-md text-white px-1.5 py-1 text-xs font-medium shadow-sm overflow-hidden select-none touch-none flex flex-col ${draftClass} ${overlayClass} ${dragClass} ${rippleClass} ${completedClass}`}      
      style={{
        ...style,
        ...transformStyle,
        height: `${currentHeight}px`,
        backgroundColor: isDraft ? '#64748b' : (block.color_tag || '#3b82f6'),
        zIndex: isResizing || transform || isOverlay ? 50 : 10,
      }}
    >
      {/* Top Bar: Checkbox, Czas trwania, Akcje */}
      <div className="flex items-start justify-between gap-1 w-full z-10 shrink-0">
        <div className="flex items-center gap-1.5">
          {!isDraft && (
            <div 
              onPointerDown={(e) => e.stopPropagation()} 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center"
            >
              <input 
                type="checkbox"
                checked={block.is_completed ?? false}
                onChange={(e) => onUpdate(block.id, { is_completed: e.target.checked })}
                className="w-3 h-3 cursor-pointer accent-green-500 rounded-sm block"
              />
            </div>
          )}
          {!isDraft && (
            <span className="text-[10px] font-medium opacity-90 leading-none block">
              {durationText}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {!isDraft && onCopy && (
            <button 
              onClick={(e) => { e.stopPropagation(); onCopy(block); }}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/20 transition-colors text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>
            </button>
          )}
          {!isDraft && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (!isOverlay && confirm('Usunąć ten blok?')) onDelete(block.id);
              }}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/20 transition-colors text-[10px]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tytuł */}
      <div className="mt-0.5 font-bold text-[11px] leading-tight line-clamp-2 z-10 w-full pr-1 shrink-0">
        {block.title}
      </div>

      {/* Aktywne Sub-zadania */}
      {!isDraft && pendingTasks.length > 0 && (
        <div className="mt-1 flex flex-col gap-px z-10 overflow-hidden shrink-0">
          {pendingTasks.map(task => (
            <div key={task.id} className="text-[9px] leading-tight opacity-85 flex items-start gap-1">
              <span className="mt-[3px] w-1 h-1 rounded-full bg-white/70 shrink-0" />
              <span className="line-clamp-1">{task.title}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-[2px]" />

      {/* Pasek postępu */}
      {totalTasks > 0 && !isDraft && (
        <div className="flex flex-col gap-0.5 z-10 w-full mb-0.5 shrink-0">
          <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Uchwyt zmiany rozmiaru */}
      {!isOverlay && !isDraft && (
        <div
          onPointerDown={handlePointerDown}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize flex items-end justify-center pb-0.5 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/20 to-transparent z-20"
        >
          <div className="w-6 h-[2px] bg-white/50 rounded-full"></div>
        </div>
      )}
    </div>
  )
}