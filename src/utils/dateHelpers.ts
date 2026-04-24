import { startOfWeek, addDays, subWeeks, addWeeks, format } from 'date-fns'

export function getWeekDays(baseDate: Date = new Date()): Date[] {
  const start = startOfWeek(baseDate, { weekStartsOn: 1 }) 
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i))
}

export function getNextWeek(date: Date): Date {
  return addWeeks(date, 1)
}

export function getPrevWeek(date: Date): Date {
  return subWeeks(date, 1)
}

// Sztywny format daty dla Supabase (bez strefy czasowej)
export function toLocalISOString(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm:00")
}