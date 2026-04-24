import { useState, useRef, useEffect } from 'react'
import { Block } from '@/lib/api/blocks'

interface Props {
  block: Block
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Block>) => void
  onDelete: (id: string) => void
}

export default function BlockModal({ block, onClose, onUpdate, onDelete }: Props) {
  // --- Stany formularza ---
  const [title, setTitle] = useState(block.title)
  const [description, setDescription] = useState(block.description || '')
  const [activeTab, setActiveTab] = useState('main')
  const [date, setDate] = useState(block.start_time.split('T')[0])
  const [startTime, setStartTime] = useState(block.start_time.split('T')[1].substring(0, 5))
  const [endTime, setEndTime] = useState(block.end_time.split('T')[1].substring(0, 5))
  const [colorTag, setColorTag] = useState(block.color_tag || '#3b82f6')

  // --- Konfiguracja zakładek ---
  const tabs = [
    { id: 'main', label: 'Główne' },
    { id: 'todo', label: 'To-Do' },
    { id: 'notes', label: 'Notatki' },
    { id: 'resources', label: 'Zasoby' },
    { id: 'focus', label: 'Skupienie' }
  ]

  // --- Logika przesuwania okna (Draggable) ---
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null)

  useEffect(() => {
    setPosition({ x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 250 })
    setIsMounted(true)
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, initX: position.x, initY: position.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPosition({ x: dragRef.current.initX + dx, y: Math.max(0, dragRef.current.initY + dy) })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      dragRef.current = null
    }
  }

  const handleSave = () => {
    onUpdate(block.id, { 
      title, 
      description,
      start_time: `${date}T${startTime}:00`,
      end_time: `${date}T${endTime}:00`,
      color_tag: colorTag
    })
    onClose()
  }

  if (!isMounted) return null

  return (
    <div 
      className="fixed z-[100] bg-white p-6 rounded-lg w-[400px] shadow-2xl flex flex-col gap-4 text-black border border-gray-200"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* Nagłówek - Uchwyt do przesuwania */}
      <div 
        className="flex justify-between items-center border-b pb-2 cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <h2 className="text-xl font-bold select-none">Edytuj blok</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-black font-bold p-1">✕</button>
      </div>

      {/* Nawigacja Zakładek */}
      <div className="flex border-b border-gray-100 mb-2 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Treść Zakładki: Główne */}
      {activeTab === 'main' && (
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[400px] pr-1">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Tytuł zadania</label>
            <input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="border border-gray-200 p-2 rounded text-sm focus:border-blue-500 outline-none" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Data</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="border border-gray-200 p-2 rounded text-sm outline-none" 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Kolor</label>
              <div className="flex gap-2 items-center h-full">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(c => (
                  <button 
                    key={c} 
                    onClick={() => setColorTag(c)}
                    className={`w-6 h-6 rounded-full border-2 ${colorTag === c ? 'border-black' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Start</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={e => setStartTime(e.target.value)} 
                className="border border-gray-200 p-2 rounded text-sm outline-none" 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Koniec</label>
              <input 
                type="time" 
                value={endTime} 
                onChange={e => setEndTime(e.target.value)} 
                className="border border-gray-200 p-2 rounded text-sm outline-none" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Opis</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="border border-gray-200 p-2 rounded h-20 resize-none text-sm outline-none" 
            />
          </div>
        </div>
      )}

      {/* Treść pozostałych zakładek (Placeholder) */}
      {activeTab !== 'main' && (
        <div className="py-10 text-center text-gray-400 text-sm italic h-[300px] flex items-center justify-center">
          Sekcja {tabs.find(t => t.id === activeTab)?.label} będzie dostępna wkrótce...
        </div>
      )}

      {/* Stopka z przyciskami */}
      <div className="flex justify-between mt-4 border-t pt-4">
        <button 
          onClick={() => {
            if (confirm('Na pewno chcesz trwale usunąć ten blok?')) {
              onDelete(block.id)
            }
          }} 
          className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium transition-colors text-sm"
        >
          Usuń blok
        </button>
        
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors text-sm">
            Anuluj
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium text-sm">
            Zapisz
          </button>
        </div>
      </div>
    </div>
  )
}