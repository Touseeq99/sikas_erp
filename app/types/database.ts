// SIKAS ERP - Database Types

export type DeliveryStatus = 'pending' | 'dispatched' | 'delivered' | 'cancelled'
export type InvoiceStatus = 'draft' | 'generated' | 'sent' | 'paid' | 'overdue'
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service'
export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'late'
export type UserRole = 'admin' | 'operations' | 'finance'

export interface Client {
  id: string
  client_code: string
  client_name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  credit_limit: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  vehicle_number: string
  vehicle_type: string | null
  make: string | null
  model: string | null
  year_of_manufacture: number | null
  capacity_tons: number
  registration_number: string | null
  fitness_expiry: string | null
  insurance_expiry: string | null
  status: VehicleStatus
  fuel_capacity: number | null
  average_km_per_liter: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  driver_code: string
  first_name: string
  last_name: string | null
  cnic: string | null
  phone: string | null
  emergency_contact: string | null
  license_number: string | null
  license_expiry: string | null
  hire_date: string | null
  salary: number
  overtime_rate: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  description: string | null
  manager_id: string | null
  is_active: boolean
  created_at: string
}

export interface TileType {
  id: string
  tile_name: string
  size_inches: string | null
  pieces_per_box: number
  weight_per_box_kg: number
  is_active: boolean
  created_at: string
}

export interface RateCard {
  id: string
  client_id: string
  tile_type_id: string
  rate_per_ton: number
  effective_from: string
  effective_to: string | null
  is_active: boolean
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  client_id: string
  order_date: string
  delivery_date: string | null
  delivery_address: string | null
  tile_quantities: Record<string, number>
  total_boxes: number
  total_weight_tons: number
  status: DeliveryStatus
  assigned_vehicle_id: string | null
  assigned_driver_id: string | null
  dispatch_date: string | null
  delivery_completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DispatchChallan {
  id: string
  challan_number: string
  order_id: string
  vehicle_id: string
  driver_id: string
  dispatch_date: string
  delivery_date: string | null
  delivery_address: string | null
  total_boxes: number
  total_weight_tons: number
  vehicle_start_km: number | null
  vehicle_end_km: number | null
  notes: string | null
  created_at: string
}

export interface VehicleUsageLog {
  id: string
  vehicle_id: string
  order_id: string | null
  driver_id: string | null
  date: string
  start_km: number | null
  end_km: number | null
  distance_km: number
  purpose: string | null
  created_at: string
}

export interface MaintenanceRecord {
  id: string
  vehicle_id: string
  maintenance_type: string
  description: string | null
  maintenance_date: string
  next_due_date: string | null
  cost: number
  service_provider: string | null
  status: string
  created_at: string
}

export interface FuelTracking {
  id: string
  vehicle_id: string
  driver_id: string | null
  fill_date: string
  quantity_liters: number
  cost: number
  odometer_reading: number | null
  fuel_station: string | null
  receipt_number: string | null
  created_at: string
}

export interface Attendance {
  id: string
  driver_id: string
  attendance_date: string
  status: AttendanceStatus
  check_in_time: string | null
  check_out_time: string | null
  overtime_hours: number
  notes: string | null
  created_at: string
}

export interface Salary {
  id: string
  driver_id: string
  month: number
  year: number
  base_salary: number
  overtime_hours: number
  overtime_amount: number
  deductions: number
  net_salary: number
  payment_date: string | null
  payment_status: string
  created_at: string
}

export interface Trip {
  id: string
  order_id: string | null
  vehicle_id: string
  driver_id: string
  trip_date: string
  origin: string | null
  destination: string | null
  distance_km: number
  weight_tons: number
  rate_per_ton: number
  revenue: number
  fuel_expense: number
  driver_expense: number
  other_expenses: number
  total_expenses: number
  profit: number
  created_at: string
}

export interface Expense {
  id: string
  expense_type: string
  description: string | null
  amount: number
  expense_date: string
  vehicle_id: string | null
  driver_id: string | null
  category: string | null
  receipt_number: string | null
  created_at: string
}

export interface Invoice {
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
  status: InvoiceStatus
  due_date: string | null
  paid_amount: number
  paid_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  trip_id: string | null
  date: string | null
  vehicle_number: string | null
  order_number: string | null
  delivery_address: string | null
  tile_quantities: Record<string, number>
  total_boxes: number
  total_weight_tons: number
  rate_per_ton: number
  amount: number
  created_at: string
}

export interface ClientContact {
  id: string
  client_id: string
  contact_name: string
  designation: string | null
  phone: string | null
  email: string | null
  is_primary: boolean
  created_at: string
}

export interface Complaint {
  id: string
  complaint_number: string
  client_id: string
  order_id: string | null
  complaint_type: string | null
  description: string
  priority: string
  status: ComplaintStatus
  assigned_to: string | null
  resolution_notes: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: UserRole
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  table_name: string
  record_id: string
  action: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

// Dashboard KPI Types
export interface DashboardKPIs {
  totalTrips: number
  completedTrips: number
  pendingTrips: number
  onTimeDeliveryRate: number
  avgProfitPerTrip: number
  totalRevenue: number
  totalExpenses: number
  totalProfit: number
  profitMargin: number
  fleetUtilization: number
  activeVehicles: number
  totalVehicles: number
  activeDrivers: number
  totalDrivers: number
  weeklyBillingTotal: number
  outstandingAmount: number
}

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

export interface WeeklyBillingData {
  week: string
  weight: number
  amount: number
}

export interface ProfitTrendData {
  week: string
  revenue: number
  expenses: number
  profit: number
}
