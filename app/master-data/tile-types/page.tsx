'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface TileType {
  id: string
  tile_name: string
  size_inches?: string
  pieces_per_box?: number
  weight_per_box_kg?: number
  is_active?: boolean
}

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
    
    try {
      if (editingTile) {
        await supabase.from('tile_types').update(payload).eq('id', editingTile.id)
      } else {
        await supabase.from('tile_types').insert(payload)
      }
      setShowModal(false)
      setEditingTile(null)
      setFormData({ tile_name: '', size_inches: '', pieces_per_box: '', weight_per_box_kg: '' })
      loadTileTypes()
      alert('Asset class calibrated.')
    } catch (err: any) {
      alert('Failed: ' + err.message)
    }
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
    if (confirm('De-register this asset class?')) {
      try {
        await supabase.from('tile_types').delete().eq('id', id)
        loadTileTypes()
      } catch (err: any) {
        alert('Action failed: ' + err.message)
      }
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Asset <span className="text-sky-500">Classes</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Inventory Specification Protocol</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <button onClick={() => { setEditingTile(null); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-sky-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Provision Asset Class
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Total Registered Specs</p>
          <p className="text-5xl font-black italic tracking-tighter">{tileTypes.length}<span className="text-sky-500 text-2xl uppercase ml-2 tracking-widest font-black">Variants</span></p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Operational Load</p>
           <p className="text-4xl font-black text-emerald-500 italic uppercase">Validated</p>
        </div>
      </div>

      {/* Table UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Specification</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Physical Dimensions</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Box Density</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Unit Mass</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tileTypes.map((t) => (
                <tr key={t.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl leading-none uppercase">{t.tile_name}</td>
                  <td className="px-8 py-8 font-black text-slate-800 uppercase tracking-tight text-xl italic">{t.size_inches || 'N/A'}</td>
                  <td className="px-8 py-8">
                     <span className="font-black text-slate-800 uppercase tracking-tight text-sm block leading-none">{t.pieces_per_box} Units</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">Per Container</span>
                  </td>
                  <td className="px-8 py-8">
                    <span className="inline-flex px-4 py-1.5 bg-slate-100 text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest italic">
                      {t.weight_per_box_kg} kg
                    </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleEdit(t)} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-900 hover:text-white transition-all">✏️</button>
                      <button onClick={() => handleDelete(t.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-lg p-14 border border-white/50 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => { setShowModal(false); setEditingTile(null) }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl font-black transition-all">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">{editingTile ? 'Modify Spec' : 'Provision Spec'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Asset class identity protocol</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Manifest Name *</label>
                <input required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="E-TILES GOLD" value={formData.tile_name} onChange={e => setFormData({...formData, tile_name: e.target.value})} />
              </div>

               <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Dimensions (Inches)</label>
                <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="12x24" value={formData.size_inches} onChange={e => setFormData({...formData, size_inches: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Count/Box</label>
                  <input type="number" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="10" value={formData.pieces_per_box} onChange={e => setFormData({...formData, pieces_per_box: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Mass/Box (kg)</label>
                  <input type="number" step="0.01" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="25.5" value={formData.weight_per_box_kg} onChange={e => setFormData({...formData, weight_per_box_kg: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-sky-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic">
                 Commit Asset Spec
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
