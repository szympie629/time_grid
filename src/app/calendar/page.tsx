'use client'

import { Panel, Group, Separator } from "react-resizable-panels"
import CalendarGrid from '@/components/calendar/CalendarGrid'
import { blocksApi, type Block } from '@/lib/api/blocks'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function CalendarPage() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
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
    // overflow-hidden i flex utrzymują ramy okna w ryzach
    <main className="h-screen w-full flex overflow-hidden bg-gray-100 dark:bg-black p-4 transition-colors">
      <Group orientation="horizontal" autoSaveId="calendar-layout">
        
        {/* Lewy Panel */}
        {/* W v4 domyślne wielkości to stringi (np. "25%"), liczby są traktowane jako piksele */}
        <Panel defaultSize="25%" minSize="15%">
          <aside className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
             <div className="flex-1 overflow-y-auto p-6 min-h-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Inbox</h2>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                  <p className="text-sm text-gray-600 dark:text-slate-300">Tu będą pakiety zadań.</p>
                </div>
             </div>
          </aside>
        </Panel>

        {/* Poprawiony Separator (dawniej PanelResizeHandle) - większy hit-area (w-4) dla łatwiejszego chwytania */}
        <Separator className="w-4 mx-1 group flex items-center justify-center cursor-col-resize">
          <div className="w-1 h-16 rounded-full bg-gray-300 dark:bg-slate-800 group-hover:bg-blue-500 group-active:bg-blue-600 transition-colors" />
        </Separator>

        {/* Prawy Panel - Kalendarz */}
        <Panel minSize="40%">
          <section className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
            {/* Dodajemy kontener ograniczający, żeby wewnętrzny scroll z CalendarGrid działał poprawnie */}
            <div className="flex-1 overflow-hidden min-h-0 relative">
              <CalendarGrid initialBlocks={blocks} />
            </div>
          </section>
        </Panel>

      </Group>
    </main>
  )
}