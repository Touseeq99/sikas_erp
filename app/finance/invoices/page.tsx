'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  invoice_date: string
  week_start_date: string
  week_end_date: string
  total_weight_tons: number
  total_amount: number
  tax_amount: number
  grand_total: number
  status: string
  due_date?: string
  paid_amount: number
  paid_date?: string
}

interface Client {
  id: string
  client_id: string
  client_name: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [formData, setFormData] = useState({
    invoice_number: '',
    client_id: '',
    invoice_date: '',
    week_start_date: '',
    week_end_date: '',
    total_weight_tons: '',
    total_amount: '',
    tax_amount: '',
    grand_total: '',
    status: 'draft',
    due_date: '',
    paid_amount: '',
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('invoices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    const [invoicesRes, clientsRes] = await Promise.all([
      supabase.from('invoices').select('*').order('invoice_date', { ascending: false }),
      supabase.from('clients').select('*').order('client_id'),
    ])
    setInvoices(invoicesRes.data || [])
    setClients(clientsRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const total = parseFloat(formData.total_amount) || 0
    const tax = total * 0.18
    const grand = total + tax
    
    const payload = {
      invoice_number: formData.invoice_number,
      client_id: formData.client_id,
      invoice_date: formData.invoice_date,
      week_start_date: formData.week_start_date,
      week_end_date: formData.week_end_date,
      total_weight_tons: parseFloat(formData.total_weight_tons) || 0,
      total_amount: total,
      tax_amount: tax,
      grand_total: grand,
      status: formData.status,
      due_date: formData.due_date || null,
      paid_amount: parseFloat(formData.paid_amount) || 0,
    }

    if (editingInvoice) {
      await supabase.from('invoices').update(payload).eq('id', editingInvoice.id)
    } else {
      await supabase.from('invoices').insert(payload)
    }

    setShowModal(false)
    setEditingInvoice(null)
    resetForm()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      await supabase.from('invoices').delete().eq('id', id)
      loadData()
    }
  }

  const resetForm = () => {
    setFormData({ invoice_number: '', client_id: '', invoice_date: '', week_start_date: '', week_end_date: '', total_weight_tons: '', total_amount: '', tax_amount: '', grand_total: '', status: 'draft', due_date: '', paid_amount: '' })
  }

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.client_id === clientId)
    return client?.client_name || clientId
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    generated: 'bg-blue-100 text-blue-700 border-blue-200',
    sent: 'bg-amber-100 text-amber-700 border-amber-200',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    overdue: 'bg-red-100 text-red-700 border-red-200',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    generated: 'Generated',
    sent: 'Sent',
    paid: 'Paid',
    overdue: 'Overdue',
  }

  const totalOutstanding = invoices.reduce((sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)), 0)
  const totalAmount = invoices.reduce((sum, i) => sum + (i.grand_total || 0), 0)
  const totalCollected = invoices.reduce((sum, i) => sum + (i.paid_amount || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">📄 Invoices</h1>
          <p className="text-slate-500 mt-1">Manage invoices</p>
        </div>
        <button onClick={() => { setEditingInvoice(null); resetForm(); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
          <span>+</span> Create Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Total Invoices</p>
          <p className="text-2xl font-bold text-slate-800">{invoices.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Amount</p>
          <p className="text-2xl font-bold text-slate-800">PKR {(totalAmount/1000000).toFixed(2)}M</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Collected</p>
          <p className="text-2xl font-bold text-emerald-600">PKR {(totalCollected/1000000).toFixed(2)}M</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Outstanding</p>
          <p className="text-2xl font-bold text-red-600">PKR {(totalOutstanding/1000000).toFixed(2)}M</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Invoice #</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Client</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Amount (PKR)</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Paid (PKR)</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">📄</div>
                  No invoices found.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-slate-600">{getClientName(inv.client_id)}</td>
                  <td className="px-6 py-4 text-slate-600">{inv.invoice_date}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{inv.grand_total?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-emerald-600">{inv.paid_amount?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusColors[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[inv.status] || inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditingInvoice(inv); setFormData({ invoice_number: inv.invoice_number, client_id: inv.client_id, invoice_date: inv.invoice_date || '', week_start_date: inv.week_start_date || '', week_end_date: inv.week_end_date || '', total_weight_tons: inv.total_weight_tons?.toString() || '', total_amount: inv.total_amount?.toString() || '', tax_amount: inv.tax_amount?.toString() || '', grand_total: inv.grand_total?.toString() || '', status: inv.status, due_date: inv.due_date || '', paid_amount: inv.paid_amount?.toString() || '' }); setShowModal(true) }} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
                    <button onClick={() => handleDelete(inv.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
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
              <h2 className="text-xl font-bold text-slate-800">{editingInvoice ? 'Edit Invoice' : 'Create Invoice'}</h2>
              <button onClick={() => { setShowModal(false); setEditingInvoice(null); resetForm() }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Invoice Number *</label>
                  <input required className="input" placeholder="INV-001" value={formData.invoice_number} onChange={e => setFormData({...formData, invoice_number: e.target.value})} />
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
                  <label className="label">Invoice Date</label>
                  <input type="date" className="input" value={formData.invoice_date} onChange={e => setFormData({...formData, invoice_date: e.target.value})} />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" className="input" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Total Weight (Tons)</label>
                  <input type="number" className="input" placeholder="100" value={formData.total_weight_tons} onChange={e => setFormData({...formData, total_weight_tons: e.target.value})} />
                </div>
                <div>
                  <label className="label">Amount (PKR)</label>
                  <input type="number" className="input" placeholder="25000" value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="draft">Draft</option>
                    <option value="generated">Generated</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="label">Paid Amount</label>
                  <input type="number" className="input" placeholder="0" value={formData.paid_amount} onChange={e => setFormData({...formData, paid_amount: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingInvoice(null); resetForm() }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingInvoice ? 'Update' : 'Create'} Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}