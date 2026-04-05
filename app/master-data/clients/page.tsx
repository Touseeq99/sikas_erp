'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

interface Client {
  id: string
  client_id: string
  client_name: string
  contact_info: string
  address: string
  contact_person?: string
  phone?: string
  email?: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    contact_info: '',
    address: '',
    contact_person: '',
    phone: '',
  })

  useEffect(() => {
    loadClients()
    const channel = supabase
      .channel('clients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, loadClients)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('client_id')
    setClients(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData }
    
    if (editingClient) {
      await supabase.from('clients').update(payload).eq('id', editingClient.id)
    } else {
      await supabase.from('clients').insert(payload)
    }
    
    setShowModal(false)
    setEditingClient(null)
    setFormData({ client_id: '', client_name: '', contact_info: '', address: '', contact_person: '', phone: '' })
    loadClients()
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      client_id: client.client_id,
      client_name: client.client_name,
      contact_info: client.contact_info || '',
      address: client.address || '',
      contact_person: client.contact_person || '',
      phone: client.phone || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await supabase.from('clients').delete().eq('id', id)
      loadClients()
    }
  }

  const handleBulkImport = async () => {
    if (!importFile) return
    setImporting(true)
    try {
      const data = await importFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets['Clients']
      if (!sheet) throw new Error('Clients sheet not found in Excel file')
      
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      const rows = json.slice(1).filter(row => row[0] && row[1])
      
      const clients = rows.map(row => ({
        client_id: row[0]?.toString() || row[1]?.toString() || '',
        client_name: row[1]?.toString() || row[0]?.toString() || '',
        contact_info: row[2]?.toString() || '',
        address: row[3]?.toString() || '',
      })).filter(c => c.client_id && c.client_name)
      
      if (clients.length > 0) {
        await supabase.from('clients').upsert(clients, { onConflict: 'client_id' })
        alert(`Successfully imported ${clients.length} clients!`)
        loadClients()
      } else {
        alert('No valid clients found in the file')
      }
    } catch (err: any) {
      alert('Import failed: ' + err.message)
    }
    setImporting(false)
    setShowImportModal(false)
    setImportFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">🏢 Clients</h1>
          <p className="text-slate-500 mt-1">Manage your clients</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setShowImportModal(true)} className="btn btn-secondary flex items-center gap-2">
            <span>📥</span> Import Excel
          </button>
          <button onClick={() => { setEditingClient(null); setFormData({ client_id: '', client_name: '', contact_info: '', address: '', contact_person: '', phone: '' }); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
            <span>+</span> Add Client
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Client ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Client Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Contact Info</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Address</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">🏢</div>
                  No clients found. Add one to get started.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{c.client_id}</td>
                  <td className="px-6 py-4 text-slate-600">{c.client_name}</td>
                  <td className="px-6 py-4 text-slate-600">{c.contact_info}</td>
                  <td className="px-6 py-4 text-slate-600">{c.address}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleEdit(c)} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
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
              <h2 className="text-xl font-bold text-slate-800">{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Client ID *</label>
                  <input required className="input" placeholder="C01" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})} />
                </div>
                <div>
                  <label className="label">Client Name *</label>
                  <input required className="input" placeholder="Company Name" value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Contact Info</label>
                  <input className="input" placeholder="03001234567" value={formData.contact_info} onChange={e => setFormData({...formData, contact_info: e.target.value})} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="03001234567" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Contact Person</label>
                <input className="input" placeholder="John Doe" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
              </div>
              <div>
                <label className="label">Address</label>
                <textarea className="input" rows={2} placeholder="Lahore, Pakistan" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingClient ? 'Update' : 'Add'} Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Import Clients from Excel</h2>
              <button onClick={() => { setShowImportModal(false); setImportFile(null); if(fileInputRef.current) fileInputRef.current.value = '' }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-sky-700 font-medium mb-2">Expected Columns:</p>
              <p className="text-xs text-sky-600">ClientID, Name, ContactInfo, Address</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="input mb-4"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => { setShowImportModal(false); setImportFile(null); if(fileInputRef.current) fileInputRef.current.value = '' }} className="btn btn-secondary">Cancel</button>
              <button onClick={handleBulkImport} disabled={!importFile || importing} className="btn btn-primary">
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}