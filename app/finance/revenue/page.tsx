'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

interface RevenueManifest {
  id: string
  revenue_id: string
  order_id: string
  client_id: string
  client_name?: string
  amount: number
  expenses: number
  profit: number
  payment_status: string
  revenue_date: string
  weight_tons?: number
  rate_per_ton?: number
  order_details?: {
    vehicle_id: string
    driver_id: string
    is_outsourced: boolean
  }
}

interface Order {
  id: string
  order_id: string
  client_id: string
  vehicle_id: string
  driver_id: string
  is_outsourced: boolean
}

interface Client {
  id: string
  client_id: string
  name: string
}

export default function RevenuePage() {
  const [records, setRecords] = useState<RevenueManifest[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [totalMaintenanceCost, setTotalMaintenanceCost] = useState(0)
  const [totalTripExpenses, setTotalTripExpenses] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RevenueManifest | null>(null)

  const formatAmount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
    return num.toString()
  }
  
  const [formData, setFormData] = useState({
    revenue_id: '',
    order_id: '',
    client_id: '',
    amount: '',
    expenses: '',
    profit: '',
    payment_status: 'paid',
    revenue_date: new Date().toISOString().split('T')[0],
    weight_tons: '',
    rate_per_ton: '',
  })

  useEffect(() => {
    loadData()
    const channel = supabase.channel('central-financial-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenue' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profit_per_trip' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Dynamic Revenue & Profit Calculation
  useEffect(() => {
    const weight = parseFloat(formData.weight_tons) || 0
    const rate = parseFloat(formData.rate_per_ton) || 0
    const amountCalculated = weight > 0 && rate > 0 ? (weight * rate) : (parseFloat(formData.amount) || 0)
    
    const exp = parseFloat(formData.expenses) || 0
    setFormData(prev => ({ 
      ...prev, 
      amount: amountCalculated > 0 ? amountCalculated.toString() : prev.amount,
      profit: (amountCalculated - exp).toString() 
    }))
  }, [formData.weight_tons, formData.rate_per_ton, formData.expenses])

  const loadData = async () => {
    try {
      const [revRes, tripsRes, ordersRes, clientsRes, expensesRes, maintenanceRes] = await Promise.all([
        supabase.from('revenue').select('*'),
        supabase.from('profit_per_trip').select('*'),
        supabase.from('orders').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('expenses').select('amount'),
        supabase.from('maintenance_records').select('cost'),
      ])

      // Calculate total expenses from expenses table
      const expTotal = (expensesRes.data || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
      setTotalExpenses(expTotal)

      // Calculate total maintenance cost
      const maintTotal = (maintenanceRes.data || []).reduce((sum: number, m: any) => sum + (m.cost || 0), 0)
      setTotalMaintenanceCost(maintTotal)

      // Calculate total per-order/trip expenses
      const tripExpTotal = (tripsRes.data || []).reduce((sum: number, t: any) => sum + (t.expenses || 0), 0)
      setTotalTripExpenses(tripExpTotal)

      const clientsMap = new Map((clientsRes.data || []).map(c => [c.client_code || c.client_id, c.client_name || c.name]))

      const mergedData: RevenueManifest[] = (revRes.data || []).map(rev => {
        const trip = (tripsRes.data || []).find(t => t.order_id === rev.order_id)
        const order = (ordersRes.data || []).find(o => o.order_id === rev.order_id)
        const clientId = rev.client_id || order?.client_id || 'Unknown'
        const clientName = clientsMap.get(clientId) || clientId || 'Unknown'
        return {
          ...rev,
          client_id: clientId,
          client_name: clientName,
          revenue_date: rev.revenue_date || rev.received_date || '',
          expenses: trip ? (trip.expenses || 0) : 0,
          profit: trip ? (trip.profit || 0) : rev.amount,
          order_details: order ? {
            vehicle_id: order.vehicle_id,
            driver_id: order.driver_id,
            is_outsourced: order.is_outsourced
          } : undefined
        }
      })

      setRecords(mergedData.sort((a,b) => (b.revenue_date || '').localeCompare(a.revenue_date || '')))
      setOrders(ordersRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleOrderChange = (orderId: string) => {
    const order = orders.find(o => o.order_id === orderId)
    setFormData({ ...formData, order_id: orderId, client_id: order?.client_id || '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.revenue_date || formData.revenue_date.trim() === '') {
      alert('Please select a transaction date')
      return
    }
    const revAmount = parseFloat(formData.amount) || 0
    const expAmount = parseFloat(formData.expenses) || 0
    const profitAmount = revAmount - expAmount

    try {
      const revPayload = {
        revenue_id: formData.revenue_id,
        order_id: formData.order_id,
        amount: revAmount,
        payment_status: formData.payment_status,
        revenue_date: formData.revenue_date,
        weight_tons: parseFloat(formData.weight_tons) || 0,
        rate_per_ton: parseFloat(formData.rate_per_ton) || 0
      }

      const tripPayload = {
        trip_id: `TR-${formData.order_id}`,
        order_id: formData.order_id,
        revenue: revAmount,
        expenses: expAmount,
        profit: profitAmount
      }

      // Sequential Execution for robustness
      if (editingRecord) {
        const { error: revErr } = await supabase.from('revenue').update(revPayload).eq('id', editingRecord.id)
        if (revErr) throw revErr
      } else {
        const { error: revErr } = await supabase.from('revenue').insert(revPayload)
        if (revErr) throw revErr
      }

      // SYNC THE PROFIT MANIFEST
      const { data: existingTrip } = await supabase.from('profit_per_trip').select('id').eq('order_id', formData.order_id).single()
      
      if (existingTrip) {
        const { error: tripErr } = await supabase.from('profit_per_trip').update(tripPayload).eq('id', existingTrip.id)
        if (tripErr) throw tripErr
      } else {
        const { error: tripErr } = await supabase.from('profit_per_trip').insert(tripPayload)
        if (tripErr) throw tripErr
      }

      setShowModal(false)
      setEditingRecord(null)
      resetForm()
      loadData()
      alert('Record saved successfully.')
    } catch (error: any) {
      console.error('Save failed:', error)
      alert('Sync Failed: ' + (error.message || 'Check connection'))
    }
  }

  const handleDelete = async (id: string) => {
    const record = records.find(r => r.id === id);
    if (!record) return;
    
    if (confirm('Delete this record?')) {
      try {
        const { error: revErr } = await supabase.from('revenue').delete().eq('id', id)
        if (revErr) throw revErr

        // CLEANUP LINKED TRIP DATA
        await supabase.from('profit_per_trip').delete().eq('order_id', record.order_id)
        
        loadData()
      } catch (error: any) {
        alert('Action failed: ' + error.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({ 
      revenue_id: '', order_id: '', client_id: '', amount: '', 
      expenses: '', profit: '', payment_status: 'paid', 
      revenue_date: new Date().toISOString().split('T')[0],
      weight_tons: '',
      rate_per_ton: '' 
    })
  }

  const totalInflow = records.reduce((sum, r) => sum + (r.amount || 0), 0)
  const allExpenses = totalExpenses + totalMaintenanceCost + totalTripExpenses
  const totalNetValue = totalInflow - allExpenses

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="space-y-10 pb-20">
      {/* Central Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Revenue</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Revenue Tracking</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <Link href="/finance/expenses" className="px-6 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-[1.5rem] font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest italic">
            💸 Expenses
          </Link>
          <Link href="/fleet/maintenance" className="px-6 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-[1.5rem] font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest italic">
            🔧 Maintenance
          </Link>
          <button onClick={() => { setEditingRecord(null); resetForm(); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-emerald-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Add Record
          </button>
        </div>
      </div>

      {/* Sovereign Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group border border-white/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Total Revenue</p>
          <p className="text-5xl font-black italic tracking-tighter text-emerald-400">PKR {formatAmount(totalInflow)}</p>
        </div>
        <Link href="/finance/expenses" className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-red-200 hover:shadow-red-100/50 hover:shadow-lg transition-all cursor-pointer block">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Total Expenses</p>
          <p className="text-5xl font-black text-red-500 italic uppercase">PKR {formatAmount(allExpenses)}</p>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Operational: PKR {formatAmount(totalExpenses)}</span>
            <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">Maintenance: PKR {formatAmount(totalMaintenanceCost)}</span>
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Order Outflow: PKR {formatAmount(totalTripExpenses)}</span>
          </div>
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-3 opacity-0 group-hover:opacity-100 transition-all">View Details →</p>
        </Link>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Net Profit</p>
          <p className={`text-5xl font-black italic uppercase ${totalNetValue >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>PKR {formatAmount(totalNetValue)}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Revenue − Expenses</p>
        </div>
      </div>

      {/* The Central Ledger Table */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">ID</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Order / Client</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Asset (In House/Outsource)</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Inflow / Burn</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Net Profit</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map((r) => (
                <tr key={r.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl uppercase leading-none">{r.revenue_id || 'ENTRY'}</td>
                  <td className="px-8 py-8">
<span className="font-black text-slate-800 uppercase tracking-tight text-xl block leading-none italic">{r.order_id}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">CLIENT: {r.client_id}</span>
                  </td>
                  <td className="px-8 py-8">
                     <div className="flex flex-col">
                        <span className="font-black text-slate-900 italic text-sm uppercase">{r.order_details?.vehicle_id || 'EXTERNAL'}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${r.order_details?.is_outsourced ? 'text-purple-500' : 'text-emerald-500'}`}>
                           {r.order_details?.is_outsourced ? 'OUTSOURCED' : 'IN-HOUSE'}
                        </span>
                     </div>
                  </td>
                  <td className="px-8 py-8">
                    <div className="flex flex-col">
                       <span className="font-black text-emerald-600 italic text-xl tracking-tighter">{formatAmount(r.amount || 0)}</span>
                       <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">-{formatAmount(r.expenses || 0)}</span>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                     <span className={`inline-flex px-4 py-1.5 rounded-full text-[12px] font-black uppercase italic tracking-widest ${r.profit > 0 ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-red-600 bg-red-50 border border-red-100'}`}>
                        Yield: {formatAmount(r.profit || 0)}
                     </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { 
                        setEditingRecord(r); 
                        setFormData({ 
                          revenue_id: r.revenue_id || '', order_id: r.order_id || '', client_id: r.client_id || '', 
                          amount: r.amount?.toString() || '', expenses: r.expenses?.toString() || '', 
                          profit: r.profit?.toString() || '', payment_status: r.payment_status || 'paid', 
                          revenue_date: r.revenue_date || '',
                          weight_tons: r.weight_tons?.toString() || '',
                          rate_per_ton: r.rate_per_ton?.toString() || ''
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

      {/* The Sovereign Modal - The One Place for All Details */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 border border-white/50 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => { setShowModal(false); setEditingRecord(null); resetForm() }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2 leading-none">{editingRecord ? 'Edit Revenue' : 'Add Revenue'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12 italic">Revenue Information</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Revenue ID *</label>
                  <input disabled className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner uppercase" placeholder="Auto-generated" value={formData.revenue_id} onChange={e => setFormData({...formData, revenue_id: e.target.value})} />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Order ID *</label>
                   <select required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.order_id} onChange={e => handleOrderChange(e.target.value)}>
                     <option value="">Select Target...</option>
                     {orders.map(o => <option key={o.id} value={o.order_id}>{o.order_id} - {o.client_id}</option>)}
                   </select>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Weight (Tons) *</label>
                   <input required type="number" step="0.01" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="0" value={formData.weight_tons} onChange={e => setFormData({...formData, weight_tons: e.target.value})} />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Rate Per Ton (PKR) *</label>
                   <input required type="number" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="0" value={formData.rate_per_ton} onChange={e => setFormData({...formData, rate_per_ton: e.target.value})} />
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic ml-4 italic">Calculated Amount *</label>
                  <input readOnly type="number" className="w-full h-16 bg-emerald-50 border-2 border-emerald-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner" value={formData.amount} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-red-500 uppercase tracking-widest italic ml-4 italic">Expenses *</label>
                  <input required type="number" className="w-full h-16 bg-red-50 border-2 border-red-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-red-500 outline-none transition-all shadow-inner" placeholder="15,000" value={formData.expenses} onChange={e => setFormData({...formData, expenses: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest italic ml-4">Net Profit (Calculated)</label>
                    <input readOnly className="w-full h-16 bg-sky-50 border-2 border-sky-100 rounded-2xl px-6 font-black text-2xl italic text-sky-600 outline-none shadow-inner" value={formData.profit} />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Date</label>
                    <input type="date" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.revenue_date} onChange={e => setFormData({...formData, revenue_date: e.target.value})} />
                 </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Payment Status</label>
                <select className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.payment_status} onChange={e => setFormData({...formData, payment_status: e.target.value})}>
                  <option value="paid">STATE :: FULLY COLLECTED</option>
                  <option value="unpaid">STATE :: PENDING FLOW</option>
                </select>
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-emerald-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic leading-none">
                 Save Revenue
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
