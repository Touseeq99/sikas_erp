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

interface Revenue {
  order_id: string
  amount: number
}

export default function TripsPage() {
  const [trips, setTrips] = useState<ProfitTrip[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [revenues, setRevenues] = useState<Revenue[]>([])
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

  // AUTO-CALCULATION LOGIC
  // Whenever Revenue or Expenses change, re-calculate Profit
  useEffect(() => {
    const rev = parseFloat(formData.revenue) || 0
    const exp = parseFloat(formData.expenses) || 0
    const calculatedProfit = rev - exp
    
    // We only update if the current manual profit isn't explicitly different (or just always auto-update for convenience)
    setFormData(prev => ({ ...prev, profit: calculatedProfit.toString() }))
  }, [formData.revenue, formData.expenses])

  const loadData = async () => {
    const [tripsRes, ordersRes, revenuesRes] = await Promise.all([
      supabase.from('profit_per_trip').select('*').order('trip_id'),
      supabase.from('orders').select('*').order('order_id'),
      supabase.from('revenue').select('order_id, amount'),
    ])
    setTrips(tripsRes.data || [])
    setOrders(ordersRes.data || [])
    setRevenues(revenuesRes.data || [])
    setLoading(false)
  }

  const handleOrderChange = (orderId: string) => {
    const relatedRevenue = revenues.find(r => r.order_id === orderId)
    setFormData(prev => ({
      ...prev,
      order_id: orderId,
      revenue: relatedRevenue ? relatedRevenue.amount.toString() : prev.revenue
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const rev = parseFloat(formData.revenue) || 0
    const exp = parseFloat(formData.expenses) || 0
    const payload = { 
      ...formData, 
      revenue: rev,
      expenses: exp,
      profit: rev - exp // Force auto-calculation on save
    }
    
    try {
      if (editingTrip) {
        await supabase.from('profit_per_trip').update(payload).eq('id', editingTrip.id)
      } else {
        await supabase.from('profit_per_trip').insert(payload)
      }
      setShowModal(false)
      setEditingTrip(null)
      resetForm()
      loadData()
      alert('Trip yield manifest committed.')
    } catch (error: any) {
      alert('Failed: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('De-register this trip manifest?')) {
      try {
        await supabase.from('profit_per_trip').delete().eq('id', id)
        loadData()
      } catch (error: any) {
        alert('Action failed: ' + error.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({ trip_id: '', order_id: '', revenue: '', expenses: '', profit: '' })
  }

  const totalRevenue = trips.reduce((sum, t) => sum + (t.revenue || 0), 0)
  const totalExpenses = trips.reduce((sum, t) => sum + (t.expenses || 0), 0)
  const totalProfit = trips.reduce((sum, t) => sum + (t.profit || 0), 0)

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
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Trip <span className="text-sky-500">Yield</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Automated Performance Manifest</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <button onClick={() => { setEditingTrip(null); resetForm(); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-sky-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Provision Yield Manifest
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Linked Gross Revenue</p>
          <p className="text-5xl font-black italic tracking-tighter text-emerald-400">PKR {(totalRevenue/1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Aggregated Yield Burn</p>
          <p className="text-5xl font-black text-red-500 italic uppercase">PKR {(totalExpenses/1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Net Operational Yield</p>
          <p className="text-5xl font-black text-sky-500 italic uppercase">PKR {(totalProfit/1000).toFixed(0)}K</p>
        </div>
      </div>

      {/* Persistence Table UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Manifest Key</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Linked Order</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Inflow / Outflow</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Calculated Yield</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {trips.map((t) => (
                <tr key={t.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl leading-none uppercase">{t.trip_id}</td>
                  <td className="px-8 py-8">
                     <span className="font-black text-slate-800 uppercase tracking-tight text-xl block leading-none italic underline decoration-sky-100 underline-offset-4">{t.order_id}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block italic">Autonomic linkage valid</span>
                  </td>
                  <td className="px-8 py-8">
                     <div className="flex flex-col">
                        <span className="font-black text-emerald-600 italic text-xl tracking-tighter">{(t.revenue || 0).toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none mt-1">Burn: {(t.expenses || 0).toLocaleString()}</span>
                     </div>
                  </td>
                  <td className="px-8 py-8">
                    <span className={`inline-flex px-4 py-1.5 rounded-full text-[12px] font-black uppercase italic tracking-widest ${t.profit > 0 ? 'text-sky-500 bg-sky-50 border border-sky-100' : 'text-red-500 bg-red-50 border border-red-100'}`}>
                      Net: {(t.profit || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingTrip(t); setFormData({ trip_id: t.trip_id, order_id: t.order_id, revenue: t.revenue?.toString() || '', expenses: t.expenses?.toString() || '', profit: t.profit?.toString() || '' }); setShowModal(true) }} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-900 hover:text-white transition-all">✏️</button>
                      <button onClick={() => handleDelete(t.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trip Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 border border-white/50 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => { setShowModal(false); setEditingTrip(null); resetForm() }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">{editingTrip ? 'Recalibrate Yield' : 'Compute Trip Yield'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12 italic">Performance manifest synchronized with Inflow Ledger</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Manifest Key *</label>
                  <input required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="PT-1600" value={formData.trip_id} onChange={e => setFormData({...formData, trip_id: e.target.value})} />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Link Operational Order *</label>
                   <select required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner border-sky-100" value={formData.order_id} onChange={e => handleOrderChange(e.target.value)}>
                     <option value="">Select ID...</option>
                     {orders.map(o => <option key={o.id} value={o.order_id}>{o.order_id} - {o.client_id}</option>)}
                   </select>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Inflow (PKR)</label>
                  <input type="number" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="25000" value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Trip Burn (Expenses)</label>
                  <input type="number" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="12000" value={formData.expenses} onChange={e => setFormData({...formData, expenses: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest italic ml-4">Final Net Profit</label>
                  <input readOnly className="w-full h-16 bg-sky-50 border-2 border-sky-100 rounded-2xl px-6 font-black text-2xl italic text-sky-600 outline-none transition-all shadow-inner cursor-not-allowed" placeholder="AUTO" value={formData.profit} />
                </div>
              </div>
              
              <div className="bg-sky-50 p-6 rounded-3xl border border-sky-100">
                 <p className="text-[10px] font-black text-sky-600 uppercase tracking-[0.2em] italic leading-relaxed text-center">
                    Manifest Logic: Inflow - Burn = Net Yield. Profit is automatically calculated for precision.
                 </p>
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-sky-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic leading-none">
                 Commit Yield Manifest
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}