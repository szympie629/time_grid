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
}

export default function DraggableBlock({ block, style, idPrefix = 'calendar-', isOverlay = false, onResizeEnd, onClick, onDelete, onUpdate, recentlyDroppedId }: Props) {
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
      className={`${isOverlay ? 'relative' : 'absolute'} rounded-md text-white p-2 text-xs font-medium shadow-sm overflow-hidden select-none touch-none flex flex-col ${draftClass} ${overlayClass} ${dragClass} ${rippleClass} ${completedClass}`}      
      style={{
        ...style,
        ...transformStyle,
        height: `${currentHeight}px`,
        backgroundColor: block.color_tag || '#3b82f6',
        zIndex: isResizing || transform || isOverlay ? 50 : 10,
      }}
    >
      {!isDraft && (
        <div 
          className="absolute top-1.5 left-1.5 z-10 flex items-center justify-center"
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={(e) => e.stopPropagation()}
        >
          <input 
            type="checkbox"
            checked={block.is_completed ?? false}
            onChange={(e) => onUpdate(block.id, { is_completed: e.target.checked })}
            className="w-3.5 h-3.5 cursor-pointer accent-green-500 rounded-sm"
          />
        </div>
      )}

      {!isDraft && (
        <button 
          onClick={(e) => {
            e.stopPropagation()
            if (!isOverlay && confirm('Usunąć ten blok?')) onDelete(block.id)
          }}
          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded hover:bg-black/20 transition-colors z-10"
        >
          ✕
        </button>
      )}

      <div className="pl-5 pr-4 truncate">{block.title}</div>

      {totalTasks > 0 && !isDraft && (
        <div className="absolute bottom-3 left-2 right-2 flex flex-col gap-1 z-10">
          <div className="text-[9px] font-bold opacity-80 text-right">
            {completedTasks}/{totalTasks}
          </div>
          <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {!isOverlay && !isDraft && (
        <div
          onPointerDown={handlePointerDown}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-end justify-center pb-1 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/20 to-transparent z-20"
        >
          <div className="w-6 h-1 bg-white/50 rounded-full"></div>
        </div>
      )}
    </div>
  )
}