'use client'

import { useEffect, useState } from 'react'
import { Block, blocksApi } from '@/lib/api/blocks'
import { supabase } from '@/lib/supabase/client'

interface Props {
  isOpen: boolean
  onClose: () => void
  onRestore: (block: Block) => void  // dodaj
}

export default function TrashPanel({ isOpen, onClose, onRestore }: Props) {
  const [deletedBlocks, setDeletedBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    blocksApi.getDeletedBlocks(supabase).then(blocks => {
      setDeletedBlocks(blocks)
      setLoading(false)
    })
  }, [isOpen])

  const handleRestore = async (block: Block) => {
    await blocksApi.updateBlock(supabase, block.id, { is_deleted: false })
    setDeletedBlocks(prev => prev.filter(b => b.id !== block.id))
    onRestore(block)  // dodaj
  }

  const handleHardDelete = async (id: string) => {
    await blocksApi.hardDeleteBlock(supabase, id)
    setDeletedBlocks(prev => prev.filter(b => b.id !== id))
  }

  const handleEmptyTrash = async () => {
    if (!confirm('Trwale usunąć wszystkie elementy z kosza?')) return
    await Promise.all(deletedBlocks.map(b => blocksApi.hardDeleteBlock(supabase, b.id)))
    setDeletedBlocks([])
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[150]"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className="fixed bottom-20 right-6 z-[160] w-80 h-[380px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden"
        style={{
            transition: 'opacity 200ms ease, transform 200ms ease',
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? 'translateY(0)' : 'translateY(10px)',
            pointerEvents: isOpen ? 'auto' : 'none',
        }}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-slate-400">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            <span className="font-bold text-sm text-gray-800 dark:text-slate-100">Kosz</span>
            {deletedBlocks.length > 0 && (
              <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                {deletedBlocks.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
          {loading && deletedBlocks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-400 rounded-full animate-spin dark:border-slate-700 dark:border-t-slate-400"></div>
            </div>
          ) : deletedBlocks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-slate-600">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              <p className="text-xs text-gray-400 dark:text-slate-500">Kosz jest pusty</p>
            </div>
          ) : (
            <ul className="p-2 flex flex-col gap-1">
              {deletedBlocks.map(block => (
                <li
                  key={block.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group"
                >
                  {/* Pasek koloru */}
                  <div
                    className="w-1 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: block.color_tag || '#3b82f6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-slate-200 truncate">{block.title}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">
                      {block.start_time
                        ? new Date(block.start_time).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
                        : 'Backlog'}
                    </p>
                  </div>
                  {/* Akcje */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleRestore(block)}
                      title="Przywróć"
                      className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleHardDelete(block.id)}
                      title="Usuń trwale"
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t border-gray-100 dark:border-slate-800 transition-opacity duration-300 ${deletedBlocks.length > 0 && !loading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button
            onClick={handleEmptyTrash}
            className="w-full text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-400 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Opróżnij kosz
          </button>
        </div>
      </div>
    </>
  )
}