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
    
    try {
      if (editingDriver) {
        await supabase.from('drivers').update(payload).eq('id', editingDriver.id)
      } else {
        await supabase.from('drivers').insert(payload)
      }
      alert('Pilot profile updated.')
      setShowModal(false)
      setEditingDriver(null)
      loadDrivers()
    } catch (error: any) {
      alert('Save failed: ' + error.message)
    }
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
    if (confirm('De-authorize this pilot from fleet operations?')) {
      try {
        await supabase.from('drivers').delete().eq('id', id)
        loadDrivers()
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
      let sheet = workbook.Sheets['Drivers'] || workbook.Sheets['Employees']
      if (!sheet) throw new Error('Driver manifest not found')
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      const rows = json.slice(1).filter(row => row[0])
      const imported = rows.map(row => ({
        driver_id: row[0]?.toString() || '',
        name: row[1]?.toString() || '',
        license_no: row[2]?.toString() || '',
        contact_info: row[3]?.toString() || '',
      })).filter(d => d.driver_id && d.name)
      
      if (imported.length > 0) {
        await supabase.from('drivers').upsert(imported, { onConflict: 'driver_id' })
        loadDrivers()
        alert('Pilot logs imported.')
      }
    } catch (err: any) {
      alert('Import failed: ' + err.message)
    }
    setImporting(false)
    setShowImportModal(false)
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
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Fleet <span className="text-sky-500">Pilots</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Human Resource Node Management</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
           <button onClick={() => setShowImportModal(true)} className="px-6 py-4 border-2 border-slate-100 rounded-[1.5rem] font-black text-xs hover:bg-slate-50 transition-all uppercase tracking-widest italic">
            Import Talent
          </button>
          <button onClick={() => { setEditingDriver(null); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-sky-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Enlist Pilot
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Total Enlisted Force</p>
          <p className="text-5xl font-black italic tracking-tighter">{drivers.length}<span className="text-sky-500 text-2xl uppercase ml-2 tracking-widest font-black">Authorized</span></p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Active status</p>
          <p className="text-5xl font-black text-emerald-500 italic">100%</p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 italic">Shift utilization</p>
          <p className="text-4xl font-black text-sky-500 italic uppercase">High Capacity</p>
        </div>
      </div>

      {/* Table UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Pilot ID</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Identity Manifest</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Authorization Code</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Comms Node</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {drivers.map((d) => (
                <tr key={d.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl">{d.driver_id}</td>
                  <td className="px-8 py-8">
                     <span className="font-black text-slate-800 uppercase tracking-tight text-sm block leading-none">{d.name}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">Level 1 Pilot</span>
                  </td>
                  <td className="px-8 py-8 text-slate-600 font-black italic tracking-tight">{d.license_no}</td>
                  <td className="px-8 py-8 text-slate-600 font-black italic tracking-tight">{d.contact_info || d.phone}</td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleEdit(d)} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-900 hover:text-white transition-all">✏️</button>
                      <button onClick={() => handleDelete(d.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pilot Enlistment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 overflow-y-auto max-h-[90vh] border border-white/50 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl transition-all font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">{editingDriver ? 'Modify Profile' : 'Enlist Pilot'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Human Resource Identity protocol</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Pilot Code *</label>
                  <input required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="P-001" value={formData.driver_id} onChange={e => setFormData({...formData, driver_id: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Legal Name</label>
                  <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Authorization No</label>
                  <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="ID-12345" value={formData.license_no} onChange={e => setFormData({...formData, license_no: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Comms Phone</label>
                  <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="+92 ..." value={formData.contact_info} onChange={e => setFormData({...formData, contact_info: e.target.value})} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Identity Verification (CNIC)</label>
                <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="35202-..." value={formData.cnic} onChange={e => setFormData({...formData, cnic: e.target.value})} />
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-sky-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic">
                 Commit Enlistment
              </button>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-md p-12 text-center border border-white/50">
             <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-8">Talent Ingestion</h3>
             <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => setImportFile(e.target.files?.[0] || null)} />
             <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer border-4 border-dashed border-slate-100 rounded-[3rem] p-12 hover:border-sky-500 hover:bg-sky-50 transition-all mb-8">
                <p className="text-4xl mb-4">👔</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{importFile ? importFile.name : 'Select Pilot Manifest'}</p>
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