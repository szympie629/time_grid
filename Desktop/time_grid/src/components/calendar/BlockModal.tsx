import { useState } from 'react'
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

  const handleSave = () => {
    onUpdate(block.id, { title, description })
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" 
      onClick={onClose}
    >
      <div 
        className="bg-white p-6 rounded-lg w-[400px] shadow-xl flex flex-col gap-4 text-black"
        onClick={e => e.stopPropagation()} // Zapobiega zamknięciu przy kliknięciu w sam modal
      >
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-xl font-bold">Edytuj blok</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black font-bold">✕</button>
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
    </div>
  )
}