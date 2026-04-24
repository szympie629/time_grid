import { startOfWeek, addDays, subWeeks, addWeeks } from 'date-fns'

// Zwraca tablicę 7 obiektów Date dla podanego tygodnia (zaczynając od poniedziałku)
export function getWeekDays(baseDate: Date = new Date()): Date[] {
  // weekStartsOn: 1 wymusza start tygodnia w poniedziałek (domyślnie w USA jest niedziela)
  const start = startOfWeek(baseDate, { weekStartsOn: 1 }) 
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i))
}

// Funkcje do przycisków "Poprzedni / Następny tydzień"
export function getNextWeek(date: Date): Date {
  return addWeeks(date, 1)
}

export function getPrevWeek(date: Date): Date {
  return subWeeks(date, 1)
}

export function toLocalISOString(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

export function toISO(date: Date) {
  return date.toISOString()
}