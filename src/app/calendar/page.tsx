'use client'

import { Panel, Group, Separator } from "react-resizable-panels"
import CalendarGrid from '@/components/calendar/CalendarGrid'
import DraggableBlock from '@/components/calendar/DraggableBlock'
import { blocksApi, type Block } from '@/lib/api/blocks'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core'
import { calculateTimeShift, getNewTimes } from '@/utils/dndHelpers'
import { defaultDropAnimationSideEffects } from '@dnd-kit/core'

function getDurationHeight(startTime: string, endTime: string) {
  const startT = startTime.split('T')[1]
  const endT = endTime.split('T')[1]
  const [sHours, sMinutes] = startT.split(':').map(Number)
  const [eHours, eMinutes] = endT.split(':').map(Number)
  const duration = (eHours + eMinutes / 60) - (sHours + sMinutes / 60)
  return `${duration * 80}px`
}

// Pomocniczy kontener do zrzucania bloków do Backlogu (Case C)
function DroppableBacklogContainer({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'droppable-backlog' })
  return (
    <div ref={setNodeRef} className={`flex-1 overflow-y-auto p-6 min-h-0 no-scrollbar transition-colors ${isOver ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
      {children}
    </div>
  )
}

export default function CalendarPage() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  
  // Stany dla Globalnego Drag & Drop
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeBlock, setActiveBlock] = useState<Block | null>(null)
  const [activeStyle, setActiveStyle] = useState<React.CSSProperties>({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const data = await blocksApi.getBlocks(supabase, user.id, '2024-01-01', '2060-01-01')
        setBlocks(data)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleDragStart = (e: DragStartEvent) => {
    document.body.style.overflow = 'hidden' // Wycinamy mikro-scrolle przy dragu
    setActiveId(String(e.active.id))
    
    // Twarde zamrożenie wymiarów w pikselach z momentu kliknięcia
    const rect = e.active.rect.current.initial
    if (rect) {
      setActiveStyle({
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
      })
    }
    
    if (e.active.data.current?.block) {
      setActiveBlock(e.active.data.current.block as Block)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    document.body.style.overflow = ''
    setActiveId(null)
    setActiveBlock(null)
    setActiveStyle({})
    
    const { active, over, delta } = event
    if (!over) return

    const activeData = active.data.current
    const block = activeData?.block as Block
    if (!block) return

    const type = activeData?.type // 'calendar', 'backlog', 'ritual'
    const overId = String(over.id)

    // Logika przemieszczania w obrębie Kalendarza
    if (type === 'calendar') {
      if (overId === 'droppable-backlog') {
        // CASE C: Kalendarz -> Backlog
        console.log("Przeniesiono do Backlogu: wyzerować daty.")
        // TODO: Update bazy danych - ustawienie start_time i end_time na null
      } else if (overId.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Przesuwanie na siatce (Istniejąca logika)
        if (delta.x === 0 && delta.y === 0) return
        
        const minutesShift = calculateTimeShift(delta.y)
        const { newStart, newEnd } = getNewTimes(block.start_time, block.end_time, minutesShift, overId)

        if (block.start_time === newStart && block.end_time === newEnd) return

        setBlocks(prev => prev.map(b => 
          b.id === block.id ? { ...b, start_time: newStart, end_time: newEnd } : b
        ))

        try {
          await blocksApi.updateBlock(supabase, block.id, { start_time: newStart, end_time: newEnd })
        } catch (error) {
          console.error(error)
          alert("Błąd zapisu! Odśwież stronę.")
        }
      }
    } 
    // Logika z Backlogu do Kalendarza
    else if (type === 'backlog' && overId.match(/^\d{4}-\d{2}-\d{2}$/)) {
       // CASE A: Backlog -> Kalendarz
       console.log(`Upuszczono z Backlogu na dzień ${overId}. Należy utworzyć/zaktualizować blok.`)
    }
    // Logika z Rytuałów do Kalendarza
    else if (type === 'ritual' && overId.match(/^\d{4}-\d{2}-\d{2}$/)) {
       // CASE B: Rytuał -> Kalendarz (Klonowanie)
       console.log(`Skopiowano Rytuał na dzień ${overId}.`)
    }
  }

  if (loading) return null

  return (
    <main className="h-screen w-full overflow-hidden bg-aurora p-4 transition-colors">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Group 
          orientation="horizontal" 
          autoSave="calendar-layout-v1" 
          id="calendar-layout"
          className="flex h-full w-full"
        >
          {/* Lewy Panel */}
          <Panel defaultSize="25%" minSize="15%">
            <Group orientation="vertical" autoSave="left-panel-layout-v1" id="left-panel-layout" className="flex flex-col h-full">
              
              {/* Backlog */}
              <Panel defaultSize="50%" minSize="20%">
                <aside className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
                  <DroppableBacklogContainer>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Backlog</h2>
                    <div className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                      <p className="text-sm text-gray-600 dark:text-slate-300">Twoje zadania do zaplanowania.</p>
                      {/* Tu wylądują Draggable elementy Backlogu */}
                    </div>
                  </DroppableBacklogContainer>
                </aside>
              </Panel>

              <Separator className="h-4 my-1 group flex items-center justify-center cursor-row-resize z-10">
                <div className="h-1 w-16 rounded-full bg-gray-300 dark:bg-slate-800 group-hover:bg-blue-500 group-active:bg-blue-600 transition-colors" />
              </Separator>

              {/* Rytuały */}
              <Panel defaultSize="50%" minSize="20%">
                <aside className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto p-6 min-h-0 no-scrollbar">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Rytuały</h2>
                    <div className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                      <p className="text-sm text-gray-600 dark:text-slate-300">Tu będą Twoje zestawy zadań.</p>
                    </div>
                  </div>
                </aside>
              </Panel>

            </Group>
          </Panel>

          <Separator className="w-4 mx-2 group flex items-center justify-center cursor-col-resize z-10">
            <div className="w-1 h-16 rounded-full bg-gray-300 dark:bg-slate-800 group-hover:bg-blue-500 group-active:bg-blue-600 transition-colors" />
          </Separator>

          {/* Prawy Panel - Kalendarz */}
          <Panel minSize="40%">
            <section className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden min-h-0 relative">
                <CalendarGrid blocks={blocks} setBlocks={setBlocks} />
              </div>
            </section>
          </Panel>

        </Group>

        {/* Globalny cień podczas przeciągania */}
        <DragOverlay 
          zIndex={1000} 
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
          }}
        >
          {activeBlock ? (
            <div className="opacity-90 scale-105 transition-transform cursor-grabbing pointer-events-none">
              <DraggableBlock 
                block={activeBlock} 
                isOverlay={true}
                style={{ 
                  width: activeStyle.width,
                  height: activeStyle.height,
                  margin: 0
                }}
                onResizeEnd={() => {}} onClick={() => {}} onDelete={() => {}} onUpdate={() => {}} 
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  )
}