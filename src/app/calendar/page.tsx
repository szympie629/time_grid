import CalendarGrid from '@/components/calendar/CalendarGrid'
import { createClient } from '@/lib/supabase/server'
import { blocksApi, type Block } from '@/lib/api/blocks'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  let blocks: Block[] = []
  try {
    blocks = await blocksApi.getBlocks(
      supabase, 
      user.id, 
      '2024-01-01T00:00:00Z', 
      '2060-01-01T00:00:00Z'
    )
  } catch (error) {
    console.error("Błąd pobierania bloków:", error)
  }

  return (
    // Główny kontener z tłem i marginesem wewnętrznym
    <main className="h-screen w-full overflow-hidden flex p-4 gap-4 bg-gray-100 dark:bg-black transition-colors font-sans">
      
      {/* Lewy Panel - Zaokrąglona karta */}
      <aside className="w-[25%] min-w-[300px] h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Inbox</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
               <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Sugestia</p>
               <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">Przeciągnij zadania tutaj, aby zaplanować dzień.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Prawy Panel (Kalendarz) - Zaokrąglona karta */}
      <section className="flex-1 h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <CalendarGrid initialBlocks={blocks} />
        </div>
      </section>
      
    </main>
  )
}