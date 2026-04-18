'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

interface Vehicle {
  id: string
  vehicle_id: string
  type: string
  registration_no: string
  capacity: string
  status: string
  is_outsourced: boolean
  make?: string
  model?: string
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [formData, setFormData] = useState({
    vehicle_id: '',
    type: '',
    registration_no: '',
    capacity: '',
    status: 'available',
    is_outsourced: false,
    make: '',
    model: '',
  })

  useEffect(() => {
    loadVehicles()
    const channel = supabase
      .channel('vehicles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, loadVehicles)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase.from('vehicles').select('*').order('vehicle_id')
      if (error) throw error
      setVehicles(data || [])
    } catch (error: any) {
      console.error('Error loading vehicles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData }
    
    try {
      if (editingVehicle) {
        await supabase.from('vehicles').update(payload).eq('id', editingVehicle.id)
      } else {
        await supabase.from('vehicles').insert(payload)
      }
      setShowModal(false)
      setEditingVehicle(null)
      resetForm()
      loadVehicles()
      alert('Vehicle configuration saved.')
    } catch (error: any) {
      alert('Failed: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({ 
      vehicle_id: '', type: '', registration_no: '', capacity: '', 
      status: 'available', is_outsourced: false, make: '', model: '' 
    })
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      vehicle_id: vehicle.vehicle_id,
      type: vehicle.type || '',
      registration_no: vehicle.registration_no || '',
      capacity: vehicle.capacity || '',
      status: vehicle.status,
      is_outsourced: vehicle.is_outsourced || false,
      make: vehicle.make || '',
      model: vehicle.model || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Permanently decommission this asset?')) {
      try {
        await supabase.from('vehicles').delete().eq('id', id)
        loadVehicles()
      } catch (error: any) {
        alert('Action failed: ' + error.message)
      }
    }
  }

  const handleBulkImport = async () => {
    if (!importFile) return
    setImporting(true)
    try {
      const data = await importFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets['Vehicles']
      if (!sheet) throw new Error('Vehicles sheet not found')
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      const rows = json.slice(1).filter(row => row[0])
      const imported = rows.map(row => ({
        vehicle_id: row[0]?.toString() || '',
        registration_no: row[1]?.toString() || row[0]?.toString(),
        type: row[2]?.toString() || 'Truck',
        capacity: row[3]?.toString() || '',
        status: 'available',
        is_outsourced: row[4]?.toString().toLowerCase() === 'outsourced',
      })).filter(v => v.vehicle_id)
      
      if (imported.length > 0) {
        await supabase.from('vehicles').upsert(imported, { onConflict: 'vehicle_id' })
        loadVehicles()
        alert('Asset logs imported.')
      }
    } catch (err: any) {
      alert('Import error: ' + err.message)
    }
    setImporting(false)
    setShowImportModal(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  const activeCount = vehicles.filter(v => v.status === 'available').length
  const outsourcedCount = vehicles.filter(v => v.is_outsourced).length

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Asset <span className="text-sky-500">Fleet</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Hardware Resource Infrastructure</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <button onClick={() => setShowImportModal(true)} className="px-6 py-4 border-2 border-slate-100 rounded-[1.5rem] font-black text-xs hover:bg-slate-50 transition-all uppercase tracking-widest italic">
            Excel Import
          </button>
          <button onClick={() => { setEditingVehicle(null); resetForm(); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-sky-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Provision Asset
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Total Asset Load</p>
          <p className="text-5xl font-black italic tracking-tighter">{vehicles.length}<span className="text-sky-500 text-2xl uppercase ml-2 tracking-widest font-black">Units</span></p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">In-house capacity</p>
          <p className="text-5xl font-black text-emerald-500 italic">{vehicles.length - outsourcedCount}</p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Operational now</p>
          <p className="text-5xl font-black text-sky-500 italic">{activeCount}</p>
        </div>
      </div>

      {/* Fleet Alerts */}
      <div className="bg-sky-50 border border-sky-100 rounded-[3rem] p-8 flex items-center gap-8 relative overflow-hidden group">
         <div className="absolute right-0 bottom-0 text-[10rem] font-black text-sky-500/5 -translate-y-10 translate-x-10 italic pointer-events-none">FLEET</div>
         <div className="w-20 h-20 bg-white rounded-[1.5rem] shadow-xl shadow-sky-100 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">⚙️</div>
         <div>
            <h3 className="text-xl font-black text-sky-900 tracking-tighter italic uppercase">Hardware Logistics Logic</h3>
            <p className="text-sky-600 font-bold text-sm max-w-2xl leading-relaxed mt-1 uppercase tracking-wider">
               Managing {vehicles.length} operational units. Status indicators show real-time workload balance across In-house and Outsourced categories.
            </p>
         </div>
      </div>

      {/* Pivot List UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Asset ID</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Node Logic</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Source Allocation</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">State</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {vehicles.map((v) => (
                <tr key={v.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8">
                     <span className="font-black text-slate-900 italic tracking-tighter text-2xl block leading-none">{v.vehicle_id}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">{v.registration_no}</span>
                  </td>
                  <td className="px-8 py-8 text-slate-600 font-black italic tracking-tight">{v.type} ({v.capacity})</td>
                  <td className="px-8 py-8">
                    <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic tracking-widest ${v.is_outsourced ? 'bg-purple-500 text-white' : 'bg-emerald-500 text-white'} shadow-lg`}>
                      {v.is_outsourced ? 'Outsourced Path' : 'In-House Asset'}
                    </span>
                  </td>
                  <td className="px-8 py-8">
                    <span className="font-black text-slate-800 uppercase italic tracking-widest text-[10px] flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${v.status === 'available' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'}`}></span>
                       {v.status}
                    </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleEdit(v)} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-900 hover:text-white transition-all">✏️</button>
                      <button onClick={() => handleDelete(v.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Provisioning Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 overflow-y-auto max-h-[90vh] border border-white/50 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl transition-all font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">{editingVehicle ? 'Edit Resource' : 'Provision Asset'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Hardware Log Identification</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Asset Code *</label>
                  <input required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="V-101" value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Model Logic</label>
                  <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Hino FG" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">License Plate</label>
                  <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="RWP 1234" value={formData.registration_no} onChange={e => setFormData({...formData, registration_no: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Weight Class</label>
                  <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="10 Tons" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Lifecycle State</label>
                    <select className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="available">Available</option>
                      <option value="in_use">In Operational Use</option>
                      <option value="maintenance">Maintenance Protocol</option>
                    </select>
                 </div>
                 <div className="flex items-center pt-8">
                    <label className="flex items-center gap-4 cursor-pointer group">
                       <input type="checkbox" className="w-6 h-6 rounded-lg text-sky-600 focus:ring-sky-500" checked={formData.is_outsourced} onChange={e => setFormData({...formData, is_outsourced: e.target.checked})} />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic group-hover:text-slate-900 transition-colors">Outsourced Resource Path</span>
                    </label>
                 </div>
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-sky-500 transition-all active:scale-[0.98] uppercase tracking-[0.1em] italic">
                 Execute Provisioning
              </button>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-md p-12 text-center border border-white/50">
             <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-8">Asset ingestion</h3>
             <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => setImportFile(e.target.files?.[0] || null)} />
             <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer border-4 border-dashed border-slate-100 rounded-[3rem] p-12 hover:border-sky-500 hover:bg-sky-50 transition-all mb-8">
                <p className="text-4xl mb-4">📂</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{importFile ? importFile.name : 'Select Logistics Manifest'}</p>
             </div>
             <div className="flex gap-4">
                <button onClick={() => setShowImportModal(false)} className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50">Cancel</button>
                <button onClick={handleBulkImport} disabled={!importFile || importing} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest italic shadow-xl">
                   {importing ? 'INGESTING...' : 'INITIATE IMPORT'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}