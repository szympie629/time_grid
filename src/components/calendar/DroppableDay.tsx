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
  
  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
  })

  return (
    <div 
      ref={setNodeRef} 
      className={`flex-1 border-r border-gray-200 dark:border-slate-800 relative transition-colors ${isOver ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}`}
    >
      {/* Nagłówek dnia - z-index 20 i tła dark mode */}
      <div className={`h-14 border-b border-gray-200 dark:border-slate-800 flex flex-col items-center justify-center sticky top-0 z-20 bg-white dark:bg-slate-950 transition-colors ${isToday ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
        <span className={`text-xs ${isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-slate-400'}`}>
          {format(day, 'EEE')}
        </span>
        <span className={`text-lg ${isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-900 dark:text-slate-100 font-semibold'}`}>
          {format(day, 'd')}
        </span>
      </div>

      {children}
    </div>
  )
}