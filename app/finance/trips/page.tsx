'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface ProfitTrip {
  id: string
  trip_id: string
  order_id: string
  revenue: number
  expenses: number
  profit: number
}

interface Order {
  id: string
  order_id: string
  client_id: string
}

export default function TripsPage() {
  const [trips, setTrips] = useState<ProfitTrip[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTrip, setEditingTrip] = useState<ProfitTrip | null>(null)
  const [formData, setFormData] = useState({
    trip_id: '',
    order_id: '',
    revenue: '',
    expenses: '',
    profit: '',
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('trips-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profit_per_trip' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    const [tripsRes, ordersRes] = await Promise.all([
      supabase.from('profit_per_trip').select('*').order('trip_id'),
      supabase.from('orders').select('*').order('order_id'),
    ])
    setTrips(tripsRes.data || [])
    setOrders(ordersRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { 
      ...formData, 
      revenue: parseFloat(formData.revenue) || 0,
      expenses: parseFloat(formData.expenses) || 0,
      profit: parseFloat(formData.profit) || (parseFloat(formData.revenue) || 0) - (parseFloat(formData.expenses) || 0)
    }
    
    if (editingTrip) {
      await supabase.from('profit_per_trip').update(payload).eq('id', editingTrip.id)
    } else {
      await supabase.from('profit_per_trip').insert(payload)
    }
    
    setShowModal(false)
    setEditingTrip(null)
    resetForm()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this trip?')) {
      await supabase.from('profit_per_trip').delete().eq('id', id)
      loadData()
    }
  }

  const resetForm = () => {
    setFormData({ trip_id: '', order_id: '', revenue: '', expenses: '', profit: '' })
  }

  const getOrderInfo = (orderId: string) => {
    const order = orders.find(o => o.order_id === orderId)
    return order?.order_id || orderId
  }

  const totalRevenue = trips.reduce((sum, t) => sum + (t.revenue || 0), 0)
  const totalExpenses = trips.reduce((sum, t) => sum + (t.expenses || 0), 0)
  const totalProfit = trips.reduce((sum, t) => sum + (t.profit || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">🛣️ Trips & Revenue</h1>
          <p className="text-slate-500 mt-1">Track trips and profit</p>
        </div>
        <button onClick={() => { setEditingTrip(null); resetForm(); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
          <span>+</span> Add Trip
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-600">PKR {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">PKR {totalExpenses.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Net Profit</p>
          <p className="text-2xl font-bold text-sky-600">PKR {totalProfit.toLocaleString()}</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Trip ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Order</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Revenue (PKR)</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Expenses (PKR)</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Profit (PKR)</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {trips.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">🛣️</div>
                  No trips found.
                </td>
              </tr>
            ) : (
              trips.map((t) => (
                <tr key={t.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{t.trip_id}</td>
                  <td className="px-6 py-4 text-slate-600">{getOrderInfo(t.order_id)}</td>
                  <td className="px-6 py-4 text-emerald-600 font-medium">{t.revenue?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-red-600">{t.expenses?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sky-600 font-bold">{t.profit?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditingTrip(t); setFormData({ trip_id: t.trip_id, order_id: t.order_id, revenue: t.revenue?.toString() || '', expenses: t.expenses?.toString() || '', profit: t.profit?.toString() || '' }); setShowModal(true) }} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
                    <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
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
              <h2 className="text-xl font-bold text-slate-800">{editingTrip ? 'Edit Trip' : 'Add Trip'}</h2>
              <button onClick={() => { setShowModal(false); setEditingTrip(null); resetForm() }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Trip ID *</label>
                  <input required className="input" placeholder="PT1601" value={formData.trip_id} onChange={e => setFormData({...formData, trip_id: e.target.value})} />
                </div>
                <div>
                  <label className="label">Order *</label>
                  <select required className="input" value={formData.order_id} onChange={e => setFormData({...formData, order_id: e.target.value})}>
                    <option value="">Select Order</option>
                    {orders.map(o => <option key={o.id} value={o.order_id}>{o.order_id}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Revenue (PKR)</label>
                  <input type="number" className="input" placeholder="25000" value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value})} />
                </div>
                <div>
                  <label className="label">Expenses (PKR)</label>
                  <input type="number" className="input" placeholder="12000" value={formData.expenses} onChange={e => setFormData({...formData, expenses: e.target.value})} />
                </div>
                <div>
                  <label className="label">Profit (PKR)</label>
                  <input type="number" className="input" placeholder="13000" value={formData.profit} onChange={e => setFormData({...formData, profit: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingTrip(null); resetForm() }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTrip ? 'Update' : 'Add'} Trip</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}