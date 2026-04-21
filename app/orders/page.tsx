'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Order {
  id: string
  order_id: string
  client_id: string
  order_date: string
  driver_id: string
  vehicle_id: string
  status: string
  delivery_address?: string
  delivery_date?: string
  total_boxes?: number
  total_weight_tons?: number
  is_outsourced?: boolean
}

interface Client {
  id: string
  client_id: string
}

interface Vehicle {
  id: string
  vehicle_id: string
  type: string
  registration_no: string
  is_outsourced?: boolean
}

interface Driver {
  id: string
  driver_id: string
  name: string
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [formData, setFormData] = useState({
    order_id: '',
    client_id: '',
    order_date: new Date().toISOString().split('T')[0],
    driver_id: '',
    vehicle_id: '',
    status: 'pending',
    delivery_address: '',
    delivery_date: '',
    total_boxes: '',
    total_weight_tons: '',
    is_outsourced: false,
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    try {
      const [ordersRes, clientsRes, vehiclesRes, driversRes] = await Promise.all([
        supabase.from('orders').select('*').order('order_id'),
        supabase.from('clients').select('id, client_id'),
        supabase.from('vehicles').select('id, vehicle_id, type, registration_no, is_outsourced'),
        supabase.from('drivers').select('id, driver_id, name'),
      ])

      setOrders(ordersRes.data || [])
      setClients(clientsRes.data || [])
      setVehicles(vehiclesRes.data || [])
      setDrivers(driversRes.data || [])
    } catch (error: any) {
      console.error('Error loading orders data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = { ...formData }
    Object.keys(payload).forEach(key => { if (payload[key] === '') payload[key] = null })
    if (payload.total_boxes) payload.total_boxes = parseInt(payload.total_boxes)
    if (payload.total_weight_tons) payload.total_weight_tons = parseFloat(payload.total_weight_tons)
    
    try {
      if (editingOrder) {
        await supabase.from('orders').update(payload).eq('id', editingOrder.id)
      } else {
        await supabase.from('orders').insert(payload)
      }
      setShowModal(false)
      setEditingOrder(null)
      resetForm()
      loadData()
      alert('Operation flow committed.')
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Terminate this operational flow?')) {
      try {
        await supabase.from('orders').delete().eq('id', id)
        loadData()
      } catch (error: any) {
        alert('Action failed: ' + error.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      order_id: '', client_id: '', order_date: new Date().toISOString().split('T')[0],
      driver_id: '', vehicle_id: '', status: 'pending', delivery_address: '',
      delivery_date: '', total_boxes: '', total_weight_tons: '', is_outsourced: false,
    })
  }

  const filteredOrders = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)

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
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Operational <span className="text-sky-500">Flow</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Order Records</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <button onClick={() => { setEditingOrder(null); resetForm(); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-sky-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Add Order
          </button>
        </div>
      </div>

      {/* Filter Mode */}
      <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
        {['all', 'pending', 'dispatched', 'delivered'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-10 py-3 rounded-[2rem] font-black text-[10px] transition-all uppercase tracking-widest italic flex-shrink-0 ${filterStatus === status ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100'}`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Total Orders</p>
          <p className="text-5xl font-black italic tracking-tighter">{orders.length}<span className="text-sky-500 text-2xl uppercase ml-2 tracking-widest font-black">Entries</span></p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Active Pipelines</p>
          <p className="text-5xl font-black text-emerald-500 italic uppercase">{orders.filter(o => o.status !== 'delivered').length}</p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Completed Logistics</p>
          <p className="text-5xl font-black text-sky-500 italic uppercase">{orders.filter(o => o.status === 'delivered').length}</p>
        </div>
      </div>

      {/* Operations Table */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Order Key</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Client Node</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Asset / Driver</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Lifecycle</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl">{o.order_id}</td>
                  <td className="px-8 py-8">
                     <span className="font-black text-slate-800 uppercase tracking-tight text-sm block leading-none">{o.client_id}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">{o.order_date}</span>
                  </td>
                  <td className="px-8 py-8">
                     <div className="flex flex-col">
                        <span className="font-black text-slate-900 italic text-sm uppercase">{o.vehicle_id || 'OUTSOURCED'}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{o.driver_id || 'External'}</span>
                     </div>
                  </td>
                  <td className="px-8 py-8">
                    <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic tracking-widest ${o.status === 'delivered' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-sky-500 text-white shadow-lg'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { 
                        setEditingOrder(o); 
                        setFormData({ 
                          order_id: o.order_id, client_id: o.client_id, order_date: o.order_date || '', 
                          driver_id: o.driver_id || '', vehicle_id: o.vehicle_id || '', 
                          status: o.status, delivery_address: o.delivery_address || '', 
                          delivery_date: o.delivery_date || '', total_boxes: o.total_boxes?.toString() || '', 
                          total_weight_tons: o.total_weight_tons?.toString() || '', is_outsourced: o.is_outsourced || false,
                        }); 
                        setShowModal(true) 
                      }} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-900 hover:text-white transition-all">✏️</button>
                      <button onClick={() => handleDelete(o.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 overflow-y-auto max-h-[90vh] border border-white/50 relative">
            <button onClick={() => { setShowModal(false); setEditingOrder(null) }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl transition-all font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">{editingOrder ? 'Modify Code' : 'Initialize Flow'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Logistics operation identification</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Order Key *</label>
                  <input disabled className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Auto-generated" value={formData.order_id} onChange={e => setFormData({...formData, order_id: e.target.value})} />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Origin Node (Client)</label>
                   <select required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                     <option value="">Select ID...</option>
                     {clients.map(c => <option key={c.id} value={c.client_id}>{c.client_id}</option>)}
                   </select>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Resource Source</label>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setFormData({...formData, is_outsourced: false})} className={`flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest italic transition-all ${!formData.is_outsourced ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}>In-House</button>
                    <button type="button" onClick={() => setFormData({...formData, is_outsourced: true, vehicle_id: '', driver_id: ''})} className={`flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest italic transition-all ${formData.is_outsourced ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}>Outsource</button>
                  </div>
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Asset Code</label>
                   <select disabled={formData.is_outsourced} className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner disabled:opacity-20" value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})}>
                     <option value="">Select Asset...</option>
                     {vehicles.map(v => <option key={v.id} value={v.vehicle_id}>{v.vehicle_id}</option>)}
                   </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Deployment State</label>
                <select className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="pending">PENDING INITIATION</option>
                  <option value="dispatched">IN TRANSIT</option>
                  <option value="delivered">NODE REACHED</option>
                </select>
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-sky-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic">
                 Commit Deployment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}