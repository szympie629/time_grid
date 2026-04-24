import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Dopasuj wszystkie ścieżki poza:
     * - _next/static (pliki statyczne)
     * - _next/image (obrazy)
     * - favicon.ico (ikona)
     * - public (pliki publiczne, np. logotypy)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}