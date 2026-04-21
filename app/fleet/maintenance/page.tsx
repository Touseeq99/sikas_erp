'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

interface MaintenanceRecord {
  id: string
  maintenance_id: string
  vehicle_id: string
  maintenance_date: string
  cost: number
  maintenance_type: string
  description?: string
}

interface Vehicle {
  id: string
  vehicle_id: string
  type: string
  registration_no: string
}

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null)
  const [formData, setFormData] = useState({
    maintenance_id: '',
    vehicle_id: '',
    maintenance_date: new Date().toISOString().split('T')[0],
    cost: '',
    maintenance_type: '',
    description: '',
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('maintenance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    const [recordsRes, vehiclesRes] = await Promise.all([
      supabase.from('maintenance_records').select('*').order('maintenance_date', { ascending: false }),
      supabase.from('vehicles').select('*').order('vehicle_id'),
    ])
    setRecords(recordsRes.data || [])
    setVehicles(vehiclesRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData, cost: parseFloat(formData.cost) || 0 }
    
    try {
      if (editingRecord) {
        await supabase.from('maintenance_records').update(payload).eq('id', editingRecord.id)
      } else {
        await supabase.from('maintenance_records').insert(payload)
      }
      setShowModal(false)
      setEditingRecord(null)
      resetForm()
      loadData()
      alert('Asset health manifest committed.')
    } catch (error: any) {
      alert('Failed: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this maintenance record?')) {
      try {
        await supabase.from('maintenance_records').delete().eq('id', id)
        loadData()
      } catch (error: any) {
        alert('Action failed: ' + error.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({ 
      maintenance_id: '', vehicle_id: '', 
      maintenance_date: new Date().toISOString().split('T')[0], cost: '', 
      maintenance_type: '', description: '' 
    })
  }

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0)

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
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Maintenance</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Maintenance Records</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <Link href="/finance/expenses" className="px-6 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-[1.5rem] font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest italic">
            💸 Expenses
          </Link>
          <button onClick={() => { setEditingRecord(null); resetForm(); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-sky-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Add Record
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group transition-all">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Total Cost</p>
          <p className="text-5xl font-black italic tracking-tighter text-emerald-400">PKR {(totalCost/1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Total Records</p>
          <p className="text-5xl font-black text-slate-900 italic tracking-tighter">{records.length}</p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Operational Uptime</p>
           <p className="text-4xl font-black text-sky-500 italic uppercase">Stabilized</p>
        </div>
      </div>

      {/* Persistence Table UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">ID</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Vehicle Asset</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Date / Type</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Cost (PKR)</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map((r) => (
                <tr key={r.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl leading-none">{r.maintenance_id}</td>
                  <td className="px-8 py-8 font-black text-slate-800 uppercase tracking-tight text-xl italic">{r.vehicle_id}</td>
                  <td className="px-8 py-8">
                     <span className="font-black text-slate-800 uppercase tracking-tight text-sm block leading-none">{r.maintenance_date}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">{r.maintenance_type}</span>
                  </td>
                  <td className="px-8 py-8">
                     <span className="font-black text-red-600 italic text-xl tracking-tight">{(r.cost || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingRecord(r); setFormData({ maintenance_id: r.maintenance_id, vehicle_id: r.vehicle_id, maintenance_date: r.maintenance_date || '', cost: r.cost?.toString() || '', maintenance_type: r.maintenance_type || '', description: r.description || '' }); setShowModal(true) }} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-900 hover:text-white transition-all">✏️</button>
                      <button onClick={() => handleDelete(r.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 border border-white/50 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => { setShowModal(false); setEditingRecord(null); resetForm() }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">{editingRecord ? 'Recalibrate' : 'Schedule Health'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Asset lifecycle protocol</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Manifest ID *</label>
                  <input disabled className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Auto-generated" value={formData.maintenance_id} onChange={e => setFormData({...formData, maintenance_id: e.target.value})} />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Vehicle Asset *</label>
                   <select required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})}>
                     <option value="">Select ID...</option>
                     {vehicles.map(v => (
                       <option key={v.id} value={v.vehicle_id}>
                         {v.vehicle_id} - {v.registration_no}
                       </option>
                     ))}
                   </select>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Date</label>
                  <input type="date" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.maintenance_date} onChange={e => setFormData({...formData, maintenance_date: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Valuation (PKR) *</label>
                  <input required type="number" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="10,000" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Logic Type</label>
                <input required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Engine Service / Brakes" value={formData.maintenance_type} onChange={e => setFormData({...formData, maintenance_type: e.target.value})} />
              </div>

               <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Manifest Remarks</label>
                <textarea className="w-full h-32 bg-slate-50 border-2 border-slate-50 rounded-3xl px-6 py-4 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Describe the health event..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-sky-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic">
                 Commit Health Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}