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
}

interface Client {
  id: string
  client_id: string
  client_name: string
}

interface Vehicle {
  id: string
  vehicle_id: string
  type: string
  registration_no: string
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
    order_date: '',
    driver_id: '',
    vehicle_id: '',
    status: 'pending',
    delivery_address: '',
    delivery_date: '',
    total_boxes: '',
    total_weight_tons: '',
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
    const [ordersRes, clientsRes, vehiclesRes, driversRes] = await Promise.all([
      supabase.from('orders').select('*').order('order_id'),
      supabase.from('clients').select('*').order('client_id'),
      supabase.from('vehicles').select('*').order('vehicle_id'),
      supabase.from('drivers').select('*').order('driver_id'),
    ])
    setOrders(ordersRes.data || [])
    setClients(clientsRes.data || [])
    setVehicles(vehiclesRes.data || [])
    setDrivers(driversRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData }
    
    if (editingOrder) {
      await supabase.from('orders').update(payload).eq('id', editingOrder.id)
    } else {
      await supabase.from('orders').insert(payload)
    }
    
    setShowModal(false)
    setEditingOrder(null)
    resetForm()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      await supabase.from('orders').delete().eq('id', id)
      loadData()
    }
  }

  const resetForm = () => {
    setFormData({
      order_id: '',
      client_id: '',
      order_date: '',
      driver_id: '',
      vehicle_id: '',
      status: 'pending',
      delivery_address: '',
      delivery_date: '',
      total_boxes: '',
      total_weight_tons: '',
    })
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    dispatched: 'bg-blue-100 text-blue-700 border-blue-200',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    dispatched: 'Dispatched',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.client_id === clientId)
    return client?.client_name || clientId
  }

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.vehicle_id === vehicleId)
    return vehicle ? `${vehicle.vehicle_id} (${vehicle.registration_no})` : vehicleId
  }

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.driver_id === driverId)
    return driver?.name || driverId
  }

  const filteredOrders = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">📋 Orders</h1>
          <p className="text-slate-500 mt-1">Manage your orders</p>
        </div>
        <button onClick={() => { setEditingOrder(null); resetForm(); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
          <span>+</span> New Order
        </button>
      </div>

      <div className="flex space-x-2">
        {['all', 'pending', 'dispatched', 'delivered', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === status ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Client</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Vehicle</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Driver</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">📋</div>
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{o.order_id}</td>
                  <td className="px-6 py-4 text-slate-600">{getClientName(o.client_id)}</td>
                  <td className="px-6 py-4 text-slate-600">{o.order_date}</td>
                  <td className="px-6 py-4 text-slate-600">{getVehicleInfo(o.vehicle_id)}</td>
                  <td className="px-6 py-4 text-slate-600">{getDriverName(o.driver_id)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusColors[o.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[o.status] || o.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditingOrder(o); setFormData({ order_id: o.order_id, client_id: o.client_id, order_date: o.order_date || '', driver_id: o.driver_id || '', vehicle_id: o.vehicle_id || '', status: o.status, delivery_address: o.delivery_address || '', delivery_date: o.delivery_date || '', total_boxes: o.total_boxes?.toString() || '', total_weight_tons: o.total_weight_tons?.toString() || '' }); setShowModal(true) }} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
                    <button onClick={() => handleDelete(o.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
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
              <h2 className="text-xl font-bold text-slate-800">{editingOrder ? 'Edit Order' : 'New Order'}</h2>
              <button onClick={() => { setShowModal(false); setEditingOrder(null); resetForm() }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Order ID *</label>
                  <input required className="input" placeholder="O501" value={formData.order_id} onChange={e => setFormData({...formData, order_id: e.target.value})} />
                </div>
                <div>
                  <label className="label">Client *</label>
                  <select required className="input" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                    <option value="">Select Client</option>
                    {clients.map(c => <option key={c.id} value={c.client_id}>{c.client_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Order Date</label>
                  <input type="date" className="input" value={formData.order_date} onChange={e => setFormData({...formData, order_date: e.target.value})} />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="pending">Pending</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vehicle</label>
                  <select className="input" value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})}>
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => <option key={v.id} value={v.vehicle_id}>{v.vehicle_id} - {v.registration_no}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Driver</label>
                  <select className="input" value={formData.driver_id} onChange={e => setFormData({...formData, driver_id: e.target.value})}>
                    <option value="">Select Driver</option>
                    {drivers.map(d => <option key={d.id} value={d.driver_id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Delivery Address</label>
                <textarea className="input" rows={2} value={formData.delivery_address} onChange={e => setFormData({...formData, delivery_address: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingOrder(null); resetForm() }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingOrder ? 'Update' : 'Create'} Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}