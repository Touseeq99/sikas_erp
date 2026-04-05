'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Salary {
  id: string
  salary_id: string
  employee_id: string
  month: string
  amount: number
  status: string
  payment_date?: string
}

export default function SalariesPage() {
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null)
  const [selectedMonth, setSelectedMonth] = useState('Feb')
  const [formData, setFormData] = useState({
    salary_id: '',
    employee_id: '',
    month: 'Feb',
    amount: '',
    status: 'pending',
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('salaries-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salaries' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedMonth])

  const loadData = async () => {
    const [salariesRes, driversRes] = await Promise.all([
      supabase.from('salaries').select('*').eq('month', selectedMonth).order('salary_id'),
      supabase.from('drivers').select('*').order('driver_id'),
    ])
    setSalaries(salariesRes.data || [])
    setDrivers(driversRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData, amount: parseFloat(formData.amount) || 0 }
    
    if (editingSalary) {
      await supabase.from('salaries').update(payload).eq('id', editingSalary.id)
    } else {
      await supabase.from('salaries').insert(payload)
    }
    
    setShowModal(false)
    setEditingSalary(null)
    resetForm()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this salary record?')) {
      await supabase.from('salaries').delete().eq('id', id)
      loadData()
    }
  }

  const resetForm = () => {
    setFormData({ salary_id: '', employee_id: '', month: 'Feb', amount: '', status: 'pending' })
  }

  const getEmployeeName = (employeeId: string) => {
    const driver = drivers.find(d => d.driver_id === employeeId)
    return driver?.name || employeeId
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    paid: 'Paid',
  }

  const totalAmount = salaries.reduce((sum, s) => sum + (s.amount || 0), 0)
  const paidCount = salaries.filter(s => s.status === 'paid').length
  const pendingCount = salaries.filter(s => s.status === 'pending').length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">💵 Salaries</h1>
          <p className="text-slate-500 mt-1">Manage employee salaries</p>
        </div>
        <div className="flex items-center space-x-4">
          <select className="input w-32" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button onClick={() => { setEditingSalary(null); resetForm(); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
            <span>+</span> Add Salary
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Total Amount</p>
          <p className="text-2xl font-bold text-slate-800">PKR {totalAmount.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Paid</p>
          <p className="text-2xl font-bold text-emerald-600">{paidCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Salary ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Month</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Amount (PKR)</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {salaries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">💵</div>
                  No salary records for this month.
                </td>
              </tr>
            ) : (
              salaries.map((s) => (
                <tr key={s.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.salary_id}</td>
                  <td className="px-6 py-4 text-slate-600">{getEmployeeName(s.employee_id)}</td>
                  <td className="px-6 py-4 text-slate-600">{s.month}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{s.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusColors[s.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[s.status] || s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditingSalary(s); setFormData({ salary_id: s.salary_id, employee_id: s.employee_id, month: s.month, amount: s.amount?.toString() || '', status: s.status }); setShowModal(true) }} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
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
              <h2 className="text-xl font-bold text-slate-800">{editingSalary ? 'Edit Salary' : 'Add Salary'}</h2>
              <button onClick={() => { setShowModal(false); setEditingSalary(null); resetForm() }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Salary ID *</label>
                  <input required className="input" placeholder="S1201" value={formData.salary_id} onChange={e => setFormData({...formData, salary_id: e.target.value})} />
                </div>
                <div>
                  <label className="label">Employee *</label>
                  <select required className="input" value={formData.employee_id} onChange={e => setFormData({...formData, employee_id: e.target.value})}>
                    <option value="">Select Employee</option>
                    {drivers.map(d => <option key={d.id} value={d.driver_id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Month *</label>
                  <select required className="input" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Amount (PKR)</label>
                  <input type="number" className="input" placeholder="50000" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingSalary(null); resetForm() }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingSalary ? 'Update' : 'Add'} Salary</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}