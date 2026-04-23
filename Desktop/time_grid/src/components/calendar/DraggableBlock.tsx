'use client'

import { useDraggable } from '@dnd-kit/core'
import { Block } from '@/lib/api/blocks'
import { useState, useRef, useEffect } from 'react'

interface Props {
  block: Block;
  style: React.CSSProperties;
  onResizeEnd: (blockId: string, newHeightPixels: number) => void;
  onClick: (blockId: string) => void;
}

export default function DraggableBlock({ block, style, onResizeEnd, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: block.id,
  })

  const [isResizing, setIsResizing] = useState(false)
  const [resizeHeight, setResizeHeight] = useState<number | null>(null)
  const initialHeightRef = useRef<number>(0)
  const startYRef = useRef<number>(0)

  const baseHeight = parseInt(style.height as string)
  const currentHeight = resizeHeight !== null ? resizeHeight : baseHeight

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

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Blokujemy dalszą propagację kliknięcia i sprawdzamy czy nie skalujemy
        e.stopPropagation();
        if (!isResizing) {
          onClick(block.id);
        }
      }}
      className={`absolute w-[90%] left-[5%] rounded-md text-white p-2 text-xs font-medium shadow-sm overflow-hidden border border-black/10 hover:shadow-md transition-shadow ${isResizing ? 'cursor-ns-resize z-50' : 'cursor-grab active:cursor-grabbing'}`}
      style={{
        ...style,
        ...transformStyle,
        height: `${currentHeight}px`,
        backgroundColor: block.color_tag || '#3b82f6'
      }}
    >
      {block.title}

      <div
        onPointerDown={handlePointerDown}
        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-end justify-center pb-1 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/20 to-transparent"
      >
        <div className="w-6 h-1 bg-white/50 rounded-full"></div>
      </div>
    </div>
  )
}