import { addMinutes, subMinutes } from 'date-fns'

// Przelicznik: 1 godzina = 80px. 
// Chcemy, aby blok "przyklejał" się co kwadrans (15 minut = 20px).
export function calculateTimeShift(pixelsY: number): number {
  const snappedPixels = Math.round(pixelsY / 20) * 20
  return snappedPixels * 0.75 // Zwraca przesunięcie w minutach
}

export function getNewTimes(startTime: string, endTime: string, minutesShift: number) {
  const start = new Date(startTime)
  const end = new Date(endTime)

  return {
    newStart: minutesShift >= 0 
      ? addMinutes(start, minutesShift).toISOString() 
      : subMinutes(start, Math.abs(minutesShift)).toISOString(),
    newEnd: minutesShift >= 0 
      ? addMinutes(end, minutesShift).toISOString() 
      : subMinutes(end, Math.abs(minutesShift)).toISOString(),
  }
}