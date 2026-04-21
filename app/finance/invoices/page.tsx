'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

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
    invoice_date: new Date().toISOString().split('T')[0],
    week_start_date: new Date().toISOString().split('T')[0],
    week_end_date: new Date().toISOString().split('T')[0],
    total_weight_tons: '',
    total_amount: '',
    status: 'draft',
    due_date: '',
    paid_amount: '',
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('invoices-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    try {
      const [invoicesRes, clientsRes] = await Promise.all([
        supabase.from('invoices').select('*').order('invoice_date', { ascending: false }),
        supabase.from('clients').select('id, client_id').order('client_id'),
      ])
      setInvoices(invoicesRes.data || [])
      setClients(clientsRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const baseAmount = parseFloat(formData.total_amount) || 0
    const tax = baseAmount * 0.18
    const grand = baseAmount + tax
    
    const payload = {
      invoice_number: formData.invoice_number,
      client_id: formData.client_id,
      invoice_date: formData.invoice_date || new Date().toISOString().split('T')[0],
      week_start_date: formData.week_start_date || new Date().toISOString().split('T')[0],
      week_end_date: formData.week_end_date || new Date().toISOString().split('T')[0],
      total_weight_tons: parseFloat(formData.total_weight_tons) || 0,
      total_amount: baseAmount,
      tax_amount: tax,
      grand_total: grand,
      status: formData.status,
      due_date: formData.due_date || null,
      paid_amount: parseFloat(formData.paid_amount) || 0,
      paid_date: parseFloat(formData.paid_amount) > 0 ? new Date().toISOString().split('T')[0] : null
    }

    try {
      if (editingInvoice) {
        const { error } = await supabase.from('invoices').update(payload).eq('id', editingInvoice.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('invoices').insert(payload)
        if (error) throw error
      }
      
      setShowModal(false)
      setEditingInvoice(null)
      resetForm()
      loadData()
      alert('Billing manifest committed to secure storage.')
    } catch (e: any) {
      console.error('Invoice save error:', e)
      alert('Sync Failed: ' + e.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this billing record permanently?')) {
      try {
        const { error } = await supabase.from('invoices').delete().eq('id', id)
        if (error) throw error
        loadData()
      } catch (e: any) {
        alert('Action failed: ' + e.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({ 
      invoice_number: '', client_id: '', invoice_date: new Date().toISOString().split('T')[0], 
      week_start_date: new Date().toISOString().split('T')[0], week_end_date: new Date().toISOString().split('T')[0], 
      total_weight_tons: '', total_amount: '', status: 'draft', due_date: '', paid_amount: '' 
    })
  }

  const totalOutstanding = invoices.reduce((sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)), 0)
  const totalAmountValue = invoices.reduce((sum, i) => sum + (i.grand_total || 0), 0)
  const totalCollected = invoices.reduce((sum, i) => sum + (i.paid_amount || 0), 0)
  const linkedToRevenue = invoices.filter(i => i.status === 'paid').length

  const convertToRevenue = async (invoice: Invoice) => {
    const revPayload = {
      revenue_id: `REV-${invoice.invoice_number}`,
      client_id: invoice.client_id,
      amount: invoice.paid_amount,
      payment_status: 'paid',
      revenue_date: invoice.paid_date || new Date().toISOString().split('T')[0],
      weight_tons: invoice.total_weight_tons,
      rate_per_ton: invoice.total_weight_tons > 0 ? (invoice.total_amount / invoice.total_weight_tons) : 0
    }
    
    try {
      const { error } = await supabase.from('revenue').insert(revPayload)
      if (error) throw error
      alert('Revenue record created from invoice!')
      loadData()
    } catch (e: any) {
      alert('Failed to convert: ' + e.message)
    }
  }

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
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Invoices</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Billing & Receivables</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <Link href="/finance/revenue" className="px-6 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-[1.5rem] font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest italic">
            💰 Revenue
          </Link>
          <Link href="/finance/expenses" className="px-6 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-[1.5rem] font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest italic">
            💸 Expenses
          </Link>
          <button onClick={() => { setEditingInvoice(null); resetForm(); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-sky-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic leading-none">
            + Create Invoice
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group border border-white/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Total Invoiced</p>
          <p className="text-4xl font-black italic tracking-tighter text-sky-400">PKR {(totalAmountValue/1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 italic">Collected Force</p>
          <p className="text-4xl font-black text-emerald-500 italic uppercase">PKR {(totalCollected/1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 italic">Outstanding Flow</p>
          <p className="text-4xl font-black text-red-500 italic uppercase">PKR {(totalOutstanding/1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 italic">Linked to Revenue</p>
          <p className="text-4xl font-black text-violet-500 italic uppercase">{linkedToRevenue}</p>
        </div>
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 italic">Billing Samples</p>
          <p className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">{invoices.length} ID</p>
        </div>
      </div>

      {/* Table UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Invoice Key</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Client Node</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Valuation (PKR)</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Lifecycle State</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl leading-none uppercase">{inv.invoice_number}</td>
                  <td className="px-8 py-8">
                     <span className="font-black text-slate-800 uppercase tracking-tight text-sm block leading-none italic underline decoration-slate-100 underline-offset-4 leading-none">{inv.client_id}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">{inv.invoice_date}</span>
                  </td>
                  <td className="px-8 py-8">
                     <div className="flex flex-col">
                        <span className="font-black text-slate-900 italic text-xl tracking-tighter">{(inv.grand_total || 0).toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Collected: {inv.paid_amount?.toLocaleString()}</span>
                     </div>
                  </td>
                  <td className="px-8 py-8">
                    <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic tracking-widest ${inv.status === 'paid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-amber-500 text-white shadow-lg shadow-amber-100'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      {inv.status === 'paid' && (
                        <button onClick={() => convertToRevenue(inv)} className="p-3 bg-violet-50 text-violet-600 rounded-xl hover:bg-violet-500 hover:text-white transition-all" title="Convert to Revenue">💰</button>
                      )}
                      <button onClick={() => { setEditingInvoice(inv); setFormData({ invoice_number: inv.invoice_number, client_id: inv.client_id, invoice_date: inv.invoice_date || '', week_start_date: inv.week_start_date || '', week_end_date: inv.week_end_date || '', total_weight_tons: inv.total_weight_tons?.toString() || '', total_amount: inv.total_amount?.toString() || '', status: inv.status, due_date: inv.due_date || '', paid_amount: inv.paid_amount?.toString() || '' }); setShowModal(true) }} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-900 hover:text-white transition-all">✏️</button>
                      <button onClick={() => handleDelete(inv.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 border border-white/50 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => { setShowModal(false); setEditingInvoice(null); resetForm() }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2 leading-none">{editingInvoice ? 'Edit Invoice' : 'Add Invoice'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12 italic">Monetary inflow identification</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Invoice Key *</label>
                  <input disabled className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner uppercase" placeholder="Auto-generated" value={formData.invoice_number} onChange={e => setFormData({...formData, invoice_number: e.target.value})} />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Client Node *</label>
                   <select required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                     <option value="">Select ID...</option>
                     {clients.map(c => <option key={c.id} value={c.client_id}>{c.client_id}</option>)}
                   </select>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Billing Date</label>
                  <input type="date" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner text-sm" value={formData.invoice_date} onChange={e => setFormData({...formData, invoice_date: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Week Start *</label>
                  <input required type="date" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner text-sm" value={formData.week_start_date} onChange={e => setFormData({...formData, week_start_date: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Week End *</label>
                  <input required type="date" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner text-sm" value={formData.week_end_date} onChange={e => setFormData({...formData, week_end_date: e.target.value})} />
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Base Valuation (PKR) *</label>
                  <input required type="number" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="50,000" value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Already Collected (PKR) *</label>
                  <input required type="number" className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="0" value={formData.paid_amount} onChange={e => setFormData({...formData, paid_amount: e.target.value})} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">State Logic Node</label>
                <select className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="draft">PROTOCOL :: DRAFT</option>
                    <option value="generated">PROTOCOL :: GENERATED</option>
                    <option value="sent">PROTOCOL :: SENT</option>
                    <option value="paid">PROTOCOL :: FULLY COLLECTED</option>
                    <option value="overdue">ALERT :: OVERDUE</option>
                </select>
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-sky-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic leading-none">
                 Execute Billing
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}