const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const BILL_DIR = 'C:\\Users\\pc\\Desktop\\Sikas_Logistics'

// Get Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-key'

const BILL_FILES = [
  { file: 'SIKAS BILL 08-14 AUG.xlsx', billNo: 80, weekStart: '2025-09-08', weekEnd: '2025-09-14' },
  { file: 'SIKAS BILL 15-21 SEP.xlsx', billNo: 81, weekStart: '2025-09-15', weekEnd: '2025-09-21' },
  { file: 'SIKAS BILL 1-7 SEP.xlsx', billNo: 79, weekStart: '2025-09-01', weekEnd: '2025-09-07' },
  { file: 'SIKAS BILL 22-31 SEP.xlsx', billNo: 77, weekStart: '2025-08-22', weekEnd: '2025-08-31' }
]

// Client code mapping - map short codes to your client IDs
// You'll need to update this after checking your Supabase clients table
const CLIENT_CODE_MAP = {
  'ORL001': 'C-001', // These are your Supabase client_code values
  'ORL002': 'OR-002',
  'ORL003': 'C-006',
}

function excelDateToJSDate(serial) {
  if (!serial) return '2025-09-01'
  const excelEpoch = new Date(1899, 11, 30)
  const days = Math.floor(serial)
  const date = new Date(excelEpoch)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

async function callSupabase(table, method, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`
  const res = await fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    },
    body: data ? JSON.stringify(data) : undefined
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${table}: ${res.status} - ${err}`)
  }
  return method === 'POST' ? res.json() : null
}

async function processFile(fileInfo) {
  const filePath = path.join(BILL_DIR, fileInfo.file)
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${fileInfo.file}`)
    return { vehicles: [], trips: [] }
  }

  const workbook = XLSX.readFile(filePath)
  const sheet1 = workbook.Sheets['Sheet1']
  const range = XLSX.utils.decode_range(sheet1['!ref'])
  
  const trips = []
  const vehicleNumbers = new Set()
  
  // Get tile sizes from row 3
  const tileSizes = []
  for (let c = 6; c <= 17; c++) {
    const size = sheet1[XLSX.utils.encode_cell({r: 3, c})]?.v?.toString().trim()
    if (size) tileSizes.push(size)
  }
  
  // Data starts from row 6 (index 5)
  for (let r = 5; r <= range.e.r; r++) {
    const srNo = sheet1[XLSX.utils.encode_cell({r, c: 0})]?.v
    if (!srNo || typeof srNo !== 'number') continue
    
    const dateSerial = sheet1[XLSX.utils.encode_cell({r, c: 1})]?.v
    const vehicleNum = sheet1[XLSX.utils.encode_cell({r, c: 2})]?.v?.toString().trim() || ''
    const clientCode = sheet1[XLSX.utils.encode_cell({r, c: 3})]?.v?.toString().trim() || ''
    const orderNum = sheet1[XLSX.utils.encode_cell({r, c: 4})]?.v?.toString().trim() || ''
    const address = sheet1[XLSX.utils.encode_cell({r, c: 5})]?.v?.toString().trim() || ''
    
    const totalBoxes = sheet1[XLSX.utils.encode_cell({r, c: 18})]?.v || 0
    const totalWeight = sheet1[XLSX.utils.encode_cell({r, c: 19})]?.v || 0
    const ratePerTon = sheet1[XLSX.utils.encode_cell({r, c: 20})]?.v || 0
    const amount = sheet1[XLSX.utils.encode_cell({r, c: 21})]?.v || 0
    
    if (amount > 0 && vehicleNum) {
      vehicleNumbers.add(vehicleNum.toUpperCase().replace(/\s/g, ''))
      
      trips.push({
        trip_date: excelDateToJSDate(dateSerial),
        vehicle_number: vehicleNum.toUpperCase().replace(/\s/g, ''),
        client_code: clientCode.toUpperCase().replace(/\s/g, ''),
        order_number: orderNum,
        destination: address,
        total_weight_tons: totalWeight,
        rate_per_ton: ratePerTon,
        revenue: amount,
        total_expenses: 0,
        profit: amount,
        bill_no: fileInfo.billNo,
        week_start: fileInfo.weekStart,
        week_end: fileInfo.weekEnd
      })
    }
  }
  
  const vehicles = Array.from(vehicleNumbers).map(v => ({
    vehicle_number: v,
    vehicle_type: 'Truck',
    capacity_tons: 20,
    status: 'available',
    is_active: true
  }))
  
  return { vehicles, trips }
}

async function main() {
  console.log('=== SIKAS ERP - Supabase Import ===\n')
  console.log('URL:', SUPABASE_URL)
  console.log('')
  
  if (SUPABASE_URL.includes('your-project')) {
    console.log('ERROR: Please set environment variables:')
    console.log('  NEXT_PUBLIC_SUPABASE_URL=your-actual-url')
    console.log('  SUPABASE_SERVICE_KEY=your-service-key')
    console.log('\nAlternatively, use the web import at: http://localhost:3000/master-data/import')
    process.exit(1)
  }
  
  let allVehicles = new Map()
  let allTrips = []
  
  for (const fileInfo of BILL_FILES) {
    console.log(`Processing: ${fileInfo.file}`)
    const { vehicles, trips } = await processFile(fileInfo)
    
    // Merge vehicles
    for (const v of vehicles) {
      if (!allVehicles.has(v.vehicle_number)) {
        allVehicles.set(v.vehicle_number, v)
      }
    }
    
    allTrips = allTrips.concat(trips)
    console.log(`  Trips: ${trips.length}`)
  }
  
  console.log(`\nTotal: ${allVehicles.size} vehicles, ${allTrips.length} trips`)
  
  // Import vehicles first
  console.log('\n=== Importing Vehicles ===')
  let vehicleImported = 0
  for (const [num, vehicle] of allVehicles) {
    try {
      await callSupabase('vehicles', 'POST', vehicle)
      vehicleImported++
    } catch (e) {
      if (e.message.includes('duplicate')) {
        console.log(`  Vehicle ${num} already exists`)
      } else {
        console.log(`  Error: ${e.message}`)
      }
    }
  }
  console.log(`Imported ${vehicleImported} vehicles`)
  
  // Import trips
  console.log('\n=== Importing Trips ===')
  let tripImported = 0
  for (const trip of allTrips) {
    try {
      // Transform to match schema
      const tripData = {
        trip_date: trip.trip_date,
        origin: '',
        destination: trip.destination,
        distance_km: 0,
        weight_tons: trip.total_weight_tons,
        rate_per_ton: trip.rate_per_ton,
        revenue: trip.revenue,
        fuel_expense: 0,
        driver_expense: 0,
        other_expenses: 0,
        total_expenses: 0,
        profit: trip.profit
      }
      await callSupabase('trips', 'POST', tripData)
      tripImported++
    } catch (e) {
      console.log(`  Error: ${e.message}`)
    }
  }
  console.log(`Imported ${tripImported} trips`)
  
  console.log('\n=== Import Complete ===')
}

main().catch(console.error)
