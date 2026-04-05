'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface AttendanceRecord {
  id: string
  attendance_id: string
  driver_id: string
  attendance_date: string
  status: string
}

interface Driver {
  id: string
  driver_id: string
  name: string
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('all')
  const [formData, setFormData] = useState({
    attendance_id: '',
    driver_id: '',
    attendance_date: '',
    status: 'present',
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
    let query = supabase.from('attendance').select('*').order('attendance_id')
    if (selectedDate !== 'all') {
      query = query.eq('attendance_date', selectedDate)
    }
    const [recordsRes, driversRes] = await Promise.all([
      query,
      supabase.from('drivers').select('*').order('driver_id'),
    ])
    setRecords(recordsRes.data || [])
    setDrivers(driversRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData }
    
    if (editingRecord) {
      await supabase.from('attendance').update(payload).eq('id', editingRecord.id)
    } else {
      await supabase.from('attendance').insert(payload)
    }
    
    setShowModal(false)
    setEditingRecord(null)
    resetForm()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      await supabase.from('attendance').delete().eq('id', id)
      loadData()
    }
  }

  const resetForm = () => {
    setFormData({ attendance_id: '', driver_id: '', attendance_date: '', status: 'present' })
  }

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.driver_id === driverId)
    return driver?.name || driverId
  }

  const statusColors: Record<string, string> = {
    present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    absent: 'bg-red-100 text-red-700 border-red-200',
    leave: 'bg-amber-100 text-amber-700 border-amber-200',
    late: 'bg-orange-100 text-orange-700 border-orange-200',
  }

  const statusLabels: Record<string, string> = {
    present: 'Present',
    absent: 'Absent',
    leave: 'Leave',
    late: 'Late',
  }

  const presentCount = records.filter(r => r.status === 'present').length
  const absentCount = records.filter(r => r.status === 'absent').length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">📅 Attendance</h1>
          <p className="text-slate-500 mt-1">Track driver attendance</p>
        </div>
        <div className="flex items-center space-x-4">
          <select className="input w-40" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
            <option value="all">All Dates</option>
            <option value="2026-01-22">2026-01-22</option>
            <option value="2026-02-19">2026-02-19</option>
            <option value="2026-03-22">2026-03-22</option>
            <option value="2026-04-21">2026-04-21</option>
          </select>
          <button onClick={() => { setEditingRecord(null); resetForm(); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
            <span>+</span> Mark Attendance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Present</p>
          <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Absent</p>
          <p className="text-2xl font-bold text-red-600">{absentCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">On Leave</p>
          <p className="text-2xl font-bold text-amber-600">{records.filter(r => r.status === 'leave').length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Records</p>
          <p className="text-2xl font-bold text-slate-800">{records.length}</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Attendance ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Driver</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">📅</div>
                  No attendance records found.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{r.attendance_id}</td>
                  <td className="px-6 py-4 text-slate-600">{getDriverName(r.driver_id)}</td>
                  <td className="px-6 py-4 text-slate-600">{r.attendance_date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusColors[r.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditingRecord(r); setFormData({ attendance_id: r.attendance_id, driver_id: r.driver_id, attendance_date: r.attendance_date || '', status: r.status }); setShowModal(true) }} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
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
              <h2 className="text-xl font-bold text-slate-800">{editingRecord ? 'Edit Attendance' : 'Mark Attendance'}</h2>
              <button onClick={() => { setShowModal(false); setEditingRecord(null); resetForm() }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Attendance ID *</label>
                  <input required className="input" placeholder="A1101" value={formData.attendance_id} onChange={e => setFormData({...formData, attendance_id: e.target.value})} />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={formData.attendance_date} onChange={e => setFormData({...formData, attendance_date: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Driver *</label>
                  <select required className="input" value={formData.driver_id} onChange={e => setFormData({...formData, driver_id: e.target.value})}>
                    <option value="">Select Driver</option>
                    {drivers.map(d => <option key={d.id} value={d.driver_id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status *</label>
                  <select required className="input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="leave">Leave</option>
                    <option value="late">Late</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingRecord(null); resetForm() }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingRecord ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}