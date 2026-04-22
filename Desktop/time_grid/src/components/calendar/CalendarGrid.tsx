'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { getWeekDays, getNextWeek, getPrevWeek } from '@/utils/dateHelpers'

// Generuje tablicę godzin ["00:00", "01:00", ..., "23:00"]
const HOURS = Array.from({ length: 24 }).map((_, i) => `${i.toString().padStart(2, '0')}:00`)

export default function CalendarGrid() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const weekDays = getWeekDays(currentDate)

  return (
    <div className="flex flex-col h-screen bg-white text-black">
      {/* NAGŁÓWEK NAWIGACYJNY */}
      <header className="flex justify-between items-center p-4 border-b shrink-0">
        <h2 className="text-xl font-bold capitalize">
          {format(weekDays[0], 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(getPrevWeek(currentDate))} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
            Poprzedni
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
            Dzisiaj
          </button>
          <button onClick={() => setCurrentDate(getNextWeek(currentDate))} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
            Następny
          </button>
        </div>
      </header>

      {/* GŁÓWNA SIATKA - POPRAWIONY SCROLL */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-[700px]">
          
          {/* Lewa oś czasu */}
          <div className="w-16 flex-none border-r bg-gray-50">
            <div className="h-14 border-b sticky top-0 bg-gray-50 z-20"></div> {/* Pusty narożnik */}
            {HOURS.map(hour => (
              <div key={hour} className="h-20 text-xs text-right pr-2 pt-2 border-b text-gray-400">
                {hour}
              </div>
            ))}
          </div>

          {/* 7 Kolumn dni tygodnia */}
          <div className="flex-1 flex">
            {weekDays.map((day) => {
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

              return (
                <div key={day.toISOString()} className="flex-1 border-r relative">
                  {/* Nagłówek pojedynczego dnia */}
                  <div className={`h-14 border-b flex flex-col items-center justify-center sticky top-0 z-10 bg-white ${isToday ? 'bg-blue-50' : ''}`}>
                    <span className={`text-xs ${isToday ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                      {format(day, 'EEE')}
                    </span>
                    <span className={`text-lg ${isToday ? 'text-blue-600 font-bold' : 'text-gray-900 font-semibold'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Siatka rzędów dla danego dnia */}
                  <div className="relative bg-white">
                    {HOURS.map(hour => (
                      <div key={hour} className="h-20 border-b border-gray-100"></div>
                    ))}
                    {/* TUTAJ W PRZYSZŁOŚCI BĘDZIEMY RYSOWAĆ BLOKI */}
                  </div>
                </div>
              )
            })}
          </div>
          
        </div>
      </div>
    </div>
  )
}