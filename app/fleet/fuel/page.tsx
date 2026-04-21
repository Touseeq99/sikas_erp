'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface FuelRecord {
  id: string
  fuel_id: string
  vehicle_id: string
  fill_date: string
  fuel_liters: number
  cost: number
  odometer_reading?: number
  fuel_station?: string
  receipt_number?: string
}

interface Vehicle {
  id: string
  vehicle_id: string
  registration_no: string
  is_outsourced?: boolean
}

export default function FuelTrackingPage() {
  const [records, setRecords] = useState<FuelRecord[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null)
  const [formData, setFormData] = useState({
    fuel_id: '',
    vehicle_id: '',
    fill_date: new Date().toISOString().split('T')[0],
    fuel_liters: '',
    cost: '',
    odometer_reading: '',
    fuel_station: '',
    receipt_number: '',
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('fuel-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_tracking' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    try {
      const [recordsRes, vehiclesRes] = await Promise.all([
        supabase.from('fuel_tracking').select('*').order('fill_date', { ascending: false }),
        supabase.from('vehicles').select('id, vehicle_id, registration_no, is_active').order('vehicle_id'),
      ])
      setRecords(recordsRes.data || [])
      const vehiclesData = vehiclesRes.data || []
      console.log('Fuel - Vehicles:', vehiclesData)
      setVehicles(vehiclesData)
    } catch (error: any) {
      console.error('Error loading fuel data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { 
      ...formData, 
      fuel_liters: parseFloat(formData.fuel_liters) || 0, 
      cost: parseFloat(formData.cost) || 0,
      odometer_reading: parseFloat(formData.odometer_reading) || 0
    }
    
    try {
      if (editingRecord) {
        await supabase.from('fuel_tracking').update(payload).eq('id', editingRecord.id)
      } else {
        await supabase.from('fuel_tracking').insert(payload)
      }
      setShowModal(false)
      setEditingRecord(null)
      resetForm()
      loadData()
      alert('Propellant manifest updated.')
    } catch (error: any) {
      alert('Failed: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('De-register this propellant log?')) {
      try {
        await supabase.from('fuel_tracking').delete().eq('id', id)
        loadData()
      } catch (error: any) {
        alert('Action failed: ' + error.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({ 
      fuel_id: '', vehicle_id: '', fill_date: new Date().toISOString().split('T')[0], 
      fuel_liters: '', cost: '', odometer_reading: '', fuel_station: '', receipt_number: '' 
    })
  }

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0)
  const totalLiters = records.reduce((sum, r) => sum + (r.fuel_liters || 0), 0)

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
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Fuel Records</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Fuel Tracking</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <button onClick={() => { setEditingRecord(null); resetForm(); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-amber-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Add Record
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Total Cost</p>
          <p className="text-5xl font-black italic tracking-tighter text-amber-400">PKR {(totalCost/1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Total Liters</p>
          <p className="text-5xl font-black text-slate-900 italic uppercase">{totalLiters.toLocaleString()} <span className="text-xl text-slate-400">Liters</span></p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Efficiency Index</p>
           <p className="text-4xl font-black text-emerald-500 italic uppercase">Optimized</p>
        </div>
      </div>

      {/* Persistence Table UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Date</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Vehicle Asset</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Volume / Burn</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Node (Station)</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map((r) => (
                <tr key={r.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl leading-none">{r.fill_date}</td>
                  <td className="px-8 py-8 font-black text-slate-800 uppercase tracking-tight text-xl italic">{r.vehicle_id}</td>
                  <td className="px-8 py-8">
                     <span className="font-black text-slate-800 uppercase tracking-tight text-sm block leading-none">{r.fuel_liters} LITERS</span>
                     <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-2 block">VALUATION: {(r.cost || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-8">
                    <span className="inline-flex px-4 py-1.5 bg-slate-100 text-slate-950 rounded-full text-[10px] font-black uppercase tracking-widest italic transition-all group-hover:bg-slate-900 group-hover:text-white">
                      {r.fuel_station || 'Unknown HQ'}
                    </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { 
                        setEditingRecord(r); 
                        setFormData({ 
                          fuel_id: r.fuel_id, vehicle_id: r.vehicle_id, fill_date: r.fill_date || '', 
                          fuel_liters: r.fuel_liters?.toString() || '', cost: r.cost?.toString() || '', 
                          odometer_reading: r.odometer_reading?.toString() || '', fuel_station: r.fuel_station || '', 
                          receipt_number: r.receipt_number || '' 
                        }); 
                        setShowModal(true) 
                      }} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-900 hover:text-white transition-all">✏️</button>
                      <button onClick={() => handleDelete(r.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fuel Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 border border-white/50 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => { setShowModal(false); setEditingRecord(null); resetForm() }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">{editingRecord ? 'Edit Record' : 'Add Fuel Record'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Fuel entry details</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Entry Key *</label>
                  <input disabled className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Auto-generated" value={formData.fuel_id} onChange={e => setFormData({...formData, fuel_id: e.target.value})} />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Vehicle *</label>
                   <select required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})}>
                     <option value="">Select...</option>
                     {vehicles.map(v => (
                       <option key={v.id} value={v.vehicle_id}>
                         {v.vehicle_id}
                       </option>
                     ))}
                   </select>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Date</label>
                  <input type="date" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.fill_date} onChange={e => setFormData({...formData, fill_date: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Volume (Liters) *</label>
                  <input required type="number" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="100" value={formData.fuel_liters} onChange={e => setFormData({...formData, fuel_liters: e.target.value})} />
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Valuation (PKR) *</label>
                  <input required type="number" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="50,000" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Supply Node (Station)</label>
                  <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Shell / PSO" value={formData.fuel_station} onChange={e => setFormData({...formData, fuel_station: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-amber-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic">
                 Commit Consumption
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}