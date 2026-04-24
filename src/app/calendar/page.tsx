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
    // Dodajemy 'T00:00:00Z', żeby zapobiec błędom formatowania daty w Postgresie
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
    <main>
      <CalendarGrid initialBlocks={blocks} />
    </main>
  )
}