'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

interface Driver {
  id: string
  driver_id: string
  name: string
  license_no: string
  contact_info: string
  phone?: string
  cnic?: string
  license_expiry?: string
  hire_date?: string
  salary?: number
  is_active?: boolean
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [formData, setFormData] = useState({
    driver_id: '',
    name: '',
    license_no: '',
    contact_info: '',
    phone: '',
    cnic: '',
  })

  useEffect(() => {
    loadDrivers()
    const channel = supabase
      .channel('drivers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, loadDrivers)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadDrivers = async () => {
    const { data } = await supabase.from('drivers').select('*').order('driver_id')
    setDrivers(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData }
    
    if (editingDriver) {
      await supabase.from('drivers').update(payload).eq('id', editingDriver.id)
    } else {
      await supabase.from('drivers').insert(payload)
    }
    
    setShowModal(false)
    setEditingDriver(null)
    setFormData({ driver_id: '', name: '', license_no: '', contact_info: '', phone: '', cnic: '' })
    loadDrivers()
  }

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver)
    setFormData({
      driver_id: driver.driver_id,
      name: driver.name || '',
      license_no: driver.license_no || '',
      contact_info: driver.contact_info || '',
      phone: driver.phone || '',
      cnic: driver.cnic || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this driver?')) {
      await supabase.from('drivers').delete().eq('id', id)
      loadDrivers()
    }
  }

  const handleBulkImport = async () => {
    if (!importFile) return
    setImporting(true)
    try {
      const data = await importFile.arrayBuffer()
      const workbook = XLSX.read(data)
      
      let sheet = workbook.Sheets['Drivers']
      if (!sheet) sheet = workbook.Sheets['Employees']
      if (!sheet) throw new Error('Drivers or Employees sheet not found in Excel file')
      
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      const rows = json.slice(1).filter(row => row[0] && row[1])
      
      const drivers = rows.map(row => {
        const name = row[1]?.toString() || ''
        const nameParts = name.split(' ')
        return {
          driver_id: row[0]?.toString() || '',
          name: name,
          license_no: row[2]?.toString() || row[3]?.toString() || '',
          contact_info: row[3]?.toString() || row[2]?.toString() || '',
          phone: row[3]?.toString() || row[2]?.toString() || '',
        }
      }).filter(d => d.driver_id && d.name)
      
      if (drivers.length > 0) {
        await supabase.from('drivers').upsert(drivers, { onConflict: 'driver_id' })
        alert(`Successfully imported ${drivers.length} drivers!`)
        loadDrivers()
      } else {
        alert('No valid drivers found in the file')
      }
    } catch (err: any) {
      alert('Import failed: ' + err.message)
    }
    setImporting(false)
    setShowImportModal(false)
    setImportFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
          <h1 className="text-3xl font-bold text-slate-800">👤 Drivers</h1>
          <p className="text-slate-500 mt-1">Manage your drivers</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setShowImportModal(true)} className="btn btn-secondary flex items-center gap-2">
            <span>📥</span> Import Excel
          </button>
          <button onClick={() => { setEditingDriver(null); setFormData({ driver_id: '', name: '', license_no: '', contact_info: '', phone: '', cnic: '' }); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
            <span>+</span> Add Driver
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Driver ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">License No</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {drivers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">👤</div>
                  No drivers found. Add one to get started.
                </td>
              </tr>
            ) : (
              drivers.map((d) => (
                <tr key={d.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{d.driver_id}</td>
                  <td className="px-6 py-4 text-slate-600">{d.name}</td>
                  <td className="px-6 py-4 text-slate-600">{d.license_no}</td>
                  <td className="px-6 py-4 text-slate-600">{d.contact_info || d.phone}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleEdit(d)} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
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
              <h2 className="text-xl font-bold text-slate-800">{editingDriver ? 'Edit Driver' : 'Add New Driver'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Driver ID *</label>
                  <input required className="input" placeholder="DR01" value={formData.driver_id} onChange={e => setFormData({...formData, driver_id: e.target.value})} />
                </div>
                <div>
                  <label className="label">Name</label>
                  <input className="input" placeholder="John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">License No</label>
                  <input className="input" placeholder="LIC-12345" value={formData.license_no} onChange={e => setFormData({...formData, license_no: e.target.value})} />
                </div>
                <div>
                  <label className="label">Contact Info</label>
                  <input className="input" placeholder="03001234567" value={formData.contact_info} onChange={e => setFormData({...formData, contact_info: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="03001234567" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="label">CNIC</label>
                  <input className="input" placeholder="35202-1234567-8" value={formData.cnic} onChange={e => setFormData({...formData, cnic: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingDriver ? 'Update' : 'Add'} Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Import Drivers from Excel</h2>
              <button onClick={() => { setShowImportModal(false); setImportFile(null); if(fileInputRef.current) fileInputRef.current.value = '' }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-sky-700 font-medium mb-2">Expected Columns:</p>
              <p className="text-xs text-sky-600">DriverID, Name, LicenseNo, ContactInfo</p>
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