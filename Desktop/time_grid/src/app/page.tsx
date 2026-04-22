import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  // Inicjalizacja klienta serwerowego
  const supabase = await createClient()
  
  // Pobranie danych aktualnie zalogowanego użytkownika
  const { data: { user }, error } = await supabase.auth.getUser()

  // Zabezpieczenie (choć middleware już nas chroni)
  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-4">Witaj w TimeGrid! 🚀</h1>
        <p className="text-lg mb-6">
          Zalogowano pomyślnie jako: <span className="font-semibold text-blue-600">{user.email}</span>
        </p>
        <p className="text-gray-500">
          Twój prywatny planer jest gotowy na przyjęcie pierwszych funkcji.
        </p>
      </div>
    </div>
  )
}