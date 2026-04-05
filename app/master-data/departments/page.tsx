'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Department {
  id: string
  department_id: string
  name: string
  manager_id?: string
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [formData, setFormData] = useState({
    department_id: '',
    name: '',
    manager_id: '',
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('departments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    const { data } = await supabase.from('departments').select('*').order('department_id')
    setDepartments(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData }
    
    if (editingDept) {
      await supabase.from('departments').update(payload).eq('id', editingDept.id)
    } else {
      await supabase.from('departments').insert(payload)
    }
    
    setShowModal(false)
    setEditingDept(null)
    setFormData({ department_id: '', name: '', manager_id: '' })
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this department?')) {
      await supabase.from('departments').delete().eq('id', id)
      loadData()
    }
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
          <h1 className="text-3xl font-bold text-slate-800">🏢 Departments</h1>
          <p className="text-slate-500 mt-1">Manage departments</p>
        </div>
        <button onClick={() => { setEditingDept(null); setFormData({ department_id: '', name: '', manager_id: '' }); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
          <span>+</span> Add Department
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Dept ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Manager</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {departments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  <div className="text-4xl mb-2">🏢</div>
                  No departments found.
                </td>
              </tr>
            ) : (
              departments.map((d) => (
                <tr key={d.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{d.department_id}</td>
                  <td className="px-6 py-4 text-slate-600">{d.name}</td>
                  <td className="px-6 py-4 text-slate-600">{d.manager_id || '-'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditingDept(d); setFormData({ department_id: d.department_id, name: d.name, manager_id: d.manager_id || '' }); setShowModal(true) }} className="text-sky-600 hover:text-sky-800 font-medium mr-4">Edit</button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
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
              <h2 className="text-xl font-bold text-slate-800">{editingDept ? 'Edit Department' : 'Add Department'}</h2>
              <button onClick={() => { setShowModal(false); setEditingDept(null); setFormData({ department_id: '', name: '', manager_id: '' }) }} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Department ID *</label>
                  <input required className="input" placeholder="D01" value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})} />
                </div>
                <div>
                  <label className="label">Name *</label>
                  <input required className="input" placeholder="Operations" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Manager</label>
                <input className="input" placeholder="Ali Khan" value={formData.manager_id} onChange={e => setFormData({...formData, manager_id: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingDept(null); setFormData({ department_id: '', name: '', manager_id: '' }) }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingDept ? 'Update' : 'Add'} Department</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}