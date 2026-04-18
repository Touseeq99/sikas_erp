'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Expense {
  id: string
  expense_id: string
  expense_date: string
  category: string
  amount: number
  notes?: string
  vehicle_id?: string
  receipt_number?: string
}

interface Vehicle {
  id: string
  vehicle_id: string
  registration_no: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [formData, setFormData] = useState({
    expense_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: 'fuel',
    amount: '',
    notes: '',
    vehicle_id: '',
    receipt_number: '',
  })

  const categories = ['fuel', 'maintenance', 'salaries', 'toll', 'parking', 'other']

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('expenses-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    try {
      const [expensesRes, vehiclesRes] = await Promise.all([
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('vehicles').select('*').order('vehicle_id'),
      ])
      setExpenses(expensesRes.data || [])
      setVehicles(vehiclesRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // CRITICAL: Ensure vehicle_id is null if empty string to avoid FK violation
    const payload = { 
      ...formData, 
      amount: parseFloat(formData.amount) || 0,
      vehicle_id: formData.vehicle_id === '' ? null : formData.vehicle_id
    }
    
    try {
      if (editingExpense) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingExpense.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('expenses').insert(payload)
        if (error) throw error
      }
      setShowModal(false)
      setEditingExpense(null)
      resetForm()
      loadData()
      alert('Burn ledger updated.')
    } catch (error: any) {
      alert('Action failed: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Permanently redact this expense entry?')) {
      try {
        const { error } = await supabase.from('expenses').delete().eq('id', id)
        if (error) throw error
        loadData()
      } catch (error: any) {
        alert('Action failed: ' + error.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({ 
      expense_id: '', 
      expense_date: new Date().toISOString().split('T')[0], 
      category: 'fuel', 
      amount: '', 
      notes: '', 
      vehicle_id: '', 
      receipt_number: '' 
    })
  }

  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const monthlyAmount = expenses
    .filter(e => e.expense_date?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, e) => sum + (e.amount || 0), 0)

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
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Burn <span className="text-red-500">Rate</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Operational Expenditure Manifest</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <button onClick={() => { setEditingExpense(null); resetForm(); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-red-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Log Burn Event
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Total Aggregated Burn</p>
          <p className="text-5xl font-black italic tracking-tighter text-red-400">PKR {(totalAmount/1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Monthly Burn Flow</p>
          <p className="text-5xl font-black text-red-500 italic uppercase">PKR {(monthlyAmount/1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Data Samples</p>
          <p className="text-5xl font-black text-slate-900 italic uppercase">{expenses.length}</p>
        </div>
      </div>

      {/* Persistence Table UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Entry ID</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Event Logic (Cat)</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Timestamp</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Value (PKR)</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {expenses.map((e) => (
                <tr key={e.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl leading-none uppercase">{e.expense_id}</td>
                  <td className="px-8 py-8">
                     <span className="font-black text-slate-800 uppercase tracking-tight text-sm block leading-none">{e.category}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block italic">{e.notes || 'No Remarks'}</span>
                  </td>
                  <td className="px-8 py-8 text-slate-600 font-black italic tracking-tight">{e.expense_date}</td>
                  <td className="px-8 py-8">
                     <span className="font-black text-red-600 italic text-xl tracking-tight">{(e.amount || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingExpense(e); setFormData({ expense_id: e.expense_id, expense_date: e.expense_date || '', category: e.category || 'fuel', amount: e.amount?.toString() || '', notes: e.notes || '', vehicle_id: e.vehicle_id || '', receipt_number: e.receipt_number || '' }); setShowModal(true) }} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-900 hover:text-white transition-all">✏️</button>
                      <button onClick={() => handleDelete(e.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Burn Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 border border-white/50 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => { setShowModal(false); setEditingExpense(null); resetForm() }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl transition-all font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2 leading-none">{editingExpense ? 'Modify Ledger' : 'Initialize Burn'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12 italic">Financial outflow identification</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Entry ID *</label>
                  <input required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner uppercase" placeholder="E-1400" value={formData.expense_id} onChange={e => setFormData({...formData, expense_id: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Event Timestamp</label>
                  <input type="date" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Category Logic *</label>
                  <select required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Valuation (PKR) *</label>
                  <input required type="number" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="50,000" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Asset Identification (Optional)</label>
                <select className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})}>
                  <option value="">General House Expense</option>
                  {vehicles.map(v => <option key={v.id} value={v.vehicle_id}>{v.vehicle_id} ({v.registration_no})</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Event Remarks</label>
                <textarea className="w-full h-32 bg-slate-50 border-2 border-slate-50 rounded-3xl px-6 py-4 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Describe the burn event..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-red-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic leading-none">
                 Commit Burn Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}