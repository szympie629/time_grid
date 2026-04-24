'use client'

import { useDraggable } from '@dnd-kit/core'
import { Block } from '@/lib/api/blocks'
import { useState, useRef, useEffect } from 'react'
import { tasksApi, Task } from '@/lib/api/tasks'
import { supabase } from '@/lib/supabase/client'

interface Props {
  block: Block;
  style: React.CSSProperties;
  onResizeEnd: (blockId: string, newHeightPixels: number) => void;
  onClick: (blockId: string) => void;
  onDelete: (blockId: string) => void;
}

export default function DraggableBlock({ block, style, onResizeEnd, onClick, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: block.id,
  })

  const [isResizing, setIsResizing] = useState(false)
  const [resizeHeight, setResizeHeight] = useState<number | null>(null)
  const initialHeightRef = useRef<number>(0)
  const startYRef = useRef<number>(0)
  
  // Stan na zadania
  const [tasks, setTasks] = useState<Task[]>([])

  const baseHeight = parseInt(style.height as string)
  const currentHeight = resizeHeight !== null ? resizeHeight : baseHeight

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

    // Subskrypcja na żywo
    const subscription = supabase
      .channel(`tasks_for_block_${block.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks',
        filter: `block_id=eq.${block.id}` 
      }, () => {
         fetchTasks()
      })
      .subscribe()

    return () => { 
      isMounted = false
      supabase.removeChannel(subscription)
    }
  }, [block.id])

  const handlePointerDown = (e: React.PointerEvent) => {
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

  const transformStyle = transform && !isResizing ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
    opacity: 0.8,
  } : undefined

  // Obliczenia postępu
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.is_completed).length
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        if (!isResizing) onClick(block.id);
      }}
      className={`absolute w-[90%] left-[5%] rounded-md text-white p-2 text-xs font-medium shadow-sm overflow-hidden border border-black/10 hover:shadow-md transition-shadow flex flex-col ${isResizing ? 'cursor-ns-resize z-50' : 'cursor-grab active:cursor-grabbing'}`}
      style={{
        ...style,
        ...transformStyle,
        height: `${currentHeight}px`,
        backgroundColor: block.color_tag || '#3b82f6'
      }}
    >
      {/* Przycisk usuwania "X" */}
      <button 
        onClick={(e) => {
          e.stopPropagation()
          if (confirm('Usunąć ten blok?')) onDelete(block.id)
        }}
        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded hover:bg-black/20 transition-colors z-10"
      >
        ✕
      </button>

      {/* Tytuł kafelka - ucinany jeśli za długi */}
      <div className="pr-4 truncate">{block.title}</div>

      {/* Pasek postępu i licznik - tylko jeśli są zadania */}
      {totalTasks > 0 && (
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

      {/* Obszar do rozciągania bloku */}
      <div
        onPointerDown={handlePointerDown}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-end justify-center pb-1 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/20 to-transparent z-20"
      >
        <div className="w-6 h-1 bg-white/50 rounded-full"></div>
      </div>
    </div>
  )
}