'use client'

import { useState } from 'react'
import { Block } from '@/lib/api/blocks'

interface Props {
  block: Block
  onClose: () => void
  onUpdate: (id: string, updates: any) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function BlockModal({ block, onClose, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(block.title)
  const [description, setDescription] = useState(block.description || '')

  const handleSave = () => {
    onUpdate(block.id, { title, description })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg text-black">Edytuj blok</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-2xl">&times;</button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tytuł</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full border rounded-md p-2 text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Opis</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full border rounded-md p-2 text-black bg-gray-50 h-24 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex justify-between">
          <button 
            onClick={() => { if(confirm('Usunąć ten blok?')) onDelete(block.id) }}
            className="text-red-600 hover:text-red-800 text-sm font-bold"
          >
            USUŃ BLOK
          </button>
          <div className="space-x-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 font-medium">Anuluj</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold">Zapisz</button>
          </div>
        </div>
      </div>
    </div>
  )
}