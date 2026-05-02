'use client'

import { Category } from '@/lib/api/categories'
import { Block } from '@/lib/api/blocks'
import { format } from 'date-fns'

interface Props {
  blocks: Block[]
  categories: Category[]
  weekDays: Date[]
  onHoverCategory: (categoryId: string | null) => void
  onEditCategory: (cat: Category) => void
}

export default function BudgetPanel({ blocks, categories, weekDays, onHoverCategory, onEditCategory }: Props) {
  // 1. Zlicz minuty z obecnego tygodnia dla poszczególnych kategorii
  const weekDateStrings = weekDays.map(d => format(d, 'yyyy-MM-dd'))
  
  const minutesByCategory: Record<string, number> = {}
  
  blocks.forEach(block => {
    if (!block.start_time || !block.category_id || block.is_deleted) return
    const dateStr = block.start_time.substring(0, 10)
    if (weekDateStrings.includes(dateStr)) {
      minutesByCategory[block.category_id] = (minutesByCategory[block.category_id] || 0) + (block.duration_minutes || 0)
    }
  })

  // 2. Oddziel kategorie z limitami i bez limitów
  const withLimits = categories.filter(c => c.time_limit_minutes)
  const withoutLimits = categories.filter(c => !c.time_limit_minutes)

  const formatTime = (totalMinutes: number) => {
    if (!totalMinutes) return '0m'
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-x-auto no-scrollbar flex gap-4 px-2 pb-2 items-center">
        {/* Sekcja budżetów */}
        {withLimits.map(cat => {
          const limit = cat.time_limit_minutes!
          const spent = minutesByCategory[cat.id] || 0
          const percentage = Math.min(100, Math.round((spent / limit) * 100))
          const isOver = spent > limit

          return (
            <div 
              key={cat.id}
              className="min-w-[260px] max-w-[300px] h-full max-h-[100px] bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 flex flex-col justify-center shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-slate-600 transition-all group shrink-0"
              onMouseEnter={() => onHoverCategory(cat.id)}
              onMouseLeave={() => onHoverCategory(null)}
              onClick={() => onEditCategory(cat)}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="font-semibold text-sm text-gray-800 dark:text-slate-200 truncate">{cat.name}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-500 bg-gray-50 dark:bg-slate-900 px-2 py-1 rounded-md shrink-0 border border-gray-100 dark:border-slate-800">
                  {percentage}%
                </span>
              </div>

              <div className="h-2.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2 shadow-inner">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${isOver ? 'bg-red-500' : ''}`}
                  style={{ 
                    width: `${percentage}%`, 
                    backgroundColor: isOver ? undefined : cat.color,
                    backgroundImage: isOver ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.2) 5px, rgba(255,255,255,0.2) 10px)' : 'none'
                  }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-gray-500 dark:text-slate-400 mt-auto">
                <span className={isOver ? 'text-red-500 font-bold' : 'font-medium text-gray-700 dark:text-slate-300'}>
                  {formatTime(spent)}
                </span>
                <span className="opacity-70">Cel: {formatTime(limit)}</span>
              </div>
            </div>
          )
        })}

        {/* Separator jeśli są obie listy */}
        {withLimits.length > 0 && withoutLimits.some(c => minutesByCategory[c.id]) && (
          <div className="w-px h-16 bg-gray-200 dark:bg-slate-700 flex-shrink-0 mx-2" />
        )}

        {/* Sekcja bez limitu (Tylko statystyka) */}
        {withoutLimits.map(cat => {
          const spent = minutesByCategory[cat.id] || 0
          if (spent === 0) return null // Ukryj puste kategorie bez limitu

          return (
            <div 
              key={cat.id}
              className="min-w-[140px] h-[80px] flex-shrink-0 bg-white dark:bg-slate-800/80 rounded-xl border border-gray-100 dark:border-slate-700 p-3 flex flex-col justify-center shadow-sm cursor-pointer hover:shadow-md transition-all opacity-80 hover:opacity-100"
              onMouseEnter={() => onHoverCategory(cat.id)}
              onMouseLeave={() => onHoverCategory(null)}
              onClick={() => onEditCategory(cat)}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="font-medium text-xs text-gray-600 dark:text-slate-300 truncate">{cat.name}</span>
              </div>
              <span className="text-lg font-bold text-gray-800 dark:text-slate-100">{formatTime(spent)}</span>
            </div>
          )
        })}

        {categories.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl h-full min-h-[80px]">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Brak kategorii. Skonfiguruj je klikając w przycisk po prawej.</p>
          </div>
        )}
        
        {categories.length > 0 && withLimits.length === 0 && !withoutLimits.some(c => minutesByCategory[c.id]) && (
          <div className="flex-1 flex items-center justify-start opacity-50 px-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nie wykorzystano jeszcze czasu z kategorii w tym tygodniu. Kliknij przycisk kategorii z prawej, by nadać limity.</p>
          </div>
        )}
      </div>
    </div>
  )
}
