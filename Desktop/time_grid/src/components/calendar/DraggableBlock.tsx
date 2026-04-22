'use client'

import { useDraggable } from '@dnd-kit/core'
import { Block } from '@/lib/api/blocks'

interface Props {
  block: Block;
  style: React.CSSProperties;
}

export default function DraggableBlock({ block, style }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: block.id,
  })

  // Transformacja: pozwala na płynne latanie kafelka za kursorem w trakcie przeciągania
  const transformStyle = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
    opacity: 0.8,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="absolute w-[90%] left-[5%] rounded-md text-white p-2 text-xs font-medium shadow-sm overflow-hidden border border-black/10 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      style={{ ...style, ...transformStyle, backgroundColor: block.color_tag || '#3b82f6' }}
    >
      {block.title}
    </div>
  )
}