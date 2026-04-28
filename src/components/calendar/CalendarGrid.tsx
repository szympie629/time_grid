'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Block, blocksApi } from '@/lib/api/blocks'
import { supabase } from '@/lib/supabase/client'
import DraggableBlock from './DraggableBlock'
import DroppableDay from './DroppableDay'
import BlockModal from './BlockModal'
import { useRouter } from 'next/navigation'
import { getWeekDays, getNextWeek, getPrevWeek, toLocalISOString } from '@/utils/dateHelpers'

const HOURS = Array.from({ length: 24 }).map((_, i) => `${i.toString().padStart(2, '0')}:00`)

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

interface CalendarGridProps {
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  recentlyDroppedId?: string | null; // NOWE - ID ostatnio upuszczonego bloku, aby wywołać efekt wizualny
}

export default function CalendarGrid({ blocks, setBlocks, recentlyDroppedId }: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [draftBlock, setDraftBlock] = useState<Block | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  const weekDays = getWeekDays(currentDate)
  const router = useRouter()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 560 
    }
    const stored = localStorage.getItem('theme') || 'light'
    setTheme(stored as 'light' | 'dark')
    if (stored === 'dark') document.documentElement.classList.add('dark')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  /*const handleCreateBlockFromGrid = async (day: Date, hourString: string) => {
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
  }*/

    const handleCreateBlockFromGrid = async (day: Date, hourString: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert("Brak sesji!")

    const [hours, minutes] = hourString.split(':').map(Number)
    const start = new Date(day)
    start.setHours(hours, minutes, 0, 0)
    
    const end = new Date(start)
    end.setHours(hours + 1, minutes, 0, 0)

    // Tworzymy jedynie lokalny obiekt szkicu z fikcyjnym ID
    const draft: Block = {
      id: 'draft',
      user_id: user.id,
      title: 'Nowe zadanie',
      description: '',
      start_time: toLocalISOString(start),
      end_time: toLocalISOString(end),
      color_tag: '#3b82f6',
      created_at: new Date().toISOString(),
      is_completed: false, // <-- DODANE
      is_deleted: false    // <-- DODANE
    }
    setDraftBlock(draft)
  }

  const handleSaveDraft = async (_id: string, updates: any) => {
    if (!draftBlock) return
    try {
      const dataToInsert = { ...draftBlock, ...updates }
      delete dataToInsert.id // Usuwamy 'draft'
      delete dataToInsert.created_at

      const newBlock = await blocksApi.createBlock(supabase, dataToInsert)
      setBlocks(prev => [...prev, newBlock])
      setDraftBlock(null)
    } catch (error) {
      console.error(error)
      alert("Błąd zapisu bloku")
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
    const startObj = new Date(block.start_time.substring(0, 19))
    const newEnd = toLocalISOString(new Date(startObj.getTime() + durationMinutes * 60000))

    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, end_time: newEnd } : b))
    try {
      await blocksApi.updateBlock(supabase, blockId, { end_time: newEnd })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-black dark:text-slate-100 transition-colors">
        <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold capitalize">{format(weekDays[0], 'MMMM yyyy')}</h2>
          <div className="flex gap-2 items-center">
            <button onClick={toggleTheme} className="px-3 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors rounded text-sm font-medium flex items-center justify-center border border-transparent dark:border-slate-700">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 font-bold rounded text-sm transition-colors ml-4">Wyloguj</button>
            <button onClick={() => setCurrentDate(getPrevWeek(currentDate))} className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-sm font-medium transition-colors">Poprzedni</button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-sm font-medium transition-colors">Dzisiaj</button>
            <button onClick={() => setCurrentDate(getNextWeek(currentDate))} className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-sm font-medium transition-colors">Następny</button>
          </div>
        </header>

        <div ref={scrollContainerRef} className="flex-1 overflow-auto no-scrollbar">
          <div className="flex min-w-[700px]">
            <div className="w-16 flex-none border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 transition-colors">
              <div className="h-14 border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-gray-50 dark:bg-slate-900/50 z-30 transition-colors"></div>
              {HOURS.map(hour => (
                <div key={hour} className="h-20 text-xs text-right pr-2 pt-2 border-b border-gray-200 dark:border-slate-800 text-gray-400 dark:text-slate-500 box-border transition-colors">{hour}</div>
              ))}
            </div>

            <div className="flex-1 flex">
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const isToday = dateKey === format(new Date(), 'yyyy-MM-dd')
                const dayBlocks = blocks.filter(b => b.start_time.startsWith(dateKey))

                const blocksWithLayout = dayBlocks.map(block => {
                  const start = new Date(block.start_time.substring(0, 19)).getTime()
                  const end = new Date(block.end_time.substring(0, 19)).getTime()
                  const duration = end - start

                  const overlappingBigger = dayBlocks.filter(other => {
                    if (other.id === block.id) return false
                    const oStart = new Date(other.start_time.substring(0, 19)).getTime()
                    const oEnd = new Date(other.end_time.substring(0, 19)).getTime()
                    const oDuration = oEnd - oStart

                    if (!(start < oEnd && end > oStart)) return false

                    if (oDuration > duration) return true
                    if (oDuration === duration && oStart < start) return true
                    if (oDuration === duration && oStart === start && other.id < block.id) return true
                    return false
                  })

                  return { ...block, duration, overlapLevel: overlappingBigger.length }
                })
                
                blocksWithLayout.sort((a, b) => b.duration - a.duration)

                return (
                  <DroppableDay key={dateKey} day={day} isToday={isToday}>
                    <div className="relative bg-white dark:bg-slate-950 h-[1920px] transition-colors">
                      {HOURS.map(hour => (
                        <div key={hour} onClick={() => handleCreateBlockFromGrid(day, hour)} className="h-20 border-b border-gray-100 dark:border-slate-800 box-border group hover:bg-blue-50/50 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-center transition-colors">
                          <span className="opacity-0 group-hover:opacity-100 text-blue-400 dark:text-blue-500 font-bold text-xl">+</span>
                        </div>
                      ))}
                      
                      {blocksWithLayout.map(block => {
                        const baseStyle = getBlockPosition(block.start_time, block.end_time)
                        const leftPercent = Math.min(75, 5 + (block.overlapLevel * 8))
                        const widthPercent = Math.max(20, 95 - leftPercent)
                        
                        return (
                          <DraggableBlock 
                            key={`calendar-${block.id}`} 
                            idPrefix="calendar-"
                            block={block as Block} 
                            style={{ ...baseStyle, width: `${widthPercent}%`, left: `${leftPercent}%` }} 
                            onResizeEnd={handleResizeEnd}
                            onClick={(id) => setSelectedBlockId(id)}
                            onDelete={handleDeleteBlock}
                            onUpdate={handleUpdateBlockDetails}
                            recentlyDroppedId={recentlyDroppedId} // NOWE
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
      {/* NOWE: Modal dla szkicu */}
      {draftBlock && (
        <BlockModal 
          block={draftBlock} 
          onClose={() => setDraftBlock(null)}
          onUpdate={handleSaveDraft}
          onDelete={() => setDraftBlock(null)}
        />
      )}
    </>
  )
}