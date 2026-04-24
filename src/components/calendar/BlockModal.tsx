import { useState, useRef, useEffect } from 'react'
import { Block } from '@/lib/api/blocks'

interface Props {
  block: Block
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Block>) => void
  onDelete: (id: string) => void
}

export default function BlockModal({ block, onClose, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(block.title)
  const [description, setDescription] = useState(block.description || '')

  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null)

  useEffect(() => {
    // Ustawia modal na środku ekranu przy pierwszym otwarciu
    setPosition({ x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 200 })
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

  if (!isMounted) return null

  const handleSave = () => {
    onUpdate(block.id, { title, description })
    onClose()
  }

  return (
    return (
      <div 
        className="fixed z-[100] bg-white p-6 rounded-lg w-[400px] shadow-2xl flex flex-col gap-4 text-black border border-gray-200"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <div 
          className="flex justify-between items-center border-b pb-2 cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <h2 className="text-xl font-bold select-none">Edytuj blok</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black font-bold p-1">✕</button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-600">Tytuł</label>
          <input 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            className="border border-gray-300 p-2 rounded focus:outline-none focus:border-blue-500"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-600">Opis</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            className="border border-gray-300 p-2 rounded h-24 resize-none focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex justify-between mt-4">
          <button 
            onClick={() => {
              if (confirm('Na pewno chcesz trwale usunąć ten blok?')) {
                onDelete(block.id)
              }
            }} 
            className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium transition-colors"
          >
            Usuń blok
          </button>
          
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
              Anuluj
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium">
              Zapisz
            </button>
          </div>
        </div>
    </div>
  )
}