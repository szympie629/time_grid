'use client'

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import CalendarGrid from '@/components/calendar/CalendarGrid'
import { blocksApi, type Block } from '@/lib/api/blocks'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function CalendarPage() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Pobieramy szeroki zakres dat, aby kalendarz miał co wyświetlać
        const data = await blocksApi.getBlocks(supabase, user.id, '2024-01-01', '2060-01-01')
        setBlocks(data)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return null

  return (
    // overflow-hidden tutaj jest kluczowe - main nie może się scrollować
    <main className="h-screen w-full overflow-hidden bg-gray-100 dark:bg-black p-4 transition-colors">
      <PanelGroup direction="horizontal" autoSaveId="calendar-layout">
        
        {/* Lewy Panel */}
        <Panel defaultSize={25} minSize={15}>
          <aside className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
             <div className="h-full overflow-y-auto p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Inbox</h2>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                  <p className="text-sm text-gray-600 dark:text-slate-300">Tu będą pakiety zadań.</p>
                </div>
             </div>
          </aside>
        </Panel>

        {/* Poprawiony Resize Handle - większy hit-area */}
        <PanelResizeHandle className="w-2 mx-1 group flex items-center justify-center cursor-col-resize">
          <div className="w-1 h-16 rounded-full bg-gray-300 dark:bg-slate-800 group-hover:bg-blue-500 group-active:bg-blue-600 transition-colors" />
        </PanelResizeHandle>

        {/* Prawy Panel - Kalendarz */}
        <Panel minSize={40}>
          <section className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            {/* CalendarGrid sam zarządza swoim scrollem wewnątrz */}
            <CalendarGrid initialBlocks={blocks} />
          </section>
        </Panel>

      </PanelGroup>
    </main>
  )
}