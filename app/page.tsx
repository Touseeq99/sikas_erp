'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area 
} from 'recharts'

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899']

interface KPI {
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
  const [profitTrips, setProfitTrips] = useState<any[]>([])
  const [maintenanceData, setMaintenanceData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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
      const [kpisRes, vehiclesRes, driversRes, ordersRes, revenueRes, expensesRes, profitRes, maintenanceRes] = await Promise.all([
        supabase.from('kpis').select('*').order('kpi_id'),
        supabase.from('vehicles').select('*').order('vehicle_id'),
        supabase.from('drivers').select('*').order('driver_id'),
        supabase.from('orders').select('*').order('order_id'),
        supabase.from('revenue').select('*').order('revenue_id'),
        supabase.from('expenses').select('*').order('expense_id'),
        supabase.from('profit_per_trip').select('*').order('trip_id'),
        supabase.from('maintenance_records').select('*').order('maintenance_date'),
      ])

      setKpisData(kpisRes.data || [])
      setVehicles(vehiclesRes.data || [])
      setDrivers(driversRes.data || [])
      setOrders(ordersRes.data || [])
      setRevenue(revenueRes.data || [])
      setExpenses(expensesRes.data || [])
      setProfitTrips(profitRes.data || [])
      setMaintenanceData(maintenanceRes.data || [])
      setLastUpdate(new Date().toLocaleTimeString())
      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setLoading(false)
    }
  }

  const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const totalTripExpenses = profitTrips.reduce((sum, t) => sum + (t.expenses || 0), 0)
  const totalMaintenanceExpenses = maintenanceData.reduce((sum, m) => sum + (m.cost || 0), 0)
  const totalAllExpenses = totalExpenses + totalTripExpenses + totalMaintenanceExpenses
  const totalProfit = totalRevenue - totalAllExpenses
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const activeVehicles = vehicles.filter(v => v.status === 'active' || v.status !== 'inactive').length

  const getKPIMetric = (metricName: string) => {
    const kpi = kpisData.find(k => k.metric === metricName)
    return kpi || { target: 0, actual: 0, variance: 0 }
  }

  // Calculate actual KPI values from real data
  const onTimeDeliveryRate = orders.length > 0 ? Math.round((deliveredOrders / orders.length) * 100) : 0
  const vehicleUtilizationRate = vehicles.length > 0 ? Math.round((activeVehicles / vehicles.length) * 100) : 0
  const costEfficiencyRate = totalRevenue > 0 ? Math.round(((totalRevenue - totalAllExpenses) / totalRevenue) * 100) : 0
  const avgProfitPerTrip = profitTrips.length > 0 ? Math.round(profitTrips.reduce((sum, t) => sum + ((t.revenue || 0) - (t.expenses || 0)), 0) / profitTrips.length) : 0

  const profitData = profitTrips.slice(0, 6).map(trip => ({
    trip: trip.order_id?.slice(-6) || 'Unknown',
    revenue: trip.revenue || 0,
    expenses: trip.expenses || 0,
    profit: (trip.revenue || 0) - (trip.expenses || 0)
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Last updated: {lastUpdate}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="On-Time Delivery" 
          value={`${onTimeDeliveryRate}%`} 
          subtitle="Based on delivered orders" 
          icon="📦" 
          color="sky"
        />
        <MetricCard 
          title="Vehicle Utilization" 
          value={`${vehicleUtilizationRate}%`} 
          subtitle={`${activeVehicles} of ${vehicles.length} vehicles`} 
          icon="🚛" 
          color="emerald"
        />
        <MetricCard 
          title="Cost Efficiency" 
          value={`${costEfficiencyRate}%`} 
          subtitle="Revenue vs expenses ratio" 
          icon="💰" 
          color="amber"
        />
        <MetricCard 
          title="Client Retention" 
          value="95%" 
          subtitle="Estimated retention rate" 
          icon="🤝" 
          color="violet"
        />
      </div>

      {/* Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Revenue" value={`PKR ${(totalRevenue/1000000).toFixed(2)}M`} subtitle="All time" icon="💰" color="green" />
        <MetricCard title="Total Expenses" value={`PKR ${(totalAllExpenses/1000000).toFixed(2)}M`} subtitle="All sources" icon="📉" color="red" />
        <MetricCard title="Net Profit" value={`PKR ${(totalProfit/1000000).toFixed(2)}M`} subtitle="All time" icon="💵" color="sky" />
        <MetricCard title="Avg Profit/Trip" value={`PKR ${avgProfitPerTrip.toLocaleString()}`} subtitle="Target: PKR 15,000" icon="📊" color="orange" />
      </div>

      {/* Fleet & Operations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Fleet Utilization" value={`${vehicleUtilizationRate}%`} subtitle={`${activeVehicles} active vehicles`} icon="🚛" color="blue" />
        <MetricCard title="Active Vehicles" value={`${activeVehicles}/${vehicles.length}`} subtitle="Available" icon="🚚" color="emerald" />
        <MetricCard title="Active Drivers" value={drivers.length.toString()} subtitle="Total drivers" icon="👤" color="violet" />
        <MetricCard title="Attendance Rate" value="92%" subtitle="Target: 90%" icon="📅" color="amber" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Order Status</h3>
            <span className="text-sm text-slate-400">Current distribution</span>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie 
                data={[
                  { name: 'Pending', value: pendingOrders },
                  { name: 'Delivered', value: deliveredOrders },
                  { name: 'In Use', value: orders.filter(o => o.status === 'dispatched').length },
                ]} 
                cx="50%" cy="50%" 
                innerRadius={60} 
                outerRadius={90} 
                paddingAngle={5} 
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {[
                  { name: 'Pending', value: pendingOrders },
                  { name: 'Delivered', value: deliveredOrders },
                  { name: 'In Use', value: orders.filter(o => o.status === 'dispatched').length },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {profitData.length > 0 && (
          <div className="chart-container">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Profit Analysis</h3>
              <span className="text-sm text-slate-400">Per trip breakdown</span>
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="trip" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `PKR ${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => `PKR ${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Bar dataKey="revenue" fill="#22c55e" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#0ea5e9" name="Profit" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center text-2xl">🚛</div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{vehicles.length}</p>
            <p className="text-sm text-slate-500">Total Vehicles</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl">🏢</div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{orders.length}</p>
            <p className="text-sm text-slate-500">Total Orders</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl">👥</div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{drivers.length}</p>
            <p className="text-sm text-slate-500">Total Drivers</p>
          </div>
        </div>
      </div>

      {/* KPI Performance */}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">📋 KPI Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">KPI</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Target</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Actual</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-sky-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">On-Time Delivery</td>
                <td className="px-4 py-3 text-slate-600">85%</td>
                <td className="px-4 py-3 text-slate-600">{onTimeDeliveryRate}%</td>
                <td className="px-4 py-3 text-slate-500 text-sm">Based on {deliveredOrders} delivered out of {orders.length} total orders</td>
              </tr>
              <tr className="hover:bg-sky-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">Vehicle Utilization</td>
                <td className="px-4 py-3 text-slate-600">75%</td>
                <td className="px-4 py-3 text-slate-600">{vehicleUtilizationRate}%</td>
                <td className="px-4 py-3 text-slate-500 text-sm">{activeVehicles} active vehicles out of {vehicles.length} total</td>
              </tr>
              <tr className="hover:bg-sky-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">Cost Efficiency</td>
                <td className="px-4 py-3 text-slate-600">80%</td>
                <td className="px-4 py-3 text-slate-600">{costEfficiencyRate}%</td>
                <td className="px-4 py-3 text-slate-500 text-sm">Revenue vs expenses ratio</td>
              </tr>
              <tr className="hover:bg-sky-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">Avg Profit/Trip</td>
                <td className="px-4 py-3 text-slate-600">15,000</td>
                <td className="px-4 py-3 text-slate-600">{avgProfitPerTrip.toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500 text-sm">Based on {profitTrips.length} profit records</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, subtitle, icon, color }: { title: string; value: string | number; subtitle: string; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    sky: 'from-sky-50 to-blue-50 border-sky-100',
    emerald: 'from-emerald-50 to-green-50 border-emerald-100',
    violet: 'from-violet-50 to-purple-50 border-violet-100',
    amber: 'from-amber-50 to-orange-50 border-amber-100',
    green: 'from-green-50 to-emerald-50 border-green-100',
    red: 'from-red-50 to-rose-50 border-red-100',
    orange: 'from-orange-50 to-amber-50 border-orange-100',
    blue: 'from-blue-50 to-sky-50 border-blue-100',
  }

  const iconBg: Record<string, string> = {
    sky: 'bg-sky-500', emerald: 'bg-emerald-500', violet: 'bg-violet-500',
    amber: 'bg-amber-500', green: 'bg-green-500', red: 'bg-red-500', orange: 'bg-orange-500', blue: 'bg-blue-500',
  }

  return (
    <div className={`card-gradient bg-gradient-to-br ${colorClasses[color]} border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${iconBg[color]} flex items-center justify-center text-white text-xl shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
