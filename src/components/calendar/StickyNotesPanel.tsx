'use client'

export default function StickyNotesPanel() {
  return (
    <div className="flex flex-col h-full items-center justify-center">
      <div className="flex flex-col items-center opacity-40">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-gray-400 dark:text-slate-600">
          <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
          <polyline points="15 3 15 9 21 9" />
        </svg>
      </div>

      <div className="flex items-center gap-1.5 pointer-events-auto">
        <p className="text-xs text-gray-500 dark:text-slate-500 font-medium">Sticky Notes</p>
        <div className="group relative flex items-center z-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] rounded shadow-xl z-50 font-normal normal-case tracking-normal text-center">
            Tablica kontekstowa. Miejsce na główne cele tygodnia, linki lub przypomnienia, które chcesz mieć zawsze na widoku.
            <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-1 opacity-40">Wkrótce...</p>
    </div>
  )
}