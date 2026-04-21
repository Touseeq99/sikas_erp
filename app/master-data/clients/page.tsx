'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Client {
  id: string
  client_id: string
}

interface Order {
  order_id: string
  client_id: string
  vehicle_id: string
}

interface Vehicle {
  vehicle_id: string
  is_outsourced: boolean
}

interface Revenue {
  order_id: string
  amount: number
  payment_status: string
}

interface ProfitTrip {
  order_id: string
  expenses: number
}

interface ClientStats {
  totalOrders: number
  outsourcedVehicleOrders: number
  inHouseVehicleOrders: number
  totalRevenue: number
  totalProfit: number
  pendingPayments: number
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [profits, setProfits] = useState<ProfitTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    client_id: '',
  })

  useEffect(() => {
    loadData()
    const channel = supabase.channel('clients-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenue' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profit_per_trip' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    try {
      const [clientsRes, ordersRes, vehiclesRes, revenueRes, profitRes] = await Promise.all([
        supabase.from('clients').select('id, client_id').order('client_id'),
        supabase.from('orders').select('order_id, client_id, vehicle_id'),
        supabase.from('vehicles').select('vehicle_id, is_outsourced'),
        supabase.from('revenue').select('order_id, amount, payment_status'),
        supabase.from('profit_per_trip').select('order_id, expenses, profit'),
      ])
      
      setClients(clientsRes.data || [])
      setOrders(ordersRes.data || [])
      setVehicles(vehiclesRes.data || [])
      setRevenues(revenueRes.data || [])
      setProfits(profitRes.data || [])
    } catch (error: any) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getClientStats = (clientId: string): ClientStats => {
    const clientOrders = orders.filter(o => o.client_id === clientId)
    const clientOrderIds = clientOrders.map(o => o.order_id)
    
    let outsourcedVehicleCount = 0
    let inHouseVehicleCount = 0

    clientOrders.forEach(o => {
      const vehicle = vehicles.find(v => v.vehicle_id === o.vehicle_id)
      if (vehicle?.is_outsourced) {
        outsourcedVehicleCount++
      } else {
        inHouseVehicleCount++
      }
    })

    const clientRevenues = revenues.filter(r => clientOrderIds.includes(r.order_id))
    const totalRevenue = clientRevenues.reduce((s, r) => s + (r.amount || 0), 0)
    const unpaidRevenue = clientRevenues.filter(r => r.payment_status === 'unpaid').reduce((s, r) => s + (r.amount || 0), 0)

    // DYNAMIC PROFIT CALCULATION logic:
    // Profit = (Revenue from Revenue Table) - (Expenses from Trip Table)
    const totalProfit = clientOrderIds.reduce((sum, oid) => {
       const rev = revenues.find(r => r.order_id === oid)?.amount || 0
       const trip = profits.find(p => p.order_id === oid)
       const exp = trip ? trip.expenses : 0
       return sum + (rev - exp)
    }, 0)

    return {
      totalOrders: clientOrders.length,
      outsourcedVehicleOrders: outsourcedVehicleCount,
      inHouseVehicleOrders: inHouseVehicleCount,
      totalRevenue,
      totalProfit,
      pendingPayments: unpaidRevenue
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = { ...formData, client_name: '-' }
      if (editingClient) {
        await supabase.from('clients').update(payload).eq('id', editingClient.id)
      } else {
        await supabase.from('clients').insert(payload)
      }
      setShowModal(false)
      setEditingClient(null)
      loadData()
      alert('Client saved.')
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('De-register this Client ID node?')) {
      try {
        await supabase.from('clients').delete().eq('id', id)
        loadData()
      } catch (error: any) {
        alert('Action failed: ' + error.message)
      }
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  const totalGlobalRevenue = revenues.reduce((s, r) => s + (r.amount || 0), 0)
  
  // Also calculate total global profit dynamically
  const totalGlobalProfit = orders.reduce((sum, o) => {
    const rev = revenues.find(r => r.order_id === o.order_id)?.amount || 0
    const trip = profits.find(p => p.order_id === o.order_id)
    const exp = trip ? trip.expenses : 0
    return sum + (rev - exp)
  }, 0)

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Client <span className="text-sky-500">Nodes</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Manage Clients</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <button onClick={() => { setEditingClient(null); setFormData({ client_id: '' }); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-sky-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Add Client
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Total Clients</p>
          <p className="text-5xl font-black italic tracking-tighter">{clients.length}<span className="text-sky-500 text-2xl uppercase ml-2 tracking-widest font-black">IDs</span></p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Total Profit</p>
          <p className="text-4xl font-black text-emerald-500 italic uppercase leading-none">PKR {(totalGlobalProfit/1000).toFixed(0)}K</p>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 block italic">Real-time sync enabled</span>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Pending Payments</p>
          <p className="text-4xl font-black text-red-500 italic uppercase">PKR {(revenues.filter(r => r.payment_status === 'unpaid').reduce((s, r) => s + (r.amount || 0), 0)/1000).toFixed(0)}K</p>
        </div>
      </div>

      {/* Pivot List UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Client ID</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Orders</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Vehicles</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Profit</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clients.map((c) => {
                const stats = getClientStats(c.client_id)
                return (
                  <tr key={c.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl leading-none">{c.client_id}</td>
                    <td className="px-8 py-8">
                       <span className="font-black text-slate-800 uppercase tracking-tight text-sm block leading-none">{stats.totalOrders} Orders</span>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">Stability: VERIFIED</span>
                    </td>
                    <td className="px-8 py-8">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black uppercase italic text-emerald-600 flex items-center gap-1">
                           <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> {stats.inHouseVehicleOrders} In-House
                        </span>
                        <span className="text-[10px] font-black uppercase italic text-purple-600 flex items-center gap-1">
                           <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> {stats.outsourcedVehicleOrders} Outsourced
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                       <div className="flex flex-col">
                          <span className={`font-black italic text-xl tracking-tighter ${stats.totalProfit >= 0 ? 'text-sky-500' : 'text-red-500'}`}>
                             PKR {stats.totalProfit.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1 italic">Synced with Revenue</span>
                       </div>
                    </td>
                    <td className="px-8 py-8 text-right">
                      <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingClient(c); setFormData({ client_id: c.client_id }); setShowModal(true) }} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-900 hover:text-white transition-all">✏️</button>
                        <button onClick={() => handleDelete(c.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

       {/* Node Registration Modal */}
       {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-lg p-14 overflow-y-auto max-h-[90vh] border border-white/50 relative">
            <button onClick={() => { setShowModal(false); setEditingClient(null) }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl transition-all font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2 leading-none">{editingClient ? 'Edit Client' : 'Add Client'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Client Details</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Client ID *</label>
                <input disabled className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Auto-generated" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})} />
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-sky-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic leading-none">
                 Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
