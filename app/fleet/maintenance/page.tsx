'use client'

import { useEffect, useState } from 'react'
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
    maintenance_date: '',
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
    
    if (editingRecord) {
      await supabase.from('maintenance_records').update(payload).eq('id', editingRecord.id)
    } else {
      await supabase.from('maintenance_records').insert(payload)
    }
    
    setShowModal(false)
    setEditingRecord(null)
    resetForm()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      await supabase.from('maintenance_records').delete().eq('id', id)
      loadData()
    }
  }

  const resetForm = () => {
    setFormData({ maintenance_id: '', vehicle_id: '', maintenance_date: '', cost: '', maintenance_type: '', description: '' })
  }

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.vehicle_id === vehicleId)
    return vehicle ? `${vehicle.vehicle_id} (${vehicle.registration_no})` : vehicleId
  }

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">🔧 Maintenance</h1>
          <p className="text-slate-500 mt-1">Track vehicle maintenance records</p>
        </div>
        <button onClick={() => { setEditingRecord(null); resetForm(); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
          <span>+</span> Add Record
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Total Records</p>
          <p className="text-2xl font-bold text-slate-800">{records.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Cost</p>
          <p className="text-2xl font-bold text-slate-800">PKR {totalCost.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">This Month</p>
          <p className="text-2xl font-bold text-slate-800">{records.filter(r => r.maintenance_date?.startsWith(new Date().toISOString().slice(0, 7))).length}</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Vehicle</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Cost (PKR)</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">🔧</div>
                  No maintenance records found.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{r.maintenance_id}</td>
                  <td className="px-6 py-4 text-slate-600">{getVehicleInfo(r.vehicle_id)}</td>
                  <td className="px-6 py-4 text-slate-600">{r.maintenance_date}</td>
                  <td className="px-6 py-4 text-slate-600">{r.maintenance_type}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{r.cost?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditingRecord(r); setFormData({ maintenance_id: r.maintenance_id, vehicle_id: r.vehicle_id, maintenance_date: r.maintenance_date || '', cost: r.cost?.toString() || '', maintenance_type: r.maintenance_type || '', description: r.description || '' }); setShowModal(true) }} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editingRecord ? 'Edit Maintenance' : 'Add Maintenance Record'}</h2>
              <button onClick={() => { setShowModal(false); setEditingRecord(null); resetForm() }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Maintenance ID *</label>
                  <input required className="input" placeholder="M801" value={formData.maintenance_id} onChange={e => setFormData({...formData, maintenance_id: e.target.value})} />
                </div>
                <div>
                  <label className="label">Vehicle *</label>
                  <select required className="input" value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})}>
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => <option key={v.id} value={v.vehicle_id}>{v.vehicle_id} - {v.registration_no}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={formData.maintenance_date} onChange={e => setFormData({...formData, maintenance_date: e.target.value})} />
                </div>
                <div>
                  <label className="label">Cost (PKR)</label>
                  <input type="number" className="input" placeholder="8000" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Type</label>
                <input className="input" placeholder="Brake service" value={formData.maintenance_type} onChange={e => setFormData({...formData, maintenance_type: e.target.value})} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingRecord(null); resetForm() }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingRecord ? 'Update' : 'Add'} Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}