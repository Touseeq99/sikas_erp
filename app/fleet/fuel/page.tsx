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
    fill_date: '',
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
    const [recordsRes, vehiclesRes] = await Promise.all([
      supabase.from('fuel_tracking').select('*').order('fill_date', { ascending: false }),
      supabase.from('vehicles').select('*').order('vehicle_id'),
    ])
    setRecords(recordsRes.data || [])
    setVehicles(vehiclesRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData, fuel_liters: parseFloat(formData.fuel_liters) || 0, cost: parseFloat(formData.cost) || 0 }
    
    if (editingRecord) {
      await supabase.from('fuel_tracking').update(payload).eq('id', editingRecord.id)
    } else {
      await supabase.from('fuel_tracking').insert(payload)
    }
    
    setShowModal(false)
    setEditingRecord(null)
    resetForm()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      await supabase.from('fuel_tracking').delete().eq('id', id)
      loadData()
    }
  }

  const resetForm = () => {
    setFormData({ fuel_id: '', vehicle_id: '', fill_date: '', fuel_liters: '', cost: '', odometer_reading: '', fuel_station: '', receipt_number: '' })
  }

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.vehicle_id === vehicleId)
    return vehicle ? `${vehicle.vehicle_id} (${vehicle.registration_no})` : vehicleId
  }

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0)
  const totalLiters = records.reduce((sum, r) => sum + (r.fuel_liters || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">⛽ Fuel Tracking</h1>
          <p className="text-slate-500 mt-1">Track fuel consumption</p>
        </div>
        <button onClick={() => { setEditingRecord(null); resetForm(); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
          <span>+</span> Add Fuel Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Total Fuel Cost</p>
          <p className="text-2xl font-bold text-slate-800">PKR {totalCost.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Liters</p>
          <p className="text-2xl font-bold text-slate-800">{totalLiters.toLocaleString()} L</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Avg Cost/Liter</p>
          <p className="text-2xl font-bold text-slate-800">PKR {totalLiters > 0 ? Math.round(totalCost / totalLiters).toLocaleString() : 0}</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Fuel ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Vehicle</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Liters</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Cost (PKR)</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">⛽</div>
                  No fuel records found.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{r.fuel_id}</td>
                  <td className="px-6 py-4 text-slate-600">{getVehicleInfo(r.vehicle_id)}</td>
                  <td className="px-6 py-4 text-slate-600">{r.fill_date}</td>
                  <td className="px-6 py-4 text-slate-600">{r.fuel_liters} L</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{r.cost?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditingRecord(r); setFormData({ fuel_id: r.fuel_id, vehicle_id: r.vehicle_id, fill_date: r.fill_date || '', fuel_liters: r.fuel_liters?.toString() || '', cost: r.cost?.toString() || '', odometer_reading: r.odometer_reading?.toString() || '', fuel_station: r.fuel_station || '', receipt_number: r.receipt_number || '' }); setShowModal(true) }} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
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
              <h2 className="text-xl font-bold text-slate-800">{editingRecord ? 'Edit Fuel' : 'Add Fuel Entry'}</h2>
              <button onClick={() => { setShowModal(false); setEditingRecord(null); resetForm() }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Fuel ID *</label>
                  <input required className="input" placeholder="FT901" value={formData.fuel_id} onChange={e => setFormData({...formData, fuel_id: e.target.value})} />
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
                  <label className="label">Fill Date</label>
                  <input type="date" className="input" value={formData.fill_date} onChange={e => setFormData({...formData, fill_date: e.target.value})} />
                </div>
                <div>
                  <label className="label">Fuel Station</label>
                  <input className="input" placeholder="Shell" value={formData.fuel_station} onChange={e => setFormData({...formData, fuel_station: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Liters</label>
                  <input type="number" className="input" placeholder="80" value={formData.fuel_liters} onChange={e => setFormData({...formData, fuel_liters: e.target.value})} />
                </div>
                <div>
                  <label className="label">Cost (PKR)</label>
                  <input type="number" className="input" placeholder="12000" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingRecord(null); resetForm() }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingRecord ? 'Update' : 'Add'} Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}