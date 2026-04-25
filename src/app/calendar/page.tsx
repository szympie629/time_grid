'use client' // PanelGroup wymaga komponentu klienckiego

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import CalendarGrid from '@/components/calendar/CalendarGrid'
import { blocksApi, type Block } from '@/lib/api/blocks'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function CalendarPage() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)

  // Pobieranie danych po stronie klienta (dla uproszczenia przy PanelGroup)
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const data = await blocksApi.getBlocks(supabase, user.id, '2024-01-01', '2060-01-01')
        setBlocks(data)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return null

  return (
    <main className="h-screen w-full overflow-hidden bg-gray-100 dark:bg-black p-4 transition-colors">
      <PanelGroup direction="horizontal">
        
        {/* Lewy Panel - Inbox */}
        <Panel defaultSize={25} minSize={20}>
          <aside className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Inbox</h2>
              <div className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-bold">Zadania</p>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">Tu pojawią się pakiety rytuałów.</p>
              </div>
            </div>
          </aside>
        </Panel>

        {/* Suwak (Resize Handle) */}
        <PanelResizeHandle className="w-2 group transition-all duration-300 flex items-center justify-center">
          <div className="w-1 h-12 rounded-full bg-gray-300 dark:bg-slate-800 group-hover:bg-blue-500 group-active:bg-blue-600 transition-colors" />
        </PanelResizeHandle>

        {/* Prawy Panel - Kalendarz */}
        <Panel minSize={30}>
          <section className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden relative">
            {/* USUNIĘTO overflow-y-auto STĄD - CalendarGrid zajmie się scrollem */}
            <CalendarGrid initialBlocks={blocks} />
          </section>
        </Panel>

      </PanelGroup>
    </main>
  )
}