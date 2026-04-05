const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const CONFIG = {
  SUPABASE_URL: 'https://tyikmvfjnuidbtrxmawz.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5aWttdmZqbnVpZGJ0cnhtYXd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM3ODUyMSwiZXhwIjoyMDkwOTU0NTIxfQ.yoP1HC4SV_vf9-dcTE-HR8zPt0yzASb-yu4P7wbQ5zg',
  BILL_DIR: 'C:\\Users\\pc\\Desktop\\Sikas_Logistics'
}

const BILL_FILES = [
  { file: 'SIKAS BILL 08-14 AUG.xlsx', billNo: 80, weekStart: '2025-09-08', weekEnd: '2025-09-14' },
  { file: 'SIKAS BILL 15-21 SEP.xlsx', billNo: 81, weekStart: '2025-09-15', weekEnd: '2025-09-21' },
  { file: 'SIKAS BILL 1-7 SEP.xlsx', billNo: 79, weekStart: '2025-09-01', weekEnd: '2025-09-07' },
  { file: 'SIKAS BILL 22-31 SEP.xlsx', billNo: 77, weekStart: '2025-08-22', weekEnd: '2025-08-31' }
]

function excelDateToJSDate(serial) {
  if (!serial) return '2025-09-01'
  const excelEpoch = new Date(1899, 11, 30)
  const days = Math.floor(serial)
  const date = new Date(excelEpoch)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

async function supabaseCall(table, method, data) {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/${table}`
  const res = await fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    },
    body: data ? JSON.stringify(data) : undefined
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${res.status} - ${err.substring(0, 100)}`)
  }
  return method === 'POST' ? res.json() : null
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function processFile(fileInfo) {
  const filePath = path.join(CONFIG.BILL_DIR, fileInfo.file)
  if (!fs.existsSync(filePath)) return { vehicles: [], trips: [] }

  const workbook = XLSX.readFile(filePath)
  const sheet1 = workbook.Sheets['Sheet1']
  const range = XLSX.utils.decode_range(sheet1['!ref'])
  
  const trips = []
  const vehicleNumbers = new Set()
  const clientCodes = new Set()
  
  for (let r = 5; r <= range.e.r; r++) {
    const srNo = sheet1[XLSX.utils.encode_cell({r, c: 0})]?.v
    if (!srNo || typeof srNo !== 'number') continue
    
    const dateSerial = sheet1[XLSX.utils.encode_cell({r, c: 1})]?.v
    const vehicleNum = sheet1[XLSX.utils.encode_cell({r, c: 2})]?.v?.toString().trim() || ''
    const clientCode = sheet1[XLSX.utils.encode_cell({r, c: 3})]?.v?.toString().trim() || ''
    const orderNum = sheet1[XLSX.utils.encode_cell({r, c: 4})]?.v?.toString().trim() || ''
    const address = sheet1[XLSX.utils.encode_cell({r, c: 5})]?.v?.toString().trim() || ''
    const totalWeight = sheet1[XLSX.utils.encode_cell({r, c: 19})]?.v || 0
    const ratePerTon = sheet1[XLSX.utils.encode_cell({r, c: 20})]?.v || 0
    const amount = sheet1[XLSX.utils.encode_cell({r, c: 21})]?.v || 0
    
    if (amount > 0 && vehicleNum) {
      const v = vehicleNum.toUpperCase().replace(/\s/g, '')
      const c = clientCode.toUpperCase().replace(/\s/g, '')
      vehicleNumbers.add(v)
      clientCodes.add(c)
      
      trips.push({
        trip_date: excelDateToJSDate(dateSerial),
        vehicle_number: v,
        client_code: c,
        order_number: orderNum,
        destination: address,
        weight_tons: totalWeight,
        rate_per_ton: ratePerTon,
        revenue: amount,
        fuel_expense: 0,
        driver_expense: 0,
        other_expenses: 0,
        total_expenses: 0,
        profit: amount
      })
    }
  }
  
  const vehicles = Array.from(vehicleNumbers).map(v => ({
    vehicle_number: v,
    vehicle_type: 'Truck',
    make: 'Hino',
    model: 'FG2JRTD',
    capacity_tons: 20,
    status: 'available',
    is_active: true
  }))
  
  return { vehicles, trips, clientCodes: Array.from(clientCodes) }
}

async function runImport() {
  console.log('\n' + '='.repeat(60))
  console.log('🚚 SIKAS ERP - IMPORT VEHICLES ONLY')
  console.log('='.repeat(60) + '\n')
  
  // Process all files to get unique vehicles
  let allVehicles = new Map()
  let allTrips = []
  let allClientCodes = new Set()
  
  for (const fileInfo of BILL_FILES) {
    const { vehicles, trips, clientCodes } = processFile(fileInfo)
    vehicles.forEach(v => allVehicles.set(v.vehicle_number, v))
    allTrips = allTrips.concat(trips)
    clientCodes.forEach(c => allClientCodes.add(c))
  }
  
  console.log(`Found ${allVehicles.size} unique vehicles\n`)
  
  // Get existing vehicles
  const vehicleRes = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/vehicles?select=vehicle_number,id`, {
    headers: {
      'apikey': CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
    }
  })
  const existingVehicles = await vehicleRes.json()
  const existingMap = new Map()
  if (Array.isArray(existingVehicles)) {
    existingVehicles.forEach(v => existingMap.set(v.vehicle_number, v.id))
  }
  console.log(`Existing vehicles: ${existingMap.size}\n`)
  
  // Add missing vehicles
  let added = 0
  let skipped = 0
  
  for (const [num, vehicle] of allVehicles) {
    if (existingMap.has(num)) {
      skipped++
      continue
    }
    
    try {
      await supabaseCall('vehicles', 'POST', vehicle)
      added++
      if (added % 10 === 0) console.log(`✓ Added ${added} vehicles...`)
    } catch (e) {
      console.log(`✗ Error adding ${num}: ${e.message}`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`✅ COMPLETE!`)
  console.log('='.repeat(60))
  console.log(`   • Skipped (already exists): ${skipped}`)
  console.log(`   • New vehicles added: ${added}`)
  console.log(`   • Total vehicles in DB: ${existingMap.size + added}\n`)
}

runImport().catch(console.error)
