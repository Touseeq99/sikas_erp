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
}

interface Vehicle {
  id: string
  vehicle_id: string
  type: string
  registration_no: string
}

interface Driver {
  id: string
  driver_id: string
  name: string
}

export default function UsageLogsPage() {
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<UsageLog | null>(null)
  const [formData, setFormData] = useState({
    usage_id: '',
    vehicle_id: '',
    date: '',
    distance_travelled: '',
    trip_fuel: '',
    driver_id: '',
    purpose: '',
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
    
    if (editingLog) {
      await supabase.from('vehicle_usage_logs').update(payload).eq('id', editingLog.id)
    } else {
      await supabase.from('vehicle_usage_logs').insert(payload)
    }
    
    setShowModal(false)
    setEditingLog(null)
    resetForm()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this log?')) {
      await supabase.from('vehicle_usage_logs').delete().eq('id', id)
      loadData()
    }
  }

  const resetForm = () => {
    setFormData({
      usage_id: '',
      vehicle_id: '',
      date: '',
      distance_travelled: '',
      trip_fuel: '',
      driver_id: '',
      purpose: '',
    })
  }

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.vehicle_id === vehicleId)
    return vehicle ? `${vehicle.vehicle_id} (${vehicle.registration_no})` : vehicleId
  }

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.driver_id === driverId)
    return driver?.name || '-'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">📝 Fleet Usage</h1>
          <p className="text-slate-500 mt-1">Track vehicle usage and distance</p>
        </div>
        <button onClick={() => { setEditingLog(null); resetForm(); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
          <span>+</span> Add Log
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Usage ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Vehicle</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Distance (KM)</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Trip Fuel</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Driver</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">📝</div>
                  No usage logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{log.usage_id}</td>
                  <td className="px-6 py-4 text-slate-600">{getVehicleInfo(log.vehicle_id)}</td>
                  <td className="px-6 py-4 text-slate-600">{log.date}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{log.distance_travelled} km</td>
                  <td className="px-6 py-4 text-slate-600">{log.trip_fuel}</td>
                  <td className="px-6 py-4 text-slate-600">{log.driver_id ? getDriverName(log.driver_id) : '-'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditingLog(log); setFormData({ usage_id: log.usage_id, vehicle_id: log.vehicle_id, date: log.date || '', distance_travelled: log.distance_travelled?.toString() || '', trip_fuel: log.trip_fuel || '', driver_id: log.driver_id || '', purpose: log.purpose || '' }); setShowModal(true) }} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
                    <button onClick={() => handleDelete(log.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
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
              <h2 className="text-xl font-bold text-slate-800">{editingLog ? 'Edit Usage Log' : 'Add Usage Log'}</h2>
              <button onClick={() => { setShowModal(false); setEditingLog(null); resetForm() }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Usage ID *</label>
                  <input required className="input" placeholder="F701" value={formData.usage_id} onChange={e => setFormData({...formData, usage_id: e.target.value})} />
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
                  <input type="date" className="input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="label">Distance (KM)</label>
                  <input type="number" className="input" placeholder="250" value={formData.distance_travelled} onChange={e => setFormData({...formData, distance_travelled: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Trip Fuel</label>
                  <input className="input" placeholder="80 L" value={formData.trip_fuel} onChange={e => setFormData({...formData, trip_fuel: e.target.value})} />
                </div>
                <div>
                  <label className="label">Driver</label>
                  <select className="input" value={formData.driver_id} onChange={e => setFormData({...formData, driver_id: e.target.value})}>
                    <option value="">Select Driver</option>
                    {drivers.map(d => <option key={d.id} value={d.driver_id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingLog(null); resetForm() }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingLog ? 'Update' : 'Add'} Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}