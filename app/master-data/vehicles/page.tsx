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
    const { data } = await supabase.from('vehicles').select('*').order('vehicle_id')
    setVehicles(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData }
    
    if (editingVehicle) {
      await supabase.from('vehicles').update(payload).eq('id', editingVehicle.id)
    } else {
      await supabase.from('vehicles').insert(payload)
    }
    
    setShowModal(false)
    setEditingVehicle(null)
    setFormData({ vehicle_id: '', type: '', registration_no: '', capacity: '', status: 'available', make: '', model: '' })
    loadVehicles()
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      vehicle_id: vehicle.vehicle_id,
      type: vehicle.type || '',
      registration_no: vehicle.registration_no || '',
      capacity: vehicle.capacity || '',
      status: vehicle.status,
      make: vehicle.make || '',
      model: vehicle.model || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      await supabase.from('vehicles').delete().eq('id', id)
      loadVehicles()
    }
  }

  const handleBulkImport = async () => {
    if (!importFile) return
    setImporting(true)
    try {
      const data = await importFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets['Vehicles']
      if (!sheet) throw new Error('Vehicles sheet not found in Excel file')
      
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      const rows = json.slice(1).filter(row => row[0] && row[1])
      
      const vehicles = rows.map(row => ({
        vehicle_id: row[0]?.toString() || row[1]?.toString(),
        type: row[2]?.toString() || '',
        registration_no: row[1]?.toString() || row[0]?.toString(),
        capacity: row[3]?.toString() || '',
        status: row[4]?.toString() === 'Active' ? 'available' : row[4]?.toString() === 'In Repair' ? 'maintenance' : 'available',
      })).filter(v => v.vehicle_id && v.registration_no)
      
      if (vehicles.length > 0) {
        await supabase.from('vehicles').upsert(vehicles, { onConflict: 'vehicle_id' })
        alert(`Successfully imported ${vehicles.length} vehicles!`)
        loadVehicles()
      } else {
        alert('No valid vehicles found in the file')
      }
    } catch (err: any) {
      alert('Import failed: ' + err.message)
    }
    setImporting(false)
    setShowImportModal(false)
    setImportFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    in_use: 'bg-blue-100 text-blue-700 border-blue-200',
    maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
    out_of_service: 'bg-red-100 text-red-700 border-red-200',
  }

  const statusLabels: Record<string, string> = {
    available: 'Available',
    in_use: 'In Use',
    maintenance: 'Maintenance',
    out_of_service: 'Out of Service',
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
          <h1 className="text-3xl font-bold text-slate-800">🚛 Vehicles</h1>
          <p className="text-slate-500 mt-1">Manage your fleet vehicles</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setShowImportModal(true)} className="btn btn-secondary flex items-center gap-2">
            <span>📥</span> Import Excel
          </button>
          <button onClick={() => { setEditingVehicle(null); setFormData({ vehicle_id: '', type: '', registration_no: '', capacity: '', status: 'available', make: '', model: '' }); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
            <span>+</span> Add Vehicle
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Vehicle ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Registration No</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Capacity</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">🚛</div>
                  No vehicles found. Add one to get started.
                </td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{v.vehicle_id}</td>
                  <td className="px-6 py-4 text-slate-600">{v.type}</td>
                  <td className="px-6 py-4 text-slate-600">{v.registration_no}</td>
                  <td className="px-6 py-4 text-slate-600">{v.capacity}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusColors[v.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[v.status] || v.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleEdit(v)} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
                    <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
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
              <h2 className="text-xl font-bold text-slate-800">{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vehicle ID *</label>
                  <input required className="input" placeholder="V01" value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <input className="input" placeholder="Truck" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Registration No</label>
                  <input className="input" placeholder="RWP-123" value={formData.registration_no} onChange={e => setFormData({...formData, registration_no: e.target.value})} />
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input className="input" placeholder="10 tons" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Make</label>
                  <input className="input" placeholder="Hino" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} />
                </div>
                <div>
                  <label className="label">Model</label>
                  <input className="input" placeholder="FG2JRTD" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="available">Available</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingVehicle ? 'Update' : 'Add'} Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Import Vehicles from Excel</h2>
              <button onClick={() => { setShowImportModal(false); setImportFile(null); if(fileInputRef.current) fileInputRef.current.value = '' }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-sky-700 font-medium mb-2">Expected Columns:</p>
              <p className="text-xs text-sky-600">VehicleID, Type, RegistrationNo, Capacity, Status</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="input mb-4"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => { setShowImportModal(false); setImportFile(null); if(fileInputRef.current) fileInputRef.current.value = '' }} className="btn btn-secondary">Cancel</button>
              <button onClick={handleBulkImport} disabled={!importFile || importing} className="btn btn-primary">
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}