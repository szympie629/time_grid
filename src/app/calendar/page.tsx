import CalendarGrid from '@/components/calendar/CalendarGrid'
import { createClient } from '@/lib/supabase/server'
import { blocksApi, type Block } from '@/lib/api/blocks'

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await createClient()
  
  let blocks: Block[] = []

  try {
    // Zakres dat możesz później zautomatyzować
    blocks = await blocksApi.getBlocks(supabase, '2024-01-01', '2026-01-01')
  } catch (error) {
    console.error("Błąd pobierania bloków:", error)
  }

  return (
    <main>
      <CalendarGrid initialBlocks={blocks} />
    </main>
  )
}