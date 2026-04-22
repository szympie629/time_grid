'use client'

import { useDroppable } from '@dnd-kit/core'
import { format } from 'date-fns'

interface Props {
  day: Date
  isToday: boolean
  children: React.ReactNode
}

export default function DroppableDay({ day, isToday, children }: Props) {
  const dateString = format(day, 'yyyy-MM-dd')
  
  // Tworzymy strefę zrzutu - jej ID to data tego konkretnego dnia
  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
  })

  return (
    <div 
      ref={setNodeRef} 
      className={`flex-1 border-r relative transition-colors ${isOver ? 'bg-blue-50/30' : ''}`}
    >
      {/* Nagłówek dnia */}
      <div className={`h-14 border-b flex flex-col items-center justify-center sticky top-0 z-10 bg-white ${isToday ? 'bg-blue-50' : ''}`}>
        <span className={`text-xs ${isToday ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
          {format(day, 'EEE')}
        </span>
        <span className={`text-lg ${isToday ? 'text-blue-600 font-bold' : 'text-gray-900 font-semibold'}`}>
          {format(day, 'd')}
        </span>
      </div>

      {/* Kontener na bloki */}
      {children}
    </div>
  )
}