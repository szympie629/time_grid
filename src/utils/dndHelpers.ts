import { addMinutes, set } from 'date-fns'
import { toLocalISOString } from './dateHelpers'

export function calculateTimeShift(pixelsY: number): number {
  const snappedPixels = Math.round(pixelsY / 15) * 15
  return snappedPixels * 1 // 1px = 1min
}

export function getNewTimes(startTime: string, endTime: string, minutesShift: number, targetDateStr?: string) {
  // Odcinamy końcówkę strefy (np. +00:00 lub Z), by JS nie dodawał +2h
  let startObj = new Date(startTime.substring(0, 19))
  let endObj = new Date(endTime.substring(0, 19))

  // 1. Zmiana godziny (oś Y)
  startObj = addMinutes(startObj, minutesShift)
  endObj = addMinutes(endObj, minutesShift)

  // 2. Zmiana dnia (oś X) - jeśli przeciągnięto na inną kolumnę
  if (targetDateStr) {
    const [year, month, day] = targetDateStr.split('-').map(Number)
    
    // Nadpisujemy datę, ale zostawiamy wyliczoną wyżej godzinę
    startObj = set(startObj, { year, month: month - 1, date: day })
    endObj = set(endObj, { year, month: month - 1, date: day })
  }

  // 3. Formatujemy do bezpiecznego stringa i wysyłamy do bazy/stanu
  return {
    newStart: toLocalISOString(startObj),
    newEnd: toLocalISOString(endObj)
  }
}