'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { RateCard, Client, TileType } from '@/app/types/database'

interface RateCardWithRelations extends RateCard {
  clients?: Client
  tile_types?: TileType
}

export default function RateCardsPage() {
  const [rateCards, setRateCards] = useState<RateCardWithRelations[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [tileTypes, setTileTypes] = useState<TileType[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRate, setEditingRate] = useState<RateCard | null>(null)
  const [formData, setFormData] = useState({
    client_id: '',
    tile_type_id: '',
    rate_per_ton: '',
    effective_from: '',
    effective_to: '',
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('rate-cards-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rate_cards' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    const [rateRes, clientRes, tileRes] = await Promise.all([
      supabase.from('rate_cards').select('*, clients:client_id(*), tile_types:tile_type_id(*)').order('effective_from', { ascending: false }),
      supabase.from('clients').select('*').eq('is_active', true).order('client_code'),
      supabase.from('tile_types').select('*').eq('is_active', true).order('tile_name'),
    ])
    setRateCards(rateRes.data || [])
    setClients(clientRes.data || [])
    setTileTypes(tileRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      client_id: formData.client_id,
      tile_type_id: formData.tile_type_id,
      rate_per_ton: parseFloat(formData.rate_per_ton),
      effective_from: formData.effective_from,
      effective_to: formData.effective_to || null,
    }
    
    if (editingRate) {
      await supabase.from('rate_cards').update(payload).eq('id', editingRate.id)
    } else {
      await supabase.from('rate_cards').insert(payload)
    }
    
    setShowModal(false)
    setEditingRate(null)
    setFormData({ client_id: '', tile_type_id: '', rate_per_ton: '', effective_from: '', effective_to: '' })
    loadData()
  }

  const handleEdit = (rate: RateCard) => {
    setEditingRate(rate)
    setFormData({
      client_id: rate.client_id,
      tile_type_id: rate.tile_type_id,
      rate_per_ton: rate.rate_per_ton?.toString() || '',
      effective_from: rate.effective_from,
      effective_to: rate.effective_to || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await supabase.from('rate_cards').delete().eq('id', id)
      loadData()
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rate Cards</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">+ Add Rate Card</button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="table-header">
            <tr>
              <th className="px-6 py-3">Client</th>
              <th className="px-6 py-3">Tile Type</th>
              <th className="px-6 py-3">Rate/Ton (PKR)</th>
              <th className="px-6 py-3">Effective From</th>
              <th className="px-6 py-3">Effective To</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rateCards.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{r.clients?.client_name}</td>
                <td className="px-6 py-4">{r.tile_types?.tile_name}</td>
                <td className="px-6 py-4 font-medium">{r.rate_per_ton?.toLocaleString()}</td>
                <td className="px-6 py-4">{r.effective_from}</td>
                <td className="px-6 py-4">{r.effective_to || 'Ongoing'}</td>
                <td className="px-6 py-4">
                  <span className={`status-badge ${r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleEdit(r)} className="text-primary-600 hover:text-primary-900 mr-3">Edit</button>
                  <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingRate ? 'Edit Rate Card' : 'Add Rate Card'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Client *</label>
                <select required className="input" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tile Type *</label>
                <select required className="input" value={formData.tile_type_id} onChange={e => setFormData({...formData, tile_type_id: e.target.value})}>
                  <option value="">Select Tile Type</option>
                  {tileTypes.map(t => <option key={t.id} value={t.id}>{t.tile_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Rate per Ton (PKR) *</label>
                <input type="number" required className="input" value={formData.rate_per_ton} onChange={e => setFormData({...formData, rate_per_ton: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Effective From *</label>
                  <input type="date" required className="input" value={formData.effective_from} onChange={e => setFormData({...formData, effective_from: e.target.value})} />
                </div>
                <div>
                  <label className="label">Effective To</label>
                  <input type="date" className="input" value={formData.effective_to} onChange={e => setFormData({...formData, effective_to: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingRate ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
