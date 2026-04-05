'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Complaint {
  id: string
  complaint_number: string
  client_id: string
  order_id: string | null
  complaint_type: string
  description: string
  priority: string
  status: string
  assigned_to: string | null
  resolution_notes: string | null
  resolved_at: string | null
  created_at: string
}

interface Client {
  id: string
  client_id: string
  client_name: string
}

interface Driver {
  id: string
  driver_id: string
  name: string
}

interface Order {
  id: string
  order_id: string
}

interface ComplaintWithRelations extends Complaint {
  clients?: Client
  drivers?: Driver
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintWithRelations[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null)
  const [formData, setFormData] = useState({
    client_id: '',
    order_id: '',
    complaint_type: '',
    description: '',
    priority: 'medium',
    status: 'open',
    assigned_to: '',
    resolution_notes: '',
  })

  const complaintTypes = ['Delayed Delivery', 'Wrong Quantity', 'Damaged Goods', 'Wrong Address', 'Driver Behavior', 'Quality Issue', 'Other']
  const priorities = ['low', 'medium', 'high', 'urgent']

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('complaints-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    const [complaintsRes, clientsRes, ordersRes, driversRes] = await Promise.all([
      supabase.from('complaints').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('client_name'),
      supabase.from('orders').select('*').order('order_id'),
      supabase.from('drivers').select('*').eq('is_active', true).order('name'),
    ])
    
    const clientsData = clientsRes.data || []
    const ordersData = ordersRes.data || []
    const driversData = driversRes.data || []
    
    const complaintsWithRelations = (complaintsRes.data || []).map((c: Complaint) => ({
      ...c,
      clients: clientsData.find(cl => cl.client_id === c.client_id),
      drivers: driversData.find(d => d.driver_id === c.assigned_to),
    }))
    
    setComplaints(complaintsWithRelations)
    setClients(clientsData)
    setOrders(ordersData)
    setDrivers(driversData)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const complaintNumber = `CMP-${Date.now()}`
    const payload = {
      complaint_number: editingComplaint ? editingComplaint.complaint_number : complaintNumber,
      client_id: formData.client_id,
      order_id: formData.order_id || null,
      assigned_to: formData.assigned_to || null,
      complaint_type: formData.complaint_type,
      description: formData.description,
      priority: formData.priority,
      status: formData.status,
      resolution_notes: formData.resolution_notes,
    }

    if (editingComplaint) {
      await supabase.from('complaints').update(payload).eq('id', editingComplaint.id)
    } else {
      await supabase.from('complaints').insert(payload)
    }
    setShowModal(false)
    setEditingComplaint(null)
    resetForm()
    loadData()
  }

  const handleEdit = (complaint: Complaint) => {
    setEditingComplaint(complaint)
    setFormData({
      client_id: complaint.client_id,
      order_id: complaint.order_id || '',
      complaint_type: complaint.complaint_type || '',
      description: complaint.description,
      priority: complaint.priority,
      status: complaint.status,
      assigned_to: complaint.assigned_to || '',
      resolution_notes: complaint.resolution_notes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await supabase.from('complaints').delete().eq('id', id)
      loadData()
    }
  }

  const handleResolve = async (complaint: Complaint) => {
    const notes = prompt('Enter resolution notes:')
    if (notes === null) return

    await supabase.from('complaints').update({
      status: 'resolved',
      resolution_notes: notes,
      resolved_at: new Date().toISOString(),
    }).eq('id', complaint.id)
    loadData()
  }

  const resetForm = () => {
    setFormData({ client_id: '', order_id: '', complaint_type: '', description: '', priority: 'medium', status: 'open', assigned_to: '', resolution_notes: '' })
  }

  const statusColors: Record<string, string> = {
    open: 'bg-red-100 text-red-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">+ New Complaint</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Open</h3>
          <p className="text-2xl font-bold text-red-600">{complaints.filter(c => c.status === 'open').length}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
          <p className="text-2xl font-bold text-yellow-600">{complaints.filter(c => c.status === 'in_progress').length}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Resolved</h3>
          <p className="text-2xl font-bold text-green-600">{complaints.filter(c => c.status === 'resolved').length}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Total</h3>
          <p className="text-2xl font-bold">{complaints.length}</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="table-header">
            <tr>
              <th className="px-6 py-3">Complaint #</th>
              <th className="px-6 py-3">Client</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Priority</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Assigned To</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {complaints.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{c.complaint_number}</td>
                <td className="px-6 py-4">{c.clients?.client_name}</td>
                <td className="px-6 py-4">{c.complaint_type}</td>
                <td className="px-6 py-4">
                  <span className={`status-badge ${priorityColors[c.priority]}`}>{c.priority}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`status-badge ${statusColors[c.status]}`}>{c.status.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4">{c.drivers?.name || '-'}</td>
                <td className="px-6 py-4">
                  {c.status !== 'resolved' && (
                    <button onClick={() => handleResolve(c)} className="text-green-600 hover:text-green-900 mr-3">Resolve</button>
                  )}
                  <button onClick={() => handleEdit(c)} className="text-primary-600 hover:text-primary-900 mr-3">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">{editingComplaint ? 'Edit Complaint' : 'New Complaint'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Client *</label>
                <select required className="input" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Complaint Type</label>
                  <select className="input" value={formData.complaint_type} onChange={e => setFormData({...formData, complaint_type: e.target.value})}>
                    <option value="">Select Type</option>
                    {complaintTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Order (Optional)</label>
                  <select className="input" value={formData.order_id} onChange={e => setFormData({...formData, order_id: e.target.value})}>
                    <option value="">Select Order</option>
                    {orders.map(o => <option key={o.order_id} value={o.order_id}>{o.order_id}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description *</label>
                <textarea required className="input" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                    {priorities.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Assign To (Driver)</label>
                <select className="input" value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})}>
                  <option value="">Select Driver</option>
                  {drivers.map(d => <option key={d.driver_id} value={d.driver_id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Resolution Notes</label>
                <textarea className="input" rows={2} value={formData.resolution_notes} onChange={e => setFormData({...formData, resolution_notes: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingComplaint(null); resetForm() }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingComplaint ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
