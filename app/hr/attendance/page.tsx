'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface AttendanceRecord {
  id: string
  attendance_id: string
  driver_id?: string
  employee_id?: string
  attendance_date: string
  status: string
  notes?: string
  type: 'driver' | 'employee'
  is_outsourced?: boolean
}

interface Driver {
  id: string
  driver_id: string
  name: string
}

interface Employee {
  id: string
  employee_id: string
  name: string
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('all')
  const [formData, setFormData] = useState({
    attendance_id: '',
    type: 'driver' as 'driver' | 'employee',
    driver_id: '',
    employee_id: '',
    attendance_date: new Date().toISOString().split('T')[0],
    status: 'present',
    is_outsourced: false,
    notes: ''
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('attendance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedDate])

  const loadData = async () => {
    try {
      let query = supabase.from('attendance').select('*').order('attendance_date', { ascending: false })
      if (selectedDate !== 'all') {
        query = query.eq('attendance_date', selectedDate)
      }
      
      const [recordsRes, driversRes, employeesRes] = await Promise.all([
        query,
        supabase.from('drivers').select('*').order('name'),
        supabase.from('employees').select('*').order('name'),
      ])
      
      setRecords(recordsRes.data || [])
      setDrivers(driversRes.data || [])
      setEmployees(employeesRes.data || [])
    } catch (error: any) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: any = {
      attendance_id: formData.attendance_id || `ATT${Date.now()}`,
      attendance_date: formData.attendance_date,
      status: formData.status,
      notes: formData.notes,
      type: formData.type
    }
    
    if (formData.type === 'driver') {
      payload.driver_id = formData.is_outsourced ? 'OUTSOURCED' : formData.driver_id
      payload.is_outsourced = formData.is_outsourced
    } else {
      payload.employee_id = formData.employee_id
    }
    
    try {
      if (editingRecord) {
        await supabase.from('attendance').update(payload).eq('id', editingRecord.id)
      } else {
        await supabase.from('attendance').insert(payload)
      }
      setShowModal(false)
      setEditingRecord(null)
      resetForm()
      loadData()
      alert('Presence log updated.')
    } catch (error: any) {
      alert('Update failed: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete presence log permanently?')) {
      try {
        await supabase.from('attendance').delete().eq('id', id)
        loadData()
      } catch (error: any) {
        alert('Action failed: ' + error.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({ 
      attendance_id: '', 
      type: 'driver',
      driver_id: '', 
      employee_id: '',
      attendance_date: new Date().toISOString().split('T')[0], 
      status: 'present',
      is_outsourced: false,
      notes: ''
    })
  }

  const getDisplayName = (record: AttendanceRecord) => {
    if (record.type === 'employee') {
      const emp = employees.find(e => e.employee_id === record.employee_id)
      return emp ? emp.name : `Emp ${record.employee_id}`
    } else {
      if (record.is_outsourced || record.driver_id === 'OUTSOURCED') return 'Outsourced Driver'
      const driver = drivers.find(d => d.driver_id === record.driver_id)
      return driver ? driver.name : `Drv ${record.driver_id}`
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  const presentCount = records.filter(r => r.status === 'present').length
  const absentCount = records.filter(r => r.status === 'absent').length

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Attendance</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Attendance Tracking</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <input type="date" className="bg-transparent border-none font-black text-sm outline-none px-4 cursor-pointer" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          <button onClick={() => { setEditingRecord(null); resetForm(); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-emerald-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Add Record
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Active Force</p>
          <p className="text-4xl font-black italic tracking-tighter text-emerald-400">{presentCount}</p>
        </div>
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 italic">Absence Log</p>
          <p className="text-4xl font-black text-red-500 italic">{absentCount}</p>
        </div>
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 italic">Approved Leave</p>
          <p className="text-4xl font-black text-amber-500 italic">{records.filter(r => r.status === 'leave').length}</p>
        </div>
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 italic">Daily Samples</p>
          <p className="text-4xl font-black text-slate-900 italic">{records.length}</p>
        </div>
      </div>

      {/* Table UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">ID</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Identity</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Shift Date</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Status</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map((r) => (
                <tr key={r.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl">{r.attendance_id}</td>
                  <td className="px-8 py-8">
                     <span className="font-black text-slate-800 uppercase tracking-tight text-sm block leading-none">{getDisplayName(r)}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">{r.type === 'driver' ? 'Driver' : 'Employee'}</span>
                  </td>
                  <td className="px-8 py-8 text-slate-600 font-black italic tracking-tight">{r.attendance_date}</td>
                  <td className="px-8 py-8">
                    <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic tracking-widest ${r.status === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-red-500 text-white shadow-lg shadow-red-100'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { 
                        setEditingRecord(r); 
                        setFormData({ 
                          attendance_id: r.attendance_id, 
                          type: r.type || 'driver',
                          driver_id: r.driver_id || '', 
                          employee_id: r.employee_id || '',
                          attendance_date: r.attendance_date || '', 
                          status: r.status,
                          is_outsourced: r.is_outsourced || (r.driver_id === 'OUTSOURCED'),
                          notes: r.notes || ''
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

      {/* Log Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 overflow-y-auto max-h-[90vh] border border-white/50 relative">
            <button onClick={() => { setShowModal(false); setEditingRecord(null); resetForm() }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl transition-all font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">{editingRecord ? 'Edit Attendance' : 'Add Attendance'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Attendance Record</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Attendance ID *</label>
                  <input disabled className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Auto-generated" value={formData.attendance_id} onChange={e => setFormData({...formData, attendance_id: e.target.value})} />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Date</label>
                  <input type="date" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.attendance_date} onChange={e => setFormData({...formData, attendance_date: e.target.value})} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Type</label>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setFormData({...formData, type: 'driver'})} className={`flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] italic transition-all ${formData.type === 'driver' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}>Driver</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'employee'})} className={`flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] italic transition-all ${formData.type === 'employee' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}>Employee</button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Person *</label>
                {formData.type === 'driver' ? (
                  <div className="space-y-4">
                    <label className="flex items-center gap-4 cursor-pointer group px-6">
                      <input type="checkbox" className="w-6 h-6 rounded-lg text-emerald-500" checked={formData.is_outsourced} onChange={e => setFormData({...formData, is_outsourced: e.target.checked, status: e.target.checked ? 'outsourced' : 'present'})} />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic group-hover:text-slate-900 transition-colors">Outsourced</span>
                    </label>
                    {!formData.is_outsourced && (
                      <select required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.driver_id} onChange={e => setFormData({...formData, driver_id: e.target.value})}>
                        <option value="">Select Driver...</option>
                        {drivers.map(d => <option key={d.id} value={d.driver_id}>{d.name}</option>)}
                      </select>
                    )}
                  </div>
                ) : (
                  <select required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.employee_id} onChange={e => setFormData({...formData, employee_id: e.target.value})}>
                    <option value="">Select Person...</option>
                    {employees.map(e => <option key={e.id} value={e.employee_id}>{e.name}</option>)}
                  </select>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Presence State Logic</label>
                <select required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="present">NOMINAL :: PRESENT</option>
                  <option value="absent">ALERT :: ABSENT</option>
                  <option value="leave">PROTOCOL :: LEAVE</option>
                  <option value="late">PROTOCOL :: LATE</option>
                </select>
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-emerald-500 transition-all active:scale-[0.98] uppercase tracking-[0.1em] italic">
                 Commit Presence State
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}