'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface UsageLog {
  id: string
  usage_id: string
  vehicle_id: string
  date: string
  distance_travelled: number
  trip_fuel: string
  driver_id?: string
  purpose?: string
  location?: string
}

interface Vehicle {
  id: string
  vehicle_id: string
  type: string
  registration_no: string
  is_outsourced: boolean
}

interface Driver {
  id: string
  driver_id: string
  name: string
}

export default function TripsPage() {
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<UsageLog | null>(null)
  const [formData, setFormData] = useState({
    usage_id: '',
    vehicle_id: '',
    date: new Date().toISOString().split('T')[0],
    distance_travelled: '',
    trip_fuel: '',
    driver_id: '',
    purpose: '',
    location: '',
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('usage-logs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_usage_logs' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    const [logsRes, vehiclesRes, driversRes] = await Promise.all([
      supabase.from('vehicle_usage_logs').select('*').order('date', { ascending: false }),
      supabase.from('vehicles').select('*').order('vehicle_id'),
      supabase.from('drivers').select('*').order('driver_id'),
    ])
    setLogs(logsRes.data || [])
    setVehicles(vehiclesRes.data || [])
    setDrivers(driversRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData, distance_travelled: parseInt(formData.distance_travelled) || 0 }
    
    try {
      if (editingLog) {
        await supabase.from('vehicle_usage_logs').update(payload).eq('id', editingLog.id)
      } else {
        await supabase.from('vehicle_usage_logs').insert(payload)
      }
      setShowModal(false)
      setEditingLog(null)
      resetForm()
      loadData()
      alert('Trip record saved.')
    } catch (error: any) {
      alert('Failed: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this trip?')) {
      try {
        await supabase.from('vehicle_usage_logs').delete().eq('id', id)
        loadData()
      } catch (error: any) {
        alert('Action failed: ' + error.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      usage_id: '', vehicle_id: '', date: new Date().toISOString().split('T')[0],
      distance_travelled: '', trip_fuel: '', driver_id: '', purpose: '', location: '',
    })
  }

  const getSelectedVehicle = () => {
    return vehicles.find(v => v.vehicle_id === formData.vehicle_id)
  }

  const isVehicleOutsourced = () => {
    const selectedVehicle = getSelectedVehicle()
    return selectedVehicle?.is_outsourced || false
  }

  const totalDistance = logs.reduce((sum, l) => sum + (l.distance_travelled || 0), 0)

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
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Trips</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Trip Records</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <button onClick={() => { setEditingLog(null); resetForm(); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-sky-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Add Record
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Total Distance</p>
          <p className="text-5xl font-black italic tracking-tighter text-sky-400">{totalDistance.toLocaleString()} <span className="text-xl text-slate-500">KM</span></p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Total Trips</p>
           <p className="text-5xl font-black text-slate-950 italic tracking-tighter">{logs.length}</p>
        </div>
      </div>

      {/* Persistence Table UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Trip ID</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Asset / Driver</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Displacement</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Location</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Date</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((log) => (
                <tr key={log.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl leading-none uppercase">{log.usage_id}</td>
                  <td className="px-8 py-8">
                     <span className="font-black text-slate-800 uppercase tracking-tight text-xl block leading-none italic">{log.vehicle_id}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block italic">
                       {(() => {
                         const vehicle = vehicles.find(v => v.vehicle_id === log.vehicle_id)
                         if (vehicle?.is_outsourced) {
                           return 'Outsourced Vehicle'
                         } else {
                           return `Driver: ${log.driver_id || 'Not Assigned'}`
                         }
                       })()}
                     </span>
                  </td>
                  <td className="px-8 py-8">
                    <span className="font-black text-slate-900 italic text-2xl tracking-tighter">{log.distance_travelled} KM</span>
                  </td>
                  <td className="px-8 py-8">
                    <span className="font-black text-slate-600 italic text-lg tracking-tighter">{log.location || '-'}</span>
                  </td>
                  <td className="px-8 py-8">
                     <span className="inline-flex px-4 py-1.5 bg-slate-100 text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest italic">
                        {log.date}
                     </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingLog(log); setFormData({ usage_id: log.usage_id, vehicle_id: log.vehicle_id, date: log.date || '', distance_travelled: log.distance_travelled?.toString() || '', trip_fuel: log.trip_fuel || '', driver_id: log.driver_id || '', purpose: log.purpose || '', location: log.location || '' }); setShowModal(true) }} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-900 hover:text-white transition-all">✏️</button>
                      <button onClick={() => handleDelete(log.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 border border-white/50 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => { setShowModal(false); setEditingLog(null); resetForm() }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">{editingLog ? 'Edit Trip' : 'Add Trip'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Trip Information</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Trip ID *</label>
                  <input disabled className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Auto-generated" value={formData.usage_id} onChange={e => setFormData({...formData, usage_id: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Vehicle *</label>
                   <select required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.vehicle_id} onChange={e => {
                      setFormData({...formData, vehicle_id: e.target.value, driver_id: isVehicleOutsourced() ? '' : formData.driver_id})
                    }}>
                     <option value="">Select ID...</option>
                     {vehicles.map(v => <option key={v.id} value={v.vehicle_id}>{v.vehicle_id} - {v.registration_no} {v.is_outsourced ? '(Outsourced)' : '(In-House)'}</option>)}
                   </select>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Date</label>
                  <input type="date" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Distance (KM) *</label>
                  <input required type="number" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="250" value={formData.distance_travelled} onChange={e => setFormData({...formData, distance_travelled: e.target.value})} />
                </div>
              </div>

              {!isVehicleOutsourced() && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Driver</label>
                    <select className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.driver_id} onChange={e => setFormData({...formData, driver_id: e.target.value})}>
                      <option value="">Select Driver...</option>
                      {drivers.map(d => <option key={d.id} value={d.driver_id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Fuel Consumption</label>
                    <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="80 Liters" value={formData.trip_fuel} onChange={e => setFormData({...formData, trip_fuel: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Location</label>
                    <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Lahore" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                </div>
              )}
              
              {isVehicleOutsourced() && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
                  <p className="text-amber-800 font-black text-sm uppercase tracking-widest italic">
                    ⚠️ This vehicle is outsourced - no driver assignment required
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Fuel Consumption</label>
                  <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="80 Liters" value={formData.trip_fuel} onChange={e => setFormData({...formData, trip_fuel: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Location</label>
                  <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Lahore" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-sky-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic">
                 Save Trip
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}