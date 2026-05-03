'use client'

export default function StickyNotesPanel() {
  return (
    <div className="flex flex-col h-full items-center justify-center opacity-40">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-gray-400 dark:text-slate-600">
        <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/>
        <polyline points="15 3 15 9 21 9"/>
      </svg>
      <p className="text-xs text-gray-500 dark:text-slate-500 font-medium">Sticky Notes</p>
      <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-1">Wkrótce...</p>
    </div>
  )
}
