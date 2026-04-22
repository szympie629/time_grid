'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { getWeekDays, getNextWeek, getPrevWeek } from '@/utils/dateHelpers'
import { Block, blocksApi } from '@/lib/api/blocks'
import { supabase } from '@/lib/supabase/client'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import DraggableBlock from './DraggableBlock'
import { calculateTimeShift, getNewTimes } from '@/utils/dndHelpers'

const HOURS = Array.from({ length: 24 }).map((_, i) => `${i.toString().padStart(2, '0')}:00`)

function getBlockPosition(startTime: string, endTime: string) {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const startHours = start.getHours() + start.getMinutes() / 60
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

  return {
    top: `${startHours * 80}px`,
    height: `${durationHours * 80}px`,
  }
}

export default function CalendarGrid({ initialBlocks }: { initialBlocks: Block[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const weekDays = getWeekDays(currentDate)

  // LOGIKA UPUSZCZANIA BLOKU
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event
    if (!delta.y) return // Brak ruchu w pionie

    const blockId = active.id as string
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    // Wyliczamy nowe czasy (ruch myszką na minuty)
    const minutesShift = calculateTimeShift(delta.y)
    if (minutesShift === 0) return 

    const { newStart, newEnd } = getNewTimes(block.start_time, block.end_time, minutesShift)

    // 1. Optymistyczna aktualizacja UI (natychmiastowy efekt u użytkownika)
    setBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, start_time: newStart, end_time: newEnd } : b
    ))

    // 2. Zapis w tle do Supabase
    try {
      await blocksApi.updateBlock(supabase, blockId, { 
        start_time: newStart, 
        end_time: newEnd 
      })
    } catch (error) {
      console.error(error)
      alert("Błąd zapisu! Odśwież stronę, aby przywrócić pierwotny stan.")
    }
  }

  const handleAddTestBlock = async () => {
    try {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return alert("Brak sesji!")

      const newBlock = await blocksApi.createBlock(supabase, {
        user_id: user.id,
        title: 'Testowy Blok 🚀',
        description: 'Sprawdzamy D&D',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        color_tag: '#3b82f6',
      })
      setBlocks([...blocks, newBlock])
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen bg-white text-black">
        {/* NAGŁÓWEK NAWIGACYJNY */}
        <header className="flex justify-between items-center p-4 border-b shrink-0">
          <h2 className="text-xl font-bold capitalize">{format(weekDays[0], 'MMMM yyyy')}</h2>
          <div className="flex gap-2 items-center">
            <button onClick={handleAddTestBlock} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold transition-colors mr-4">
              + Dodaj Testowy Blok
            </button>
            <button onClick={() => setCurrentDate(getPrevWeek(currentDate))} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium">Poprzedni</button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium">Dzisiaj</button>
            <button onClick={() => setCurrentDate(getNextWeek(currentDate))} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium">Następny</button>
          </div>
        </header>

        {/* GŁÓWNA SIATKA */}
        <div className="flex-1 overflow-auto">
          <div className="flex min-w-[700px]">
            <div className="w-16 flex-none border-r bg-gray-50">
              <div className="h-14 border-b sticky top-0 bg-gray-50 z-20"></div>
              {HOURS.map(hour => (
                <div key={hour} className="h-20 text-xs text-right pr-2 pt-2 border-b text-gray-400 box-border">{hour}</div>
              ))}
            </div>

            <div className="flex-1 flex">
              {weekDays.map((day) => {
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                const dayBlocks = blocks.filter(b => format(new Date(b.start_time), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))

                return (
                  <div key={day.toISOString()} className="flex-1 border-r relative">
                    <div className={`h-14 border-b flex flex-col items-center justify-center sticky top-0 z-10 bg-white ${isToday ? 'bg-blue-50' : ''}`}>
                      <span className={`text-xs ${isToday ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>{format(day, 'EEE')}</span>
                      <span className={`text-lg ${isToday ? 'text-blue-600 font-bold' : 'text-gray-900 font-semibold'}`}>{format(day, 'd')}</span>
                    </div>

                    <div className="relative bg-white h-[1920px]">
                      {HOURS.map(hour => (
                        <div key={hour} className="h-20 border-b border-gray-100 box-border pointer-events-none"></div>
                      ))}
                      
                      {dayBlocks.map(block => (
                        <DraggableBlock 
                          key={block.id} 
                          block={block} 
                          style={getBlockPosition(block.start_time, block.end_time)} 
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  )
}