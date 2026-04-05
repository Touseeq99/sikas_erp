const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// ============================================================================
// CONFIGURATION - Edit these before running
// ============================================================================
const CONFIG = {
  SUPABASE_URL: 'https://tyikmvfjnuidbtrxmawz.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5aWttdmZqbnVpZGJ0cnhtYXd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM3ODUyMSwiZXhwIjoyMDkwOTU0NTIxfQ.yoP1HC4SV_vf9-dcTE-HR8zPt0yzASb-yu4P7wbQ5zg',
  BILL_DIR: 'C:\\Users\\pc\\Desktop\\Sikas_Logistics'
}

// ============================================================================
// BILL FILES TO PROCESS
// ============================================================================
const BILL_FILES = [
  { file: 'SIKAS BILL 08-14 AUG.xlsx', billNo: 80, weekStart: '2025-09-08', weekEnd: '2025-09-14' },
  { file: 'SIKAS BILL 15-21 SEP.xlsx', billNo: 81, weekStart: '2025-09-15', weekEnd: '2025-09-21' },
  { file: 'SIKAS BILL 1-7 SEP.xlsx', billNo: 79, weekStart: '2025-09-01', weekEnd: '2025-09-07' },
  { file: 'SIKAS BILL 22-31 SEP.xlsx', billNo: 77, weekStart: '2025-08-22', weekEnd: '2025-08-31' }
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Convert Excel date serial to JS date string
function excelDateToJSDate(serial) {
  if (!serial) return '2025-09-01'
  const excelEpoch = new Date(1899, 11, 30)  // Excel epoch with leap year bug fix
  const days = Math.floor(serial)
  const date = new Date(excelEpoch)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

// Call Supabase REST API
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
    throw new Error(`${table} (${method}): ${res.status} - ${err}`)
  }
  return method === 'POST' ? res.json() : null
}

// ============================================================================
// PROCESS EXCEL FILES
// ============================================================================

function processFile(fileInfo) {
  const filePath = path.join(CONFIG.BILL_DIR, fileInfo.file)
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${fileInfo.file}`)
    return { vehicles: [], trips: [] }
  }

  const workbook = XLSX.readFile(filePath)
  const sheet1 = workbook.Sheets['Sheet1']
  const range = XLSX.utils.decode_range(sheet1['!ref'])
  
  const trips = []
  const vehicleNumbers = new Set()
  const clientCodes = new Set()
  
  console.log(`  📄 Reading ${fileInfo.file}...`)
  console.log(`     Range: ${range.e.r + 1} rows`)
  
  // Data starts from row 6 (index 5) - rows 0-4 are headers
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
  
  // Create vehicle records (default values)
  const vehicles = Array.from(vehicleNumbers).map(v => ({
    vehicle_number: v,
    vehicle_type: 'Truck',
    make: 'Hino',
    model: 'FG2JRTD',
    capacity_tons: 20,
    status: 'available',
    is_active: true
  }))
  
  console.log(`     ✓ Found ${trips.length} trips, ${vehicleNumbers.size} vehicles`)
  
  return { vehicles, trips, clientCodes: Array.from(clientCodes) }
}

// ============================================================================
// MAIN IMPORT FUNCTION
// ============================================================================

async function runImport() {
  console.log('\n' + '='.repeat(60))
  console.log('🚚 SIKAS ERP - AUTO IMPORT TO SUPABASE')
  console.log('='.repeat(60) + '\n')
  
  // Check config
  if (CONFIG.SUPABASE_URL.includes('your-project')) {
    console.log('❌ ERROR: Please configure your Supabase credentials!')
    console.log('\nEdit these values in scripts/auto-import.js:')
    console.log('  SUPABASE_URL: Your project URL')
    console.log('  SUPABASE_KEY: Your service_role key')
    console.log('\nTo get your service_role key:')
    console.log('  1. Go to Supabase Dashboard')
    console.log('  2. Settings → API')
    console.log('  3. Copy "service_role" key (not "anon")\n')
    process.exit(1)
  }
  
  console.log(`📡 Connecting to: ${CONFIG.SUPABASE_URL}\n`)
  
  // Step 1: Process all Excel files
  console.log('📊 STEP 1: Processing Excel Files')
  console.log('-'.repeat(40))
  
  let allVehicles = new Map()
  let allTrips = []
  let allClientCodes = new Set()
  
  for (const fileInfo of BILL_FILES) {
    const { vehicles, trips, clientCodes } = processFile(fileInfo)
    vehicles.forEach(v => allVehicles.set(v.vehicle_number, v))
    allTrips = allTrips.concat(trips)
    clientCodes.forEach(c => allClientCodes.add(c))
  }
  
  console.log(`\n📈 Total Found:`)
  console.log(`   • Vehicles: ${allVehicles.size}`)
  console.log(`   • Clients: ${allClientCodes.size}`)
  console.log(`   • Trips: ${allTrips.length}`)
  
  // Step 2: Import Clients
  console.log('\n👥 STEP 2: Importing Clients')
  console.log('-'.repeat(40))
  
  for (const clientCode of allClientCodes) {
    try {
      await supabaseCall('clients', 'POST', {
        client_code: clientCode,
        client_name: `Client ${clientCode}`,
        is_active: true
      })
      console.log(`   ✓ Added client: ${clientCode}`)
    } catch (e) {
      if (e.message.includes('duplicate')) {
        console.log(`   ○ Already exists: ${clientCode}`)
      } else {
        console.log(`   ✗ Error: ${clientCode} - ${e.message.substring(0, 50)}`)
      }
    }
  }
  
  // Step 3: Import Vehicles
  console.log('\n🚛 STEP 3: Importing Vehicles')
  console.log('-'.repeat(40))
  
  let vehicleCount = 0
  for (const [num, vehicle] of allVehicles) {
    try {
      await supabaseCall('vehicles', 'POST', vehicle)
      vehicleCount++
      if (vehicleCount % 10 === 0) console.log(`   ✓ Added ${vehicleCount} vehicles...`)
    } catch (e) {
      if (e.message.includes('duplicate')) {
        // Skip duplicates
      } else {
        console.log(`   ✗ Error: ${num} - ${e.message.substring(0, 50)}`)
      }
    }
  }
  console.log(`   ✓ Total vehicles imported: ${vehicleCount}`)
  
  // Step 4: Import Trips
  console.log('\n📋 STEP 4: Importing Trips')
  console.log('-'.repeat(40))

  // First, get vehicle IDs to link
  const vehicleRes = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/vehicles?select=vehicle_number,id`, {
    headers: {
      'apikey': CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
    }
  })
  const vehicleData = await vehicleRes.json()
  const vehicleMap = new Map()
  if (Array.isArray(vehicleData)) {
    vehicleData.forEach(v => vehicleMap.set(v.vehicle_number, v.id))
  }

  // Get client IDs to link
  const clientRes = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/clients?select=client_code,id`, {
    headers: {
      'apikey': CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
    }
  })
  const clientData = await clientRes.json()
  const clientMap = new Map()
  if (Array.isArray(clientData)) {
    clientData.forEach(c => clientMap.set(c.client_code, c.id))
  }

  console.log(`   Found ${vehicleMap.size} vehicles, ${clientMap.size} clients in database`)
  
  let tripCount = 0
  let tripErrors = 0
  
  for (const trip of allTrips) {
    try {
      const vehicleId = vehicleMap.get(trip.vehicle_number)
      const clientId = clientMap.get(trip.client_code)
      
      await supabaseCall('trips', 'POST', {
        vehicle_id: vehicleId,
        driver_id: null,
        trip_date: trip.trip_date,
        origin: '',
        destination: trip.destination,
        distance_km: 0,
        weight_tons: trip.weight_tons,
        rate_per_ton: trip.rate_per_ton,
        revenue: trip.revenue,
        fuel_expense: 0,
        driver_expense: 0,
        other_expenses: 0,
        total_expenses: 0,
        profit: trip.profit
      })
      tripCount++
      if (tripCount % 20 === 0) console.log(`   ✓ Imported ${tripCount} trips...`)
    } catch (e) {
      tripErrors++
      if (tripErrors <= 5) {
        console.log(`   ✗ Error: ${trip.vehicle_number} - ${e.message.substring(0, 40)}`)
      }
    }
  }
  
  console.log(`   ✓ Total trips imported: ${tripCount}`)
  if (tripErrors > 0) console.log(`   ⚠️  Errors: ${tripErrors}`)
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('✅ IMPORT COMPLETE!')
  console.log('='.repeat(60))
  console.log(`   • Clients: ${allClientCodes.size}`)
  console.log(`   • Vehicles: ${vehicleCount}`)
  console.log(`   • Trips: ${tripCount}`)
  console.log('\nNow you can view data in your SIKAS ERP dashboard!\n')
}

// ============================================================================
// RUN
// ============================================================================

runImport().catch(e => {
  console.error('\n❌ IMPORT FAILED:', e.message)
  process.exit(1)
})
