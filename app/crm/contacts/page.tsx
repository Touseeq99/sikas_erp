'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Contact {
  id: string
  contact_id: string
  contact_name: string
  contact_type: string
  phone: string
  email: string
  address: string
  is_active: boolean
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formData, setFormData] = useState({
    contact_id: '',
    contact_name: '',
    contact_type: '',
    phone: '',
    email: '',
    address: '',
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('contacts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    const { data } = await supabase.from('contacts').select('*').order('contact_name')
    setContacts(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingContact) {
      await supabase.from('contacts').update(formData).eq('id', editingContact.id)
    } else {
      await supabase.from('contacts').insert(formData)
    }
    setShowModal(false)
    setEditingContact(null)
    setFormData({ contact_id: '', contact_name: '', contact_type: '', phone: '', email: '', address: '' })
    loadData()
  }

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      contact_id: contact.contact_id,
      contact_name: contact.contact_name,
      contact_type: contact.contact_type || '',
      phone: contact.phone || '',
      email: contact.email || '',
      address: contact.address || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await supabase.from('contacts').delete().eq('id', id)
      loadData()
    }
  }

  const contactTypes = ['Client', 'Supplier', 'Partner', 'Driver', 'Employee', 'Other']

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">+ Add Contact</button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="table-header">
            <tr>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Contact Name</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Phone</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Address</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">{c.contact_id}</td>
                <td className="px-6 py-4 font-medium">{c.contact_name}</td>
                <td className="px-6 py-4">{c.contact_type}</td>
                <td className="px-6 py-4">{c.phone}</td>
                <td className="px-6 py-4">{c.email}</td>
                <td className="px-6 py-4 text-sm">{c.address}</td>
                <td className="px-6 py-4">
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingContact ? 'Edit Contact' : 'Add Contact'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Contact ID *</label>
                  <input required className="input" value={formData.contact_id} onChange={e => setFormData({...formData, contact_id: e.target.value})} placeholder="CT001" />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={formData.contact_type} onChange={e => setFormData({...formData, contact_type: e.target.value})}>
                    <option value="">Select Type</option>
                    {contactTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Contact Name *</label>
                <input required className="input" value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <textarea className="input" rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingContact ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
