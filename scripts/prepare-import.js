const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const BILL_DIR = 'C:\\Users\\pc\\Desktop\\Sikas_Logistics'

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

function processFile(fileInfo) {
  const filePath = path.join(BILL_DIR, fileInfo.file)
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
        total_weight_tons: totalWeight,
        rate_per_ton: ratePerTon,
        revenue: amount,
        bill_no: fileInfo.billNo
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

async function importAll() {
  console.log('=== SIKAS ERP - Auto Import ===\n')
  
  // Collect all data
  let allVehicles = new Map()
  let allTrips = []
  let allClientCodes = new Set()
  
  for (const fileInfo of BILL_FILES) {
    console.log(`Reading: ${fileInfo.file}`)
    const { vehicles, trips, clientCodes } = processFile(fileInfo)
    vehicles.forEach(v => allVehicles.set(v.vehicle_number, v))
    allTrips = allTrips.concat(trips)
    clientCodes.forEach(c => allClientCodes.add(c))
  }
  
  console.log(`\nFound: ${allVehicles.size} vehicles, ${allClientCodes.size} clients, ${allTrips.length} trips`)
  
  // Show data summary
  console.log('\n=== Client Codes ===')
  console.log(Array.from(allClientCodes).sort().join(', '))
  
  console.log('\n=== Vehicle Numbers ===')
  console.log(Array.from(allVehicles.keys()).sort().join(', '))
  
  console.log('\n=== Sample Trips ===')
  allTrips.slice(0, 5).forEach(t => {
    console.log(`${t.trip_date} | ${t.vehicle_number} | ${t.client_code} | ${t.order_number} | ${t.revenue}`)
  })
  
  // Save data for reference
  const importData = {
    clients: Array.from(allClientCodes).map(c => ({
      client_code: c,
      client_name: `Client ${c}`,
      contact_person: '',
      phone: '',
      is_active: true
    })),
    vehicles: Array.from(allVehicles.values()),
    trips: allTrips
  }
  
  fs.writeFileSync(path.join(BILL_DIR, 'import-data.json'), JSON.stringify(importData, null, 2))
  console.log('\nSaved import data to: import-data.json')
  console.log('\nNow import this to Supabase using the web app or REST API.')
}

importAll()
