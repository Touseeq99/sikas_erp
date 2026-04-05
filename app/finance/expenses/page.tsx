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
    expense_date: '',
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
    const [expensesRes, vehiclesRes] = await Promise.all([
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('vehicles').select('*').order('vehicle_id'),
    ])
    setExpenses(expensesRes.data || [])
    setVehicles(vehiclesRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData, amount: parseFloat(formData.amount) || 0 }
    
    if (editingExpense) {
      await supabase.from('expenses').update(payload).eq('id', editingExpense.id)
    } else {
      await supabase.from('expenses').insert(payload)
    }
    
    setShowModal(false)
    setEditingExpense(null)
    resetForm()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      await supabase.from('expenses').delete().eq('id', id)
      loadData()
    }
  }

  const resetForm = () => {
    setFormData({ expense_id: '', expense_date: '', category: 'fuel', amount: '', notes: '', vehicle_id: '', receipt_number: '' })
  }

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.vehicle_id === vehicleId)
    return vehicle ? `${vehicle.vehicle_id} (${vehicle.registration_no})` : '-'
  }

  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">📊 Expenses</h1>
          <p className="text-slate-500 mt-1">Track all expenses</p>
        </div>
        <button onClick={() => { setEditingExpense(null); resetForm(); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
          <span>+</span> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">PKR {totalAmount.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">This Month</p>
          <p className="text-2xl font-bold text-slate-800">PKR {expenses.filter(e => e.expense_date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Records</p>
          <p className="text-2xl font-bold text-slate-800">{expenses.length}</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Expense ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Amount (PKR)</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Notes</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">📊</div>
                  No expenses found.
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{e.expense_id}</td>
                  <td className="px-6 py-4 text-slate-600">{e.expense_date}</td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{e.category}</td>
                  <td className="px-6 py-4 text-red-600 font-medium">{e.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-600">{e.notes || '-'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditingExpense(e); setFormData({ expense_id: e.expense_id, expense_date: e.expense_date || '', category: e.category || 'fuel', amount: e.amount?.toString() || '', notes: e.notes || '', vehicle_id: e.vehicle_id || '', receipt_number: e.receipt_number || '' }); setShowModal(true) }} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
                    <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
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
              <h2 className="text-xl font-bold text-slate-800">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => { setShowModal(false); setEditingExpense(null); resetForm() }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Expense ID *</label>
                  <input required className="input" placeholder="E1401" value={formData.expense_id} onChange={e => setFormData({...formData, expense_id: e.target.value})} />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category *</label>
                  <select required className="input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Amount (PKR)</label>
                  <input type="number" className="input" placeholder="12000" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} placeholder="Diesel refill" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingExpense(null); resetForm() }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingExpense ? 'Update' : 'Add'} Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}