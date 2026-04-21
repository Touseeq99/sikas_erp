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
  type: 'driver' | 'employee'
}

export default function SalariesPage() {
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'driver' | 'employee'>('driver')
  const [showModal, setShowModal] = useState(false)
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null)
  const [selectedMonth, setSelectedMonth] = useState('Feb')
  const [formData, setFormData] = useState({
    salary_id: '',
    employee_id: '',
    month: 'Feb',
    amount: '',
    status: 'pending',
    type: 'driver' as 'driver' | 'employee'
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
    try {
      const [salariesRes, driversRes, employeesRes] = await Promise.all([
        supabase.from('salaries').select('*').eq('month', selectedMonth).order('salary_id'),
        supabase.from('drivers').select('*').order('driver_id'),
        supabase.from('employees').select('*').order('employee_id'),
      ])
      
      setSalaries(salariesRes.data || [])
      setDrivers(driversRes.data || [])
      setEmployees(employeesRes.data || [])
    } catch (error) {
      console.error('Error loading salaries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData, amount: parseFloat(formData.amount) || 0 }
    
    try {
      if (editingSalary) {
        const { error } = await supabase.from('salaries').update(payload).eq('id', editingSalary.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('salaries').insert(payload)
        if (error) throw error
      }
      
      setShowModal(false)
      setEditingSalary(null)
      resetForm()
      loadData()
      alert('Salary record saved successfully!')
    } catch (error: any) {
      alert('Save failed: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this salary record?')) {
      try {
        const { error } = await supabase.from('salaries').delete().eq('id', id)
        if (error) throw error
        loadData()
      } catch (error: any) {
        alert('Delete failed: ' + error.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({ 
      salary_id: '', 
      employee_id: '', 
      month: selectedMonth, 
      amount: '', 
      status: 'pending',
      type: activeTab
    })
  }

  const getPersonName = (id: string, type: string) => {
    if (type === 'driver') {
      const d = drivers.find(d => d.driver_id === id)
      return d?.name || id
    } else {
      const e = employees.find(e => e.employee_id === id)
      return e?.name || id
    }
  }

  const filteredSalaries = salaries.filter(s => s.type === activeTab || (!s.type && activeTab === 'driver'))
  
  const totalAmount = filteredSalaries.reduce((sum, s) => sum + (s.amount || 0), 0)
  const paidCount = filteredSalaries.filter(s => s.status === 'paid').length
  const pendingCount = filteredSalaries.filter(s => s.status === 'pending').length

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="space-y-10 pb-20">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Payroll <span className="text-emerald-500">Flow</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Human Capital Disbursement Engine</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <select className="bg-transparent border-none font-black text-sm outline-none px-4 cursor-pointer" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button onClick={() => { setEditingSalary(null); resetForm(); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-emerald-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Record Disbursement
          </button>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex space-x-3 bg-slate-100 p-2 rounded-[2.5rem] w-fit">
        <button 
          onClick={() => setActiveTab('driver')}
          className={`px-10 py-3 rounded-[2rem] font-black text-xs transition-all uppercase tracking-widest italic ${activeTab === 'driver' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
        >
          🚚 Drivers
        </button>
        <button 
          onClick={() => setActiveTab('employee')}
          className={`px-10 py-3 rounded-[2rem] font-black text-xs transition-all uppercase tracking-widest italic ${activeTab === 'employee' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
        >
          🏢 Employees
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Monthly Operating Cost</p>
          <p className="text-5xl font-black italic tracking-tighter">PKR {totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Settled Accounts</p>
          <p className="text-5xl font-black text-emerald-500 italic">{paidCount}</p>
        </div>
        <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Pending Clearance</p>
          <p className="text-5xl font-black text-amber-500 italic">{pendingCount}</p>
        </div>
      </div>

      {/* Pivot Table UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">ID Code</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Beneficiary</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Value (PKR)</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Lifecycle State</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSalaries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-2xl font-black text-slate-200 italic uppercase">No Disbursement Records</p>
                  </td>
                </tr>
              ) : (
                filteredSalaries.map((s) => (
                  <tr key={s.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-xl">{s.salary_id}</td>
                    <td className="px-8 py-8">
                       <span className="font-black text-slate-800 uppercase tracking-tight text-sm block">{getPersonName(s.employee_id, s.type || 'driver')}</span>
                       <span className="text-[10px] font-bold text-slate-400">UID: {s.employee_id}</span>
                    </td>
                    <td className="px-8 py-8 font-black text-slate-900 italic text-xl">{(s.amount || 0).toLocaleString()}</td>
                    <td className="px-8 py-8">
                      <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic tracking-widest ${s.status === 'paid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-amber-500 text-white shadow-lg shadow-amber-100'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-8 py-8 text-right">
                      <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { 
                          setEditingSalary(s); 
                          setFormData({ 
                            salary_id: s.salary_id, 
                            employee_id: s.employee_id, 
                            month: s.month, 
                            amount: s.amount?.toString() || '', 
                            status: s.status,
                            type: s.type || 'driver'
                          }); 
                          setShowModal(true) 
                        }} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-500 hover:text-white transition-all">✏️</button>
                        <button onClick={() => handleDelete(s.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disbursement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 overflow-y-auto max-h-[90vh] border border-white/50 relative">
            <button onClick={() => { setShowModal(false); setEditingSalary(null); resetForm() }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl transition-all font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">{editingSalary ? 'Modify Code' : 'Initialize Flow'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Disbursement Logic Configuration</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Salary ID *</label>
                  <input disabled className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Auto-generated" value={formData.salary_id} onChange={e => setFormData({...formData, salary_id: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Disbursement Node</label>
                  <select className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any, employee_id: ''})}>
                    <option value="driver">Driver Payroll</option>
                    <option value="employee">Staff Intelligence Payroll</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Select Node Recipient *</label>
                <select required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.employee_id} onChange={e => setFormData({...formData, employee_id: e.target.value})}>
                  <option value="">Select Recipient...</option>
                  {formData.type === 'driver' ? (
                    drivers.map(d => <option key={d.id} value={d.driver_id}>{d.name} ({d.driver_id})</option>)
                  ) : (
                    employees.map(e => <option key={e.id} value={e.employee_id}>{e.name} ({e.employee_id})</option>)
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Value (PKR) *</label>
                  <input required type="number" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="50,000" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Clearance State</label>
                  <select className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="pending">PENDING CLEARANCE</option>
                    <option value="paid">DISBURSEMENT COMPLETE</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-emerald-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic">
                 Execute Disbursement
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}