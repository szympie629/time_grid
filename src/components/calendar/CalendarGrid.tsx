'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Block, blocksApi } from '@/lib/api/blocks'
import { supabase } from '@/lib/supabase/client'
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import DraggableBlock from './DraggableBlock'
import DroppableDay from './DroppableDay'
import { calculateTimeShift, getNewTimes } from '@/utils/dndHelpers'
import BlockModal from './BlockModal'
import { useRouter } from 'next/navigation'
import { getWeekDays, getNextWeek, getPrevWeek, toLocalISOString } from '@/utils/dateHelpers'

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
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const router = useRouter()

  // Funkcja wylogowująca
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Konfiguracja sensorów - 5px tolerancji
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const handleUpdateBlockDetails = async (id: string, updates: any) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    try {
      await blocksApi.updateBlock(supabase, id, updates)
    } catch (error) {
      console.error(error)
      alert("Błąd aktualizacji")
    }
  }
  
  const handleDeleteBlock = async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    setSelectedBlockId(null)
    try {
      await blocksApi.deleteBlock(supabase, id)
    } catch (error) {
      console.error(error)
      alert("Błąd usuwania")
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event
    
    if (delta.x === 0 && delta.y === 0) return 

    const blockId = active.id as string
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    const minutesShift = calculateTimeShift(delta.y)
    let { newStart, newEnd } = getNewTimes(block.start_time, block.end_time, minutesShift)

    if (over && over.id) {
      const targetDateStr = over.id as string
      const [year, month, day] = targetDateStr.split('-').map(Number)

      const startObj = new Date(newStart)
      const durationMs = new Date(newEnd).getTime() - startObj.getTime()

      startObj.setFullYear(year, month - 1, day)

      newStart = toLocalISOString(startObj)
      newEnd = toLocalISOString(new Date(startObj.getTime() + durationMs))
    }

    if (block.start_time === newStart && block.end_time === newEnd) return

    setBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, start_time: newStart, end_time: newEnd } : b
    ))

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

  const handleResizeEnd = async (blockId: string, newHeightPixels: number) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    const durationMinutes = newHeightPixels * 0.75
    
    const startObj = new Date(block.start_time)
    const newEnd = toLocalISOString(new Date(startObj.getTime() + durationMinutes * 60000))

    if (block.end_time === newEnd) return

    setBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, end_time: newEnd } : b
    ))

    try {
      await blocksApi.updateBlock(supabase, blockId, { end_time: newEnd })
    } catch (error) {
      console.error(error)
      alert("Błąd zapisu! Odśwież stronę, aby przywrócić pierwotny stan.")
    }
  }

  const handleCreateBlockFromGrid = async (day: Date, hourString: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return alert("Brak sesji!")

      const [hours, minutes] = hourString.split(':').map(Number)
      
      const start = new Date(day)
      start.setHours(hours, minutes, 0, 0)
      
      const end = new Date(start)
      end.setHours(hours + 1, minutes, 0, 0)

      const newBlock = await blocksApi.createBlock(supabase, {
        user_id: user.id,
        title: 'Nowe zadanie',
        description: '',
        start_time: toLocalISOString(start),
        end_time: toLocalISOString(end),
        color_tag: '#3b82f6',
      })
      
      setBlocks(prev => [...prev, newBlock])
      setSelectedBlockId(newBlock.id)
    } catch (error) {
      console.error("Błąd tworzenia bloku:", error)
      alert("Nie udało się utworzyć bloku.")
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen bg-white text-black">
        <header className="flex justify-between items-center p-4 border-b shrink-0">
          <h2 className="text-xl font-bold capitalize">{format(weekDays[0], 'MMMM yyyy')}</h2>
          <div className="flex gap-2 items-center">
            <button onClick={handleLogout} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded text-sm transition-colors ml-4">
              Wyloguj
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
                  <DroppableDay key={toLocalISOString(day)} day={day} isToday={isToday}>
                    <div className="relative bg-white h-[1920px]">
                      {HOURS.map(hour => (
                        <div 
                          key={hour} 
                          onClick={() => handleCreateBlockFromGrid(day, hour)}
                          className="h-20 border-b border-gray-100 box-border group hover:bg-blue-50/50 cursor-pointer flex items-center justify-center transition-colors"
                        >
                          <span className="opacity-0 group-hover:opacity-100 text-blue-400 font-bold text-xl transition-opacity">
                            +
                          </span>
                        </div>
                      ))}
                      
                      {dayBlocks.map(block => (
                        <DraggableBlock 
                          key={block.id} 
                          block={block} 
                          style={getBlockPosition(block.start_time, block.end_time)} 
                          onResizeEnd={handleResizeEnd}
                          onClick={(id) => setSelectedBlockId(id)}
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
      {selectedBlockId && (
        <BlockModal 
          block={blocks.find(b => b.id === selectedBlockId)!} 
          onClose={() => setSelectedBlockId(null)}
          onUpdate={handleUpdateBlockDetails}
          onDelete={handleDeleteBlock}
        />
      )}
    </DndContext>
  )
}