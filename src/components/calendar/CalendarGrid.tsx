'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Block, blocksApi } from '@/lib/api/blocks'
import { Category } from '@/lib/api/categories'
import { supabase } from '@/lib/supabase/client'
import DraggableBlock from './DraggableBlock'
import DroppableDay from './DroppableDay'
import BlockModal from './BlockModal'
import { useRouter } from 'next/navigation'
import { getWeekDays, getNextWeek, getPrevWeek, toLocalISOString } from '@/utils/dateHelpers'
import { tasksApi } from '@/lib/api/tasks'

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
  recentlyDroppedId?: string | null;
  categories?: Category[];
}

export default function CalendarGrid({ blocks, setBlocks, recentlyDroppedId, categories = [] }: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [draftBlock, setDraftBlock] = useState<Block | null>(null)
  const [copiedBlock, setCopiedBlock] = useState<Block | null>(null)
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

  const handleCreateBlockFromGrid = async (day: Date, hourString: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert("Brak sesji!")

    const [hours, minutes] = hourString.split(':').map(Number)
    const start = new Date(day)
    start.setHours(hours, minutes, 0, 0)

    if (copiedBlock && copiedBlock.start_time && copiedBlock.end_time) {
      const copiedStart = new Date(copiedBlock.start_time).getTime()
      const copiedEnd = new Date(copiedBlock.end_time).getTime()
      const end = new Date(start.getTime() + (copiedEnd - copiedStart))

      const newBlock = await blocksApi.createBlock(supabase, {
        user_id: user.id,
        title: copiedBlock.title,
        description: copiedBlock.description,
        category_id: copiedBlock.category_id,
        color_tag: null,
        start_time: toLocalISOString(start),
        end_time: toLocalISOString(end),
      })

      const originalTasks = await tasksApi.getTasks(supabase, copiedBlock.id)
      for (const task of originalTasks) {
        await tasksApi.createTask(supabase, newBlock.id, task.title)
      }

      setBlocks(prev => [...prev, newBlock])
      return
    }

    const end = new Date(start)
    end.setHours(hours + 1, minutes, 0, 0)

    const draft: Block = {
      id: 'draft',
      user_id: user.id,
      title: 'Nowe zadanie',
      description: '',
      start_time: toLocalISOString(start),
      end_time: toLocalISOString(end),
      color_tag: null,
      category_id: null,
      created_at: new Date().toISOString(),
      duration_minutes: 60,
      is_completed: false,
      is_deleted: false
    }
    setDraftBlock(draft)
  }

  const handleSaveDraft = async (_id: string, updates: any) => {
    if (!draftBlock) return
    try {
      const dataToInsert = { ...draftBlock, ...updates }
      delete dataToInsert.id
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
    if (!block || !block.start_time) return

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
            <button onClick={toggleTheme} title={theme === 'light' ? 'Tryb ciemny' : 'Tryb jasny'} className="w-9 h-9 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors rounded-lg flex items-center justify-center border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 shadow-sm">
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              )}
            </button>
            <div className="flex bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm ml-2 overflow-hidden">
              <button onClick={() => setCurrentDate(getPrevWeek(currentDate))} title="Poprzedni tydzień" className="w-9 h-9 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300 transition-colors border-r border-gray-200 dark:border-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button onClick={() => setCurrentDate(new Date())} title="Dzisiaj" className="w-9 h-9 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300 transition-colors border-r border-gray-200 dark:border-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </button>
              <button onClick={() => setCurrentDate(getNextWeek(currentDate))} title="Następny tydzień" className="w-9 h-9 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
            <button onClick={handleLogout} title="Wyloguj się" className="w-9 h-9 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/50 transition-colors rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
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
                
                const dayBlocks = blocks.filter(b => b.start_time?.startsWith(dateKey))
                if (draftBlock && draftBlock.start_time?.startsWith(dateKey)) {
                  dayBlocks.push(draftBlock)
                }

                const blocksWithLayout = dayBlocks.map(block => {
                  const start = new Date(block.start_time!.substring(0, 19)).getTime()
                  const end = new Date(block.end_time!.substring(0, 19)).getTime()
                  const duration = end - start

                  const overlappingBigger = dayBlocks.filter(other => {
                    if (other.id === block.id) return false
                    const oStart = new Date(other.start_time!.substring(0, 19)).getTime()
                    const oEnd = new Date(other.end_time!.substring(0, 19)).getTime()
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
                        const baseStyle = getBlockPosition(block.start_time!, block.end_time!)
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
                            recentlyDroppedId={recentlyDroppedId}
                            onCopy={setCopiedBlock}
                            isCopyMode={!!copiedBlock} // <-- DODAJ TĄ LINIJKĘ
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
          categories={categories}
          onClose={() => setSelectedBlockId(null)}
          onUpdate={handleUpdateBlockDetails}
          onDelete={handleDeleteBlock}
          onCopy={(blockData) => setCopiedBlock(blockData)}
        />
      )}
      
      {draftBlock && (
        <BlockModal 
          block={draftBlock} 
          categories={categories}
          onClose={() => setDraftBlock(null)}
          onUpdate={handleSaveDraft}
          onDelete={() => setDraftBlock(null)}
        />
      )}

      {copiedBlock && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-[200] border-2 border-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>
          <span className="font-semibold text-sm">Malujesz: {copiedBlock.title}</span>
          <button 
            onClick={() => setCopiedBlock(null)} 
            className="bg-indigo-800 px-3 py-1 rounded-full hover:bg-indigo-900 transition-colors text-xs font-bold"
          >
            Zakończ
          </button>
        </div>
      )}
    </>
  )
}