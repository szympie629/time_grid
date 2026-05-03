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
      // duration_minutes is null for calendar blocks — calculate from start/end times
      let minutes = block.duration_minutes
      if (!minutes && block.start_time && block.end_time) {
        const start = new Date(block.start_time).getTime()
        const end = new Date(block.end_time).getTime()
        minutes = Math.round((end - start) / 60000)
      }
      minutesByCategory[block.category_id] = (minutesByCategory[block.category_id] || 0) + (minutes || 0)
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
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h3 className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Budżet czasu</h3>
      </div>

      <div className="flex-1 flex flex-col gap-2 justify-start">
        {/* Kategorie z limitami — 2-column grid */}
        {withLimits.length > 0 && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {withLimits.map(cat => {
              const limit = cat.time_limit_minutes!
              const spent = minutesByCategory[cat.id] || 0
              const rawPercentage = Math.round((spent / limit) * 100)
              const isOver = spent > limit
              const barPercent = Math.min(100, rawPercentage)
              const overflowPercent = isOver ? rawPercentage - 100 : 0
              const totalScale = Math.max(100, rawPercentage)
              const limitPortionWidth = (100 / totalScale) * 100
              const overflowPortionWidth = isOver ? (overflowPercent / totalScale) * 100 : 0

              return (
                <div
                  key={cat.id}
                  className="cursor-pointer group transition-all max-w-[360px]"
                  onMouseEnter={() => onHoverCategory(cat.id)}
                  onMouseLeave={() => onHoverCategory(null)}
                  onClick={() => onEditCategory(cat)}
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-semibold text-xs text-gray-700 dark:text-slate-300 truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold ${isOver ? 'text-red-400' : 'text-gray-600 dark:text-slate-400'}`}>
                        {formatTime(spent)}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-slate-500">/ {formatTime(limit)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOver ? 'text-red-400 bg-red-500/10' : 'text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-800'}`}>
                        {rawPercentage}%
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700/50 group-hover:h-2.5 transition-all">
                    <div
                      className="h-full transition-all duration-500 rounded-l-full"
                      style={{
                        width: `${isOver ? limitPortionWidth : barPercent}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                    {isOver && (
                      <div
                        className="h-full transition-all duration-500 rounded-r-full"
                        style={{
                          width: `${overflowPortionWidth}%`,
                          backgroundColor: '#ef4444',
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.2) 3px, rgba(255,255,255,0.2) 6px)',
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {withLimits.length > 0 && withoutLimits.some(c => minutesByCategory[c.id]) && (
          <div className="h-px w-full bg-gray-200 dark:bg-slate-700/50 my-1" />
        )}

        {withoutLimits.some(c => minutesByCategory[c.id]) && (
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {withoutLimits.map(cat => {
              const spent = minutesByCategory[cat.id] || 0
              if (spent === 0) return null

              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                  onMouseEnter={() => onHoverCategory(cat.id)}
                  onMouseLeave={() => onHoverCategory(null)}
                  onClick={() => onEditCategory(cat)}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs text-gray-600 dark:text-slate-400 font-medium">{cat.name}</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{formatTime(spent)}</span>
                </div>
              )
            })}
          </div>
        )}

        {categories.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl min-h-[60px]">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Brak kategorii. Skonfiguruj je klikając w przycisk po prawej.</p>
          </div>
        )}

        {categories.length > 0 && withLimits.length === 0 && !withoutLimits.some(c => minutesByCategory[c.id]) && (
          <div className="flex-1 flex items-center justify-start opacity-50 px-2">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nie wykorzystano jeszcze czasu z kategorii w tym tygodniu.</p>
          </div>
        )}
      </div>
    </div>
  )
}
