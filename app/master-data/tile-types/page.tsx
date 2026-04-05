'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { TileType } from '@/app/types/database'

export default function TileTypesPage() {
  const [tileTypes, setTileTypes] = useState<TileType[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTile, setEditingTile] = useState<TileType | null>(null)
  const [formData, setFormData] = useState({
    tile_name: '',
    size_inches: '',
    pieces_per_box: '',
    weight_per_box_kg: '',
  })

  useEffect(() => {
    loadTileTypes()
    const channel = supabase
      .channel('tile-types-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tile_types' }, loadTileTypes)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadTileTypes = async () => {
    const { data } = await supabase.from('tile_types').select('*').order('tile_name')
    setTileTypes(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...formData,
      pieces_per_box: parseInt(formData.pieces_per_box) || 0,
      weight_per_box_kg: parseFloat(formData.weight_per_box_kg) || 0,
    }
    
    if (editingTile) {
      await supabase.from('tile_types').update(payload).eq('id', editingTile.id)
    } else {
      await supabase.from('tile_types').insert(payload)
    }
    
    setShowModal(false)
    setEditingTile(null)
    setFormData({ tile_name: '', size_inches: '', pieces_per_box: '', weight_per_box_kg: '' })
    loadTileTypes()
  }

  const handleEdit = (tile: TileType) => {
    setEditingTile(tile)
    setFormData({
      tile_name: tile.tile_name,
      size_inches: tile.size_inches || '',
      pieces_per_box: tile.pieces_per_box?.toString() || '',
      weight_per_box_kg: tile.weight_per_box_kg?.toString() || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await supabase.from('tile_types').delete().eq('id', id)
      loadTileTypes()
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tile Types</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">+ Add Tile Type</button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="table-header">
            <tr>
              <th className="px-6 py-3">Tile Name</th>
              <th className="px-6 py-3">Size</th>
              <th className="px-6 py-3">Pieces/Box</th>
              <th className="px-6 py-3">Weight/Box (kg)</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tileTypes.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{t.tile_name}</td>
                <td className="px-6 py-4">{t.size_inches}</td>
                <td className="px-6 py-4">{t.pieces_per_box}</td>
                <td className="px-6 py-4">{t.weight_per_box_kg}</td>
                <td className="px-6 py-4">
                  <span className={`status-badge ${t.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleEdit(t)} className="text-primary-600 hover:text-primary-900 mr-3">Edit</button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingTile ? 'Edit Tile Type' : 'Add Tile Type'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Tile Name *</label>
                <input required className="input" value={formData.tile_name} onChange={e => setFormData({...formData, tile_name: e.target.value})} />
              </div>
              <div>
                <label className="label">Size (inches)</label>
                <input className="input" value={formData.size_inches} onChange={e => setFormData({...formData, size_inches: e.target.value})} placeholder="e.g. 12x12" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Pieces per Box</label>
                  <input type="number" className="input" value={formData.pieces_per_box} onChange={e => setFormData({...formData, pieces_per_box: e.target.value})} />
                </div>
                <div>
                  <label className="label">Weight per Box (kg)</label>
                  <input type="number" step="0.01" className="input" value={formData.weight_per_box_kg} onChange={e => setFormData({...formData, weight_per_box_kg: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTile ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
