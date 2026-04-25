'use client'

import { useState, useRef, useEffect } from 'react'
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

// Funkcja oblicza pozycję kafelka bez użycia obiektu Date (odporna na strefy czasowe)
function getBlockPosition(startTime: string, endTime: string) {
  const startT = startTime.split('T')[1]
  const endT = endTime.split('T')[1]

  const [sHours, sMinutes] = startT.split(':').map(Number)
  const [eHours, eMinutes] = endT.split(':').map(Number)

  const startDecimal = sHours + sMinutes / 60
  const endDecimal = eHours + eMinutes / 60
  const duration = endDecimal - startDecimal

  return {
    top: `${startDecimal * 80}px`,
    height: `${duration * 80}px`,
  }
}

export default function CalendarGrid({ initialBlocks }: { initialBlocks: Block[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const weekDays = getWeekDays(currentDate)
  const router = useRouter()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 560 // 7:00 (7 * 80px)
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event
    if (!over || (delta.x === 0 && delta.y === 0)) return

    const blockId = active.id as string
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    const minutesShift = calculateTimeShift(delta.y)
    const targetDateStr = over.id as string // ID to format YYYY-MM-DD z DroppableDay

    // Nowa, czysta logika przesuwania (oś X i Y razem)
    const { newStart, newEnd } = getNewTimes(block.start_time, block.end_time, minutesShift, targetDateStr)

    if (block.start_time === newStart && block.end_time === newEnd) return

    // Optymistyczna aktualizacja UI
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
      alert("Błąd zapisu! Odśwież stronę.")
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
      console.error(error)
    }
  }

  const handleUpdateBlockDetails = async (id: string, updates: any) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    try {
      await blocksApi.updateBlock(supabase, id, updates)
    } catch (error) {
      console.error(error)
    }
  }
  
  const handleDeleteBlock = async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    setSelectedBlockId(null)
    try {
      await blocksApi.deleteBlock(supabase, id)
    } catch (error) {
      console.error(error)
    }
  }

  const handleResizeEnd = async (blockId: string, newHeightPixels: number) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    const durationMinutes = newHeightPixels * 0.75
    const startObj = new Date(block.start_time)
    const newEnd = toLocalISOString(new Date(startObj.getTime() + durationMinutes * 60000))

    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, end_time: newEnd } : b))
    try {
      await blocksApi.updateBlock(supabase, blockId, { end_time: newEnd })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen bg-white text-black">
        <header className="flex justify-between items-center p-4 border-b shrink-0">
          <h2 className="text-xl font-bold capitalize">{format(weekDays[0], 'MMMM yyyy')}</h2>
          <div className="flex gap-2 items-center">
            <button onClick={handleLogout} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded text-sm transition-colors ml-4">Wyloguj</button>
            <button onClick={() => setCurrentDate(getPrevWeek(currentDate))} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium">Poprzedni</button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium">Dzisiaj</button>
            <button onClick={() => setCurrentDate(getNextWeek(currentDate))} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium">Następny</button>
          </div>
        </header>

        <div ref={scrollContainerRef} className="flex-1 overflow-auto">
          <div className="flex min-w-[700px]">
            <div className="w-16 flex-none border-r bg-gray-50">
              <div className="h-14 border-b sticky top-0 bg-gray-50 z-20"></div>
              {HOURS.map(hour => (
                <div key={hour} className="h-20 text-xs text-right pr-2 pt-2 border-b text-gray-400 box-border">{hour}</div>
              ))}
            </div>

            <div className="flex-1 flex">
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const isToday = dateKey === format(new Date(), 'yyyy-MM-dd')
                const dayBlocks = blocks.filter(b => b.start_time.startsWith(dateKey))

                // --- LOGIKA KOLIZJI I KASKADY ---
                const blocksWithLayout = dayBlocks.map(block => {
                  const start = new Date(block.start_time).getTime()
                  const end = new Date(block.end_time).getTime()
                  const duration = end - start

                  // Liczymy bloki, które nachodzą na obecny i są DŁUŻSZE (lub zaczęły się wcześniej)
                  const overlappingBigger = dayBlocks.filter(other => {
                    if (other.id === block.id) return false
                    const oStart = new Date(other.start_time).getTime()
                    const oEnd = new Date(other.end_time).getTime()
                    const oDuration = oEnd - oStart

                    // Sprawdzenie czy w ogóle nachodzą na siebie w czasie
                    if (!(start < oEnd && end > oStart)) return false

                    // Jeśli są dłuższe -> idą pod spód
                    if (oDuration > duration) return true
                    // Jeśli trwają tyle samo, ale zaczęły się wcześniej -> pod spód
                    if (oDuration === duration && oStart < start) return true
                    // Fallback na ID
                    if (oDuration === duration && oStart === start && other.id < block.id) return true
                    return false
                  })

                  return { ...block, duration, overlapLevel: overlappingBigger.length }
                })
                
                // Sortujemy po długości malejąco (najkrótsze ładują się na końcu, więc lądują NA WIERZCHU DOM)
                blocksWithLayout.sort((a, b) => b.duration - a.duration)
                // --------------------------------

                return (
                  <DroppableDay key={dateKey} day={day} isToday={isToday}>
                    <div className="relative bg-white h-[1920px]">
                      {HOURS.map(hour => (
                        <div key={hour} onClick={() => handleCreateBlockFromGrid(day, hour)} className="h-20 border-b border-gray-100 box-border group hover:bg-blue-50/50 cursor-pointer flex items-center justify-center transition-colors">
                          <span className="opacity-0 group-hover:opacity-100 text-blue-400 font-bold text-xl">+</span>
                        </div>
                      ))}
                      
                      {blocksWithLayout.map(block => {
                        const baseStyle = getBlockPosition(block.start_time, block.end_time)
                        
                        // Kaskada: z każdym kolidującym blokiem zwężamy o 15% i przesuwamy w prawo o 15%
                        const widthPercent = Math.max(45, 90 - (block.overlapLevel * 15))
                        const leftPercent = 5 + (block.overlapLevel * 15)
                        
                        return (
                          <DraggableBlock 
                            key={block.id} 
                            block={block as Block} 
                            style={{ ...baseStyle, width: `${widthPercent}%`, left: `${leftPercent}%` }} 
                            onResizeEnd={handleResizeEnd}
                            onClick={(id) => setSelectedBlockId(id)}
                            onDelete={handleDeleteBlock}
                            onUpdate={handleUpdateBlockDetails}
                          />
                        )
                      })}
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