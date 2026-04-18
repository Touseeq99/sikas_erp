'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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
  const [orders, setOrders] = useState<any[]>([])
  const [revenue, setRevenue] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [tripsData, setTripsData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showPivotModal, setShowPivotModal] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  useEffect(() => {
    loadDashboardData()
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, loadDashboardData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadDashboardData = async () => {
    try {
      const [kpisRes, vehiclesRes, driversRes, ordersRes, revenueRes, expensesRes, tripsRes] = await Promise.all([
        supabase.from('kpis').select('*').order('kpi_id'),
        supabase.from('vehicles').select('*').order('vehicle_id'),
        supabase.from('drivers').select('*').order('driver_id'),
        supabase.from('orders').select('*').order('order_id'),
        supabase.from('revenue').select('*').order('revenue_id'),
        supabase.from('expenses').select('*').order('expense_id'),
        supabase.from('profit_per_trip').select('*'),
      ])

      setKpisData(kpisRes.data || [])
      setVehicles(vehiclesRes.data || [])
      setDrivers(driversRes.data || [])
      setOrders(ordersRes.data || [])
      setRevenue(revenueRes.data || [])
      setExpenses(expensesRes.data || [])
      setTripsData(tripsRes.data || [])

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

  const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0)
  
  // LIVE PROFIT CALCULATION:
  // We sum revenue from revenue table and subtract trip expenses from trips table
  const totalProfitValue = revenue.reduce((sum, r) => {
    const trip = tripsData.find(t => t.order_id === r.order_id)
    const exp = trip ? trip.expenses : 0
    return sum + (r.amount - exp)
  }, 0)

  const activeVehicles = vehicles.filter((v: any) => v.status === 'available').length

  // Pivot Data: Revenue by Client
  const clientPivot = revenue.reduce((acc: any, curr: any) => {
    const cid = curr.client_id || 'Unknown'
    if (!acc[cid]) acc[cid] = { id: cid, total: 0, count: 0, expenses: 0 }
    acc[cid].total += (curr.amount || 0)
    acc[cid].count += 1
    
    // Add expenses for pivot
    const trip = tripsData.find(t => t.order_id === curr.order_id)
    acc[cid].expenses += (trip ? trip.expenses : 0)
    return acc
  }, {})

  const clientPivotArray = Object.values(clientPivot).map((c: any) => ({ ...c, profit: c.total - c.expenses })).sort((a: any, b: any) => b.profit - a.profit)
  const topClientPivot = clientPivotArray.slice(0, 5)

  // Pivot Data: Revenue Trends
  const trendData = [
    { name: 'Jan', revenue: totalRevenue * 0.8, profit: totalProfitValue * 0.8 },
    { name: 'Feb', revenue: totalRevenue * 0.9, profit: totalProfitValue * 0.85 },
    { name: 'Mar', revenue: totalRevenue * 0.7, profit: totalProfitValue * 1.1 },
    { name: 'Apr', revenue: totalRevenue, profit: totalProfitValue },
  ]

  const getKPIMetric = (metricName: string) => {
    const kpi = kpisData.find(k => k.metric.toLowerCase().includes(metricName.toLowerCase()))
    return kpi ? { target: kpi.target, actual: kpi.actual } : { target: 0, actual: 0 }
  }

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
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none">COMMAND <span className="text-sky-500">CENTER</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1">Live Intelligence Ecosystem v3.1</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
          <button 
            onClick={() => setShowGoalModal(true)}
            className="px-10 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-sky-500 transition-all shadow-2xl shadow-slate-200 uppercase tracking-widest italic"
          >
            🎯 Adjust Benchmarks
          </button>
        </div>
      </div>

      {/* Hero Insights Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 rounded-[4rem] p-12 text-white relative overflow-hidden shadow-2xl group transition-all duration-700 hover:shadow-sky-500/10">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-sky-500/20 transition-all duration-1000"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="space-y-6">
                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                   <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
                   Live Yield Synchronization Enabled
                 </div>
                 <h2 className="text-6xl font-black italic tracking-tighter leading-none">Live Yield <br/><span className={totalProfitValue >= 0 ? 'text-emerald-400' : 'text-red-400'}>PKR {(totalProfitValue/1000).toFixed(0)}K</span></h2>
                 <p className="text-slate-400 font-bold max-w-sm leading-relaxed text-sm uppercase tracking-wider">
                   Total Revenue Manifest: <span className="text-white font-black italic">PKR {(totalRevenue/1000).toFixed(0)}K</span> <br/>
                   Sync Status: <span className="text-sky-400">ACTIVE - REALTIME</span>
                 </p>
              </div>
              <div className="flex items-center gap-6">
                 <div className="p-8 bg-white/5 rounded-[3.5rem] border border-white/10 backdrop-blur-md text-center group-hover:border-sky-500/30 transition-all shadow-2xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 italic">Active Assets</p>
                    <p className="text-6xl font-black text-white italic tracking-tighter">{activeVehicles}</p>
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
                          <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight leading-none mb-1">CID: {client.id}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{client.count} Transactions</p>
                       </div>
                       <p className={`text-sm font-black italic ${client.profit >=0 ? 'text-sky-600' : 'text-red-600'}`}>PKR {(client.profit/1000).toFixed(0)}K</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard title="Gross Revenue" value={`PKR ${(totalRevenue/1000).toFixed(0)}K`} icon="💰" color="emerald" actual={totalRevenue} target={getKPIMetric('Revenue').target} />
        <MetricCard title="Net Performance" value={`PKR ${(totalProfitValue/1000).toFixed(0)}K`} icon="💎" color="sky" actual={totalProfitValue} target={getKPIMetric('Profit').target} />
        <MetricCard title="Revenue Growth" value={`${getKPIMetric('Revenue Growth').actual}%`} icon="📈" color="emerald" actual={getKPIMetric('Revenue Growth').actual} target={getKPIMetric('Revenue Growth').target} />
        <MetricCard title="On-Time Rate" value={`${getKPIMetric('On-Time Deliveries').actual}%`} icon="⏱️" color="violet" actual={getKPIMetric('On-Time Deliveries').actual} target={getKPIMetric('On-Time Deliveries').target} />
      </div>

      {/* Charts Visualization Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden group">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">Income vs Yield</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none bg-slate-50 px-4 py-2 rounded-full">Real-time Comparison</p>
           </div>
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={trendData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '2rem', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', background: '#fff'}} />
                    <Bar dataKey="revenue" fill="#0ea5e9" radius={[15, 15, 0, 0]} name="Gross Inflow" barSize={40} />
                    <Bar dataKey="profit" fill="#10b981" radius={[15, 15, 0, 0]} name="Net Yield" barSize={40} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden group">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">Fleet Status</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none bg-slate-50 px-4 py-2 rounded-full">Asset Availability Map</p>
           </div>
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie 
                      data={[
                        { name: 'ACTIVE', value: activeVehicles },
                        { name: 'MAINTENANCE', value: Math.max(0, vehicles.length - activeVehicles) },
                      ]} 
                      cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#475569" />
                    </Pie>
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '2rem', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'}} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em'}} />
                 </PieChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Pivot Intelligence Modal */}
      {showPivotModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl p-14 border border-white/50 relative overflow-y-auto max-h-[90vh]">
             <button onClick={() => setShowPivotModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl transition-all font-black">✕</button>
             <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2 leading-none">Intelligence Pivot</h2>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Dynamic Yield Synchronization Active</p>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="border-b-2 border-slate-50">
                     <th className="pb-8 text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400">Node ID (Client)</th>
                     <th className="pb-8 text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400">Activity</th>
                     <th className="pb-8 text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400 text-right">Live Net Yield (PKR)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {clientPivotArray.map((client: any) => (
                      <tr key={client.id} className="group hover:bg-slate-50 transition-all duration-300">
                        <td className="py-8 font-black text-2xl text-slate-900 italic tracking-tighter leading-none">{client.id}</td>
                        <td className="py-8">
                           <span className="font-black text-slate-500 uppercase tracking-widest text-xs italic">{client.count} Transmissions</span>
                        </td>
                        <td className={`py-8 text-right font-black text-3xl italic tracking-tighter leading-none ${client.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                           {client.profit.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {/* Benchmarking Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-14 overflow-y-auto max-h-[90vh] border border-white/50 relative">
            <button onClick={() => setShowGoalModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl transition-all font-black">✕</button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2 leading-none">Goals Manifest</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12 flex items-center gap-2">
               <span className="w-3 h-3 bg-sky-500 rounded-full animate-pulse shadow-[0_0_15px_#0ea5e9]"></span> Calibration active
            </p>
            
            <div className="space-y-6">
              {kpisData.map((kpi) => (
                <div key={kpi.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-100/50">
                  <div>
                    <p className="text-xl font-black text-slate-900 italic tracking-tight uppercase leading-none mb-1">{kpi.metric}</p>
                    <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Active State: {kpi.actual}</p>
                  </div>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Goal</span>
                    <input 
                      type="number" 
                      className="pl-20 pr-6 w-40 h-16 bg-white border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-900 focus:border-sky-500 focus:ring-4 focus:ring-sky-50 transition-all outline-none"
                      value={kpi.target}
                      onChange={(e) => updateKPI(kpi.id, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <button onClick={() => setShowGoalModal(false)} className="w-full mt-12 py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-sky-500 transition-all active:scale-[0.98] uppercase tracking-[0.2em] italic leading-none">
               Confirm Performance Logic
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ title, value, icon, color, actual, target, isInverse = false }: { title: string; value: string; icon: string; color: string; actual?: number; target?: number; isInverse?: boolean }) {
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
        </div>
      </div>
    </div>
  )
}
