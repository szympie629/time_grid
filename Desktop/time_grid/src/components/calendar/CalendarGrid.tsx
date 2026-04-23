'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { getWeekDays, getNextWeek, getPrevWeek } from '@/utils/dateHelpers'
import { Block, blocksApi } from '@/lib/api/blocks'
import { supabase } from '@/lib/supabase/client'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import DraggableBlock from './DraggableBlock'
import DroppableDay from './DroppableDay'
import { calculateTimeShift, getNewTimes } from '@/utils/dndHelpers'
import BlockModal from './BlockModal'

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
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)

  // FUNKCJE DO MODALA
  const handleUpdateBlockDetails = async (id: string, updates: any) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    try {
      await blocksApi.updateBlock(supabase, id, updates)
    } catch (error) {
      console.error(error)
      alert("Błąd zapisu!")
    }
  }

  const handleDeleteBlock = async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    setSelectedBlock(null)
    try {
      await blocksApi.deleteBlock(supabase, id)
    } catch (error) {
      console.error(error)
      alert("Błąd podczas usuwania!")
    }
  }


  // LOGIKA UPUSZCZANIA BLOKU (Pion i Poziom)
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event
    
    // Zabezpieczenie: Jeśli klocek został kliknięty, ale nie przesunięty
    if (delta.x === 0 && delta.y === 0) return 

    const blockId = active.id as string
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    // 1. Zmiana godzin (minuty) na podstawie przesunięcia myszki (oś Y)
    const minutesShift = calculateTimeShift(delta.y)
    let { newStart, newEnd } = getNewTimes(block.start_time, block.end_time, minutesShift)

    // 2. Zmiana dnia (oś X) - sprawdzamy nad jaką strefą (id daty) opuszczono klocek
    if (over && over.id) {
      const targetDateStr = over.id as string // np. "2024-03-25"
      const [year, month, day] = targetDateStr.split('-').map(Number)

      const startObj = new Date(newStart)
      const durationMs = new Date(newEnd).getTime() - startObj.getTime()

      // Podmieniamy samą datę, zostawiając wyliczone wcześniej godziny
      startObj.setFullYear(year, month - 1, day)

      newStart = startObj.toISOString()
      newEnd = new Date(startObj.getTime() + durationMs).toISOString()
    }

    // Zabezpieczenie: jeśli parametry się nie zmieniły, nie spamujemy bazy
    if (block.start_time === newStart && block.end_time === newEnd) return

    // 3. Optymistyczna aktualizacja UI
    setBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, start_time: newStart, end_time: newEnd } : b
    ))

    // 4. Zapis w tle do Supabase
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

  // LOGIKA ROZCIĄGANIA BLOKU (Zmiana czasu trwania)
  const handleResizeEnd = async (blockId: string, newHeightPixels: number) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    // Matematyka: 80px to 60 minut, więc 1px to 0.75 minuty
    const durationMinutes = newHeightPixels * 0.75
    
    const startObj = new Date(block.start_time)
    // Obliczamy nowy czas zakończenia
    const newEnd = new Date(startObj.getTime() + durationMinutes * 60000).toISOString()

    if (block.end_time === newEnd) return // Jeśli czas jest ten sam, nic nie robimy

    // 1. Optymistyczna aktualizacja UI
    setBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, end_time: newEnd } : b
    ))

    // 2. Zapis w tle do Supabase
    try {
      await blocksApi.updateBlock(supabase, blockId, { end_time: newEnd })
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
                  <DroppableDay key={day.toISOString()} day={day} isToday={isToday}>
                    <div className="relative bg-white h-[1920px]">
                      {HOURS.map(hour => (
                        <div key={hour} className="h-20 border-b border-gray-100 box-border pointer-events-none"></div>
                      ))}
                      
                      {dayBlocks.map(block => (
                        <DraggableBlock 
                          key={block.id} 
                          block={block} 
                          style={getBlockPosition(block.start_time, block.end_time)} 
                          onResizeEnd={handleResizeEnd}
                          onClick={() => setSelectedBlock(block)} // <--- DODAJ TO (musisz też dodać ten prop do DraggableBlock.tsx)
                        />
                      ))}
                    </div>
                  </DroppableDay>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {selectedBlock && (
          <BlockModal 
            block={selectedBlock}
            onClose={() => setSelectedBlock(null)}
            onUpdate={handleUpdateBlockDetails}
            onDelete={handleDeleteBlock}
          />
        )}
    </DndContext>
  )
}