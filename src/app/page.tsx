import CalendarGrid from '@/components/calendar/CalendarGrid'
import { createClient } from '@/lib/supabase/server'
import { blocksApi, type Block } from '@/lib/api/blocks'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await createClient()
  
  // 1. Serwer upewnia się, że użytkownik jest zalogowany
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  let blocks: Block[] = []

  try {
    // 2. Pobieramy bloki podając konkretne ID użytkownika
    blocks = await blocksApi.getBlocks(
      supabase, 
      user.id, 
      '2024-01-01T00:00:00Z', 
      '2060-01-01T00:00:00Z'
    )
  } catch (error) {
    console.error("Błąd pobierania bloków na serwerze:", error)
  }

  return (
    // Główny kontener blokujący scroll całej strony
    <main className="h-screen w-full overflow-hidden flex bg-white dark:bg-slate-950 transition-colors">
      
      {/* Lewy Panel (Inbox / Narzędzia) - 30% szerokości */}
      <aside className="w-[30%] min-w-[300px] h-full overflow-y-auto border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Inbox</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Miejsce na widgety, luźne zadania i gotowe pakiety (Etap 3).
          </p>
        </div>
      </aside>

      {/* Prawy Panel (Kalendarz) - 70% szerokości */}
      <section className="flex-1 h-full overflow-y-auto relative bg-white dark:bg-slate-950">
        <CalendarGrid initialBlocks={blocks} />
      </section>
      
    </main>
  )
}