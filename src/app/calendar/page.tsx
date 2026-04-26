'use client'

import { Panel, Group, Separator } from "react-resizable-panels"
import CalendarGrid from '@/components/calendar/CalendarGrid'
import DraggableBlock from '@/components/calendar/DraggableBlock'
import { blocksApi, type Block } from '@/lib/api/blocks'
import { backlogApi, type BacklogItem } from '@/lib/api/backlog'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor, useDroppable, useDraggable, defaultDropAnimationSideEffects } from '@dnd-kit/core'
import { calculateTimeShift, getNewTimes } from '@/utils/dndHelpers'

function getDurationHeight(startTime: string, endTime: string) {
  const startT = startTime.split('T')[1]
  const endT = endTime.split('T')[1]
  const [sHours, sMinutes] = startT.split(':').map(Number)
  const [eHours, eMinutes] = endT.split(':').map(Number)
  const duration = (eHours + eMinutes / 60) - (sHours + sMinutes / 60)
  return `${duration * 80}px`
}

// Kontener dla Backlogu
function DroppableBacklogContainer({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'droppable-backlog' })
  return (
    <div ref={setNodeRef} className={`flex-1 overflow-y-auto p-6 min-h-0 no-scrollbar transition-colors ${isOver ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
      {children}
    </div>
  )
}

// Pojedynczy kafelek w Backlogu
function DraggableBacklogItem({ item }: { item: BacklogItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `backlog-${item.id}`,
    data: { type: 'backlog', item }
  })
  
  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes} 
      className={`p-3 mb-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border-l-4 ${item.color_tag ? `border-[${item.color_tag}]` : 'border-blue-500'} cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${isDragging ? 'opacity-50' : ''}`}
      style={{ borderLeftColor: item.color_tag || '#3B82F6' }}
    >
      <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 block">{item.title}</span>
      <span className="text-xs text-gray-500 font-medium mt-1 block">{item.duration_minutes} min</span>
    </div>
  )
}

export default function CalendarPage() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([])
  const [loading, setLoading] = useState(true)
  
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeBlock, setActiveBlock] = useState<Block | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const refreshData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const [blocksData, backlogData] = await Promise.all([
        blocksApi.getBlocks(supabase, user.id, '2024-01-01', '2060-01-01'),
        backlogApi.getBacklog(supabase, user.id)
      ])
      setBlocks(blocksData)
      setBacklogItems(backlogData)
    }
  }, [])

  useEffect(() => {
    refreshData().finally(() => setLoading(false))
  }, [refreshData])

  const handleDragStart = (e: DragStartEvent) => {
    document.body.style.overflow = 'hidden'
    setActiveId(String(e.active.id))
    
    const data = e.active.data.current
    if (data?.type === 'calendar') {
      setActiveBlock(data.block as Block)
    } else if (data?.type === 'backlog') {
      // Tworzymy "fałszywy" Block dla nakładki DragOverlay, żeby wyglądał jak ten z kalendarza
      const item = data.item as BacklogItem
      const duration = item.duration_minutes || 60
      const dummyBlock: Block = {
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        description: item.description,
        color_tag: item.color_tag,
        start_time: `2024-01-01T09:00:00`,
        end_time: `2024-01-01T${String(9 + Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}:00`,
        is_completed: item.is_completed || false,
        created_at: item.created_at,
        is_deleted: false
      }
      setActiveBlock(dummyBlock)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    document.body.style.overflow = ''
    setActiveId(null)
    setActiveBlock(null)
    
    const { active, over, delta } = event
    if (!over) return

    const activeData = active.data.current
    const type = activeData?.type
    const overId = String(over.id)

    // CASE 1: Poruszanie czymś co już było na Kalendarzu
    if (type === 'calendar') {
      const block = activeData?.block as Block
      if (!block) return

      if (overId === 'droppable-backlog') {
        // Z Kalendarza do Backlogu
        const sTime = new Date(block.start_time).getTime()
        const eTime = new Date(block.end_time).getTime()
        const durationMin = Math.round((eTime - sTime) / 60000)

        setBlocks(prev => prev.filter(b => b.id !== block.id)) // Optimistic remove
        try {
          await backlogApi.moveToBacklog(supabase, block, durationMin)
          await refreshData()
        } catch (err) {
          alert("Błąd zapisu!")
          await refreshData()
        }
      } else if (overId.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Po siatce kalendarza (standard)
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
          alert("Błąd zapisu! Odśwież stronę.")
          await refreshData()
        }
      }
    } 
    // CASE 2: Wyciąganie z Backlogu na Kalendarz
    else if (type === 'backlog' && overId.match(/^\d{4}-\d{2}-\d{2}$/)) {
       const item = activeData?.item as BacklogItem
       if (!item) return

       // Obliczanie czasu na podstawie pozycji Y myszki względem kolumny
       const yOffset = active.rect.current.translated && over.rect ? active.rect.current.translated.top - over.rect.top : 9 * 80;
       let dropMinutes = Math.floor((yOffset / 80) * 60);
       dropMinutes = Math.max(0, Math.round(dropMinutes / 15) * 15); // snap do 15 min

       const startHours = Math.floor(dropMinutes / 60);
       const startMins = dropMinutes % 60;
       const startTime = `${overId}T${String(startHours).padStart(2, '0')}:${String(startMins).padStart(2, '0')}:00`;

       const duration = item.duration_minutes || 60;
       const endMinutesTotal = dropMinutes + duration;
       const endHours = Math.floor(endMinutesTotal / 60);
       const endMins = endMinutesTotal % 60;
       const endTime = `${overId}T${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;

       setBacklogItems(prev => prev.filter(i => i.id !== item.id)); 
       try {
         await backlogApi.moveToCalendar(supabase, item, startTime, endTime);
         await refreshData();
       } catch (err) {
         alert("Błąd zapisu!");
         await refreshData();
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
          <Panel defaultSize="25%" minSize="15%">
            <Group orientation="vertical" autoSave="left-panel-layout-v1" id="left-panel-layout" className="flex flex-col h-full">
              
              <Panel defaultSize="50%" minSize="20%">
                <aside className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
                  <DroppableBacklogContainer>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Backlog</h2>
                    <div className="flex flex-col gap-1 min-h-[100px]">
                      {backlogItems.length === 0 ? (
                        <div className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                          <p className="text-sm text-gray-600 dark:text-slate-300">Brak zadań.</p>
                        </div>
                      ) : (
                        backlogItems.map(item => (
                          <DraggableBacklogItem key={item.id} item={item} />
                        ))
                      )}
                    </div>
                  </DroppableBacklogContainer>
                </aside>
              </Panel>

              <Separator className="h-4 my-1 group flex items-center justify-center cursor-row-resize z-10">
                <div className="h-1 w-16 rounded-full bg-gray-300 dark:bg-slate-800 group-hover:bg-blue-500 group-active:bg-blue-600 transition-colors" />
              </Separator>

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

          <Panel minSize="40%">
            <section className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden min-h-0 relative">
                <CalendarGrid blocks={blocks} setBlocks={setBlocks} />
              </div>
            </section>
          </Panel>

        </Group>

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
                style={{ width: '100%', margin: 0, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                onResizeEnd={() => {}} onClick={() => {}} onDelete={() => {}} onUpdate={() => {}} 
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  )
}