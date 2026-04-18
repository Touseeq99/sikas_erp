'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

interface Employee {
  id: string
  employee_id: string
  name: string
  department_id: string
  role: string
  contact: string
  is_active?: boolean
}

interface Department {
  department_id: string
  name: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    department_id: '',
    role: '',
    contact: '',
  })

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('employees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    try {
      const [{ data: empData }, { data: deptData }] = await Promise.all([
        supabase.from('employees').select('*').order('employee_id'),
        supabase.from('departments').select('department_id, name').order('name')
      ])
      setEmployees(empData || [])
      setDepartments(deptData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingEmployee) {
        await supabase.from('employees').update(formData).eq('id', editingEmployee.id)
      } else {
        await supabase.from('employees').insert(formData)
      }
      setShowModal(false)
      setEditingEmployee(null)
      resetForm()
      loadData()
      alert('Node staff updated.')
    } catch (error: any) {
      alert('Failed: ' + error.message)
    }
  }

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp)
    setFormData({
      employee_id: emp.employee_id,
      name: emp.name || '',
      department_id: emp.department_id || '',
      role: emp.role || '',
      contact: emp.contact || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('De-provision this staff node?')) {
      try {
        await supabase.from('employees').delete().eq('id', id)
        loadData()
      } catch (error: any) {
        alert('Action failed: ' + error.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({ employee_id: '', name: '', department_id: '', role: '', contact: '' })
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
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Staff <span className="text-sky-500">Nodes</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Administrative Human Capital Manifest</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <button onClick={() => { setEditingEmployee(null); resetForm(); setShowModal(true) }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-sky-500 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest italic">
            + Provision Staff Node
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">Total Registered Staff</p>
          <p className="text-5xl font-black italic tracking-tighter">{employees.length}<span className="text-sky-500 text-2xl uppercase ml-2 tracking-widest font-black">Nodes</span></p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 italic">Active Departments</p>
          <p className="text-5xl font-black text-emerald-500 italic">{departments.length}</p>
        </div>
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 italic">Administrative Load</p>
          <p className="text-4xl font-black text-sky-500 italic uppercase">Optimized</p>
        </div>
      </div>

      {/* Table UI */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Node ID</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Identity Manifest</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Department</th>
                <th className="px-8 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operational Role</th>
                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employees.map((emp) => (
                <tr key={emp.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-8 font-black text-slate-900 italic tracking-tighter text-2xl">{emp.employee_id}</td>
                  <td className="px-8 py-8">
                     <span className="font-black text-slate-800 uppercase tracking-tight text-sm block leading-none">{emp.name}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">{emp.contact}</span>
                  </td>
                  <td className="px-8 py-8 text-slate-600 font-black italic tracking-tight">{emp.department_id}</td>
                  <td className="px-8 py-8">
                    <span className="inline-flex px-4 py-1.5 bg-slate-100 text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest italic">
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleEdit(emp)} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-900 hover:text-white transition-all">✏️</button>
                      <button onClick={() => handleDelete(emp.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Provisioning Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 overflow-y-auto max-h-[90vh] border border-white/50 relative">
            <button onClick={() => { setShowModal(false); setEditingEmployee(null) }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl transition-all font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">{editingEmployee ? 'Modify Node' : 'Provision Staff'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Administrative Identity Protocol</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Staff Code *</label>
                  <input required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="E-001" value={formData.employee_id} onChange={e => setFormData({...formData, employee_id: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Legal Name</label>
                  <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Department Node</label>
                  <select className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})}>
                    <option value="">Select Dept...</option>
                    {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Operational Role</label>
                  <input className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="Manager" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-4">Comms Contact</label>
                <input required className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-black text-xl italic focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" placeholder="+92 ..." value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
              </div>

              <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-sky-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic">
                 Commit Provisioning
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
