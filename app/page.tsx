'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const formatAmount = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
  return num.toString()
}

interface KPI {
  id: string
  kpi_id: string
  metric: string
  target: number
  actual: number
  variance: number
  notes: string
}

export default function Dashboard() {
  const [kpisData, setKpisData] = useState<KPI[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [revenue, setRevenue] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [tripsData, setTripsData] = useState<any[]>([])
  const [maintenanceData, setMaintenanceData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showPivotModal, setShowPivotModal] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  useEffect(() => {
    loadDashboardData()
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, loadDashboardData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedMonth])

  const filterByMonth = (data: any[], dateField: string, altDateField?: string) => {
    if (selectedMonth === 'all') return data
    return data.filter((item: any) => {
      const dateVal = item[dateField] || (altDateField ? item[altDateField] : null)
      if (!dateVal) return false
      const date = new Date(dateVal)
      if (isNaN(date.getTime())) return false
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return monthKey === selectedMonth
    })
  }

  const currentYear = new Date().getFullYear()
  const monthOptions = ['all', 
    ...Array.from({ length: 12 }, (_, i) => {
      return `${currentYear}-${String(i + 1).padStart(2, '0')}`
    }),
    ...Array.from({ length: 12 }, (_, i) => {
      return `${currentYear - 1}-${String(i + 1).padStart(2, '0')}`
    })
  ].sort().reverse()

  const filteredRevenue = filterByMonth(revenue, 'revenue_date', 'received_date')
  const filteredExpenses = filterByMonth(expenses, 'expense_date')
  const filteredOrders = filterByMonth(orders, 'order_date', 'created_at')
  const filteredTrips = filterByMonth(tripsData, 'trip_date')

  const totalRevenue = filteredRevenue.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
  const totalExpenses = filteredExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
  const totalTripExpenses = filteredTrips.reduce((sum: number, t: any) => sum + (t.expenses || 0), 0)
  const totalMaintenance = maintenanceData.filter((m: any) => selectedMonth === 'all' || new Date(m.date || m.maintenance_date).toISOString().slice(0, 7) === selectedMonth).reduce((sum: number, m: any) => sum + (m.cost || 0), 0)
  const totalAllExpenses = totalExpenses + totalTripExpenses + totalMaintenance
  const totalProfitValue = totalRevenue - totalAllExpenses

  const activeClients = new Set(filteredOrders.map((o: any) => o.client_id)).size
  const totalAssets = vehicles.length + drivers.length
  const deliveredOrders = filteredOrders.filter((o: any) => o.status === 'delivered').length

  const totalInvoices = totalRevenue > 0 ? Math.round((totalRevenue / 100000)) : 0

  const loadDashboardData = async () => {
    try {
      const [kpisRes, vehiclesRes, driversRes, clientsRes, ordersRes, revenueRes, expensesRes, tripsRes, maintenanceRes] = await Promise.all([
        supabase.from('kpis').select('*').order('kpi_id'),
        supabase.from('vehicles').select('*').order('vehicle_id'),
        supabase.from('drivers').select('*').order('driver_id'),
        supabase.from('clients').select('*').order('client_code'),
        supabase.from('orders').select('*').order('order_id'),
        supabase.from('revenue').select('*').order('revenue_id'),
        supabase.from('expenses').select('*').order('expense_id'),
        supabase.from('profit_per_trip').select('*'),
        supabase.from('maintenance_records').select('*'),
      ])

      setKpisData(kpisRes.data || [])
      setVehicles(vehiclesRes.data || [])
      setDrivers(driversRes.data || [])
      setClients(clientsRes.data || [])
      setOrders(ordersRes.data || [])
      setRevenue(revenueRes.data || [])
      setExpenses(expensesRes.data || [])
      setTripsData(tripsRes.data || [])
      setMaintenanceData(maintenanceRes.data || [])

      setLastUpdate(new Date().toLocaleTimeString())
      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setLoading(false)
    }
  }

  const updateKPI = async (id: string, newTarget: number) => {
    try {
      const { error } = await supabase.from('kpis').update({ target: newTarget }).eq('id', id)
      if (error) throw error
      loadDashboardData()
    } catch (error: any) {
      alert('Failed to update: ' + error.message)
    }
  }

  // Pivot Data: Revenue by Client
  const clientPivot = revenue.reduce((acc: any, curr: any) => {
    const order = orders.find(o => o.order_id === curr.order_id)
    const cid = curr.client_id || order?.client_id
    if (!cid) return acc // Skip if no client_id found
    if (!acc[cid]) acc[cid] = { id: cid, total: 0, count: 0, expenses: 0 }
    acc[cid].total += (curr.amount || 0)
    acc[cid].count += 1
    
    // Add expenses for pivot
    const trip = tripsData.find(t => t.order_id === curr.order_id)
    acc[cid].expenses += (trip ? trip.expenses : 0)
    return acc
  }, {})

  const clientPivotArray = Object.values(clientPivot).map((c: any) => {
    const client = clients.find(cl => cl.client_code === c.id)
    return { 
      ...c, 
      name: client ? client.client_name : 'Unknown Client',
      profit: c.total - c.expenses 
    }
  }).filter((c: any) => c.id !== 'Unknown').sort((a: any, b: any) => b.count - a.count || b.total - a.total)

  const topClientPivot = clientPivotArray.slice(0, 3)
  const topClientPivotModal = clientPivotArray.slice(0, 10)

  const profitMargin = totalRevenue > 0 ? ((totalProfitValue / totalRevenue) * 100).toFixed(1) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none">DASHBOARD</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Live Intelligence Ecosystem v3.1</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-14 px-6 bg-white border-2 border-slate-200 rounded-2xl font-black text-sm italic focus:bg-white focus:border-sky-500 outline-none shadow-sm"
          >
            <option value="all">All Time</option>
            {monthOptions.filter(m => m !== 'all').map(m => {
              const [year, month] = m.split('-')
              const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('default', { month: 'short' })
              return <option key={m} value={m}>{monthName} {year}</option>
            })}
          </select>
        </div>
      </div>

      {/* Hero Insights Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 rounded-[4rem] p-12 text-white relative overflow-hidden shadow-2xl group transition-all duration-700 hover:shadow-sky-500/10">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-sky-500/20 transition-all duration-1000"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="space-y-6">
                 <h2 className="text-6xl font-black italic tracking-tighter leading-none">Live Profit <br/><span className={totalProfitValue >= 0 ? 'text-emerald-400' : 'text-red-400'}>PKR {formatAmount(totalProfitValue)}</span></h2>
                 <p className="text-slate-400 font-bold max-w-sm leading-relaxed text-sm uppercase tracking-wider">
                   Total Revenue: <span className="text-white font-black italic">PKR {formatAmount(totalRevenue)}</span> <br/>
                   Sync Status: <span className="text-sky-400">ACTIVE - REALTIME</span>
                 </p>
              </div>
              <div className="flex items-center gap-6">
                 <div className="p-8 bg-white/5 rounded-[3.5rem] border border-white/10 backdrop-blur-md text-center group-hover:border-sky-500/30 transition-all shadow-2xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 italic">Total Assets</p>
                    <p className="text-6xl font-black text-white italic tracking-tighter">{totalAssets}</p>
                 </div>
                 <div className="p-8 bg-sky-500 rounded-[3.5rem] text-center shadow-2xl shadow-sky-500/40 group-hover:bg-sky-400 transition-all">
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-2 italic">Orders Force</p>
                    <p className="text-6xl font-black text-white italic tracking-tighter">{orders.length}</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Pivot Summary Card */}
        <div className="bg-white rounded-[4rem] p-10 border border-slate-100 shadow-sm flex flex-col justify-between group overflow-hidden relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
           <div className="relative z-10">
              <h3 className="text-xl font-black text-slate-900 italic tracking-tight uppercase mb-8 flex items-center gap-2">
                 <span className="w-2 h-8 bg-sky-500 rounded-full"></span> Top Clients Pivot
              </h3>
              <div className="space-y-6">
                 {topClientPivot.map((client: any, i) => (
                    <div key={client.id} className="flex items-center justify-between group/row">
                       <div>
                          <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight leading-none mb-1">{client.id}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{client.count} Orders</p>
                       </div>
                       <p className={`text-sm font-black italic ${client.total >=0 ? 'text-sky-600' : 'text-red-600'}`}>PKR {formatAmount(client.total)}</p>
                    </div>
                 ))}
              </div>
           </div>
           <button 
             onClick={() => setShowPivotModal(true)}
             className="w-full mt-10 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
           >
              Launch Intelligence Pivot
           </button>
        </div>
      </div>

      {/* KPI Dynamic Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard title="Gross Revenue" value={`PKR ${formatAmount(totalRevenue)}`} icon="💰" color="emerald" />
        <MetricCard title="Total Expenses" value={`PKR ${formatAmount(totalAllExpenses)}`} icon="💸" color="rose" />
        <MetricCard title="Net Profit" value={`PKR ${formatAmount(totalProfitValue)}`} icon="📈" color={totalProfitValue >= 0 ? 'emerald' : 'rose'} />
        <MetricCard title="Profit Margin" value={`${profitMargin}%`} icon="🎯" color={Number(profitMargin) >= 20 ? 'emerald' : 'amber'} />
        <MetricCard title="Total Orders" value={`${filteredOrders.length}`} icon="📋" color="sky" subtitle={`${deliveredOrders} delivered`} />
        <MetricCard title="Active Clients" value={`${activeClients}`} icon="🏢" color="violet" subtitle={`${drivers.length} drivers`} />
      </div>

      {/* Charts Visualization Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-10">
      </div>

      {/* Pivot Intelligence Modal */}
      {showPivotModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl p-14 border border-white/50 relative overflow-y-auto max-h-[90vh]">
             <button onClick={() => setShowPivotModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl transition-all font-black">✕</button>
             <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2 leading-none">Top Clients Intelligence</h2>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Revenue & Order Analysis</p>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="border-b-2 border-slate-50">
                     <th className="pb-8 text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400">Client Name</th>
                     <th className="pb-8 text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400">Orders</th>
                     <th className="pb-8 text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400 text-right">Revenue (PKR)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {topClientPivotModal.map((client: any) => (
                      <tr key={client.id} className="group hover:bg-slate-50 transition-all duration-300">
                        <td className="py-8 font-black text-2xl text-slate-900 italic tracking-tighter leading-none">{client.id}</td>
                        <td className="py-8">
                           <span className="font-black text-slate-500 uppercase tracking-widest text-xs italic">{client.count} Orders</span>
                        </td>
                        <td className={`py-8 text-right font-black text-3xl italic tracking-tighter leading-none ${client.total >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                           {formatAmount(client.total)}
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

    </div>
  )
}

function MetricCard({ title, value, icon, color, actual, target, isInverse = false, subtitle }: { title: string; value: string; icon: string; color: string; actual?: number; target?: number; isInverse?: boolean; subtitle?: string }) {
  const themes: Record<string, string> = {
    sky: 'from-sky-50 to-white text-sky-600 border-sky-100',
    emerald: 'from-emerald-50 to-white text-emerald-600 border-emerald-100',
    rose: 'from-rose-50 to-white text-rose-600 border-rose-100',
    violet: 'from-violet-50 to-white text-violet-600 border-violet-100',
    amber: 'from-amber-50 to-white text-amber-600 border-amber-100',
  }

  const hasGoal = actual !== undefined && target !== undefined
  const isTargetMet = hasGoal ? (isInverse ? actual <= target : actual >= target) : true
  const variance = hasGoal ? actual - target : 0

  return (
    <div className={`p-10 rounded-[3.5rem] bg-gradient-to-br ${themes[color]} border shadow-sm transition-all hover:-translate-y-3 hover:shadow-3xl group cursor-default h-full relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="flex flex-col h-full justify-between relative z-10">
        <div className="flex items-start justify-between">
          <div className="w-14 h-14 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:rotate-6 transition-all">
            {icon}
          </div>
          {hasGoal && target > 0 && (
            <span className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-[10px] font-black italic tracking-tighter ${isTargetMet ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'} shadow-lg shadow-black/5`}>
              {isTargetMet ? '↑' : '↓'} {variance !== 0 ? Math.abs(variance/target*100).toFixed(0) : 0}%
            </span>
          )}
        </div>
        <div className="mt-14 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic leading-none">{title}</p>
          <p className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none group-hover:text-slate-900 transition-colors uppercase whitespace-nowrap">{value}</p>
          {subtitle && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}
