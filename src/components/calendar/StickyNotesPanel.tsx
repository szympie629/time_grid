'use client'

import { Tooltip } from '../ui/Tooltip'

export default function StickyNotesPanel() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h3 className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Sticky Notes</h3>
        <Tooltip content="Tablica kontekstowa. Miejsce na główne cele tygodnia, linki lub przypomnienia, które chcesz mieć zawsze na widoku.">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </Tooltip>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center opacity-40">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-gray-400 dark:text-slate-600">
          <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
          <polyline points="15 3 15 9 21 9" />
        </svg>
        <p className="text-xs font-medium text-gray-500 dark:text-slate-500">Brak notatek</p>
        <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-1">Wkrótce...</p>
      </div>
    </div>
  )
}