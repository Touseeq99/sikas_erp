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

// Client code mapping (from your data - these appear to be short codes)
const CLIENT_CODE_MAP = {
  'C-001': 'ORL001', // Map to your existing Oreal
  'C-008': 'ORL001',
  'C-022': 'ORL001',
  'C-043': 'ORL001',
  'C-044': 'ORL001',
  'C-058': 'ORL001',
  'C-060': 'ORL001',
  'C-072': 'ORL001',
  'C-154': 'ORL001',
  'C-157': 'ORL001',
  'C-167': 'ORL001',
  'C-176': 'ORL001',
  'C-180': 'ORL001',
  'C-195': 'ORL001',
  'C-231': 'ORL001',
  'C-339': 'ORL001',
  'C-345': 'ORL001',
  'C-349': 'ORL001',
  'C-363': 'ORL001',
  'OR-002': 'ORL002', // Dawn Ceramics
  'C-006': 'ORL003',  // Shams Ceramics
}

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
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${fileInfo.file}`)
    return []
  }

  const workbook = XLSX.readFile(filePath)
  const sheet1 = workbook.Sheets['Sheet1']
  const range = XLSX.utils.decode_range(sheet1['!ref'])
  
  const records = []
  
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
    
    // Tile quantities
    const tileQuantities = {}
    for (let c = 6; c <= 17; c++) {
      const cell = sheet1[XLSX.utils.encode_cell({r, c})]
      if (cell?.v && cell.v > 0 && tileSizes[c-6]) {
        tileQuantities[tileSizes[c-6]] = cell.v
      }
    }
    
    const totalBoxes = sheet1[XLSX.utils.encode_cell({r, c: 18})]?.v || 0
    const totalWeight = sheet1[XLSX.utils.encode_cell({r, c: 19})]?.v || 0
    const ratePerTon = sheet1[XLSX.utils.encode_cell({r, c: 20})]?.v || 0
    const amount = sheet1[XLSX.utils.encode_cell({r, c: 21})]?.v || 0
    
    if (amount > 0) {
      records.push({
        bill_no: fileInfo.billNo,
        week_start: fileInfo.weekStart,
        week_end: fileInfo.weekEnd,
        sr_no: srNo,
        date: excelDateToJSDate(dateSerial),
        vehicle_number: vehicleNum.toUpperCase().replace(/\s/g, ''),
        client_code: clientCode.toUpperCase().replace(/\s/g, ''),
        order_number: orderNum,
        delivery_address: address,
        tile_quantities: tileQuantities,
        total_boxes: totalBoxes,
        total_weight_tons: totalWeight,
        rate_per_ton: ratePerTon,
        amount: amount,
        sheet2_tax: null
      })
    }
  }
  
  return records
}

function processSheet2(workbook, billNo) {
  const sheet2 = workbook.Sheets['Sheet2']
  if (!sheet2) return null
  
  const range = XLSX.utils.decode_range(sheet2['!ref'])
  
  // Find sales tax total - typically in later rows
  for (let r = 5; r <= range.e.r; r++) {
    const desc = sheet2[XLSX.utils.encode_cell({r, c: 0})]?.v?.toString() || ''
    const value = sheet2[XLSX.utils.encode_cell({r, c: 1})]?.v || 0
    
    if (desc.toLowerCase().includes('tax') || desc.toLowerCase().includes('total')) {
      console.log(`  Sheet2 row ${r}: ${desc} = ${value}`)
    }
  }
  
  return null
}

// Main
console.log('=== Processing SIKAS Bill Files ===\n')

let allRecords = []
for (const fileInfo of BILL_FILES) {
  console.log(`Processing: ${fileInfo.file}`)
  const records = processFile(fileInfo)
  
  // Also check Sheet2 for tax info
  const workbook = XLSX.readFile(path.join(BILL_DIR, fileInfo.file))
  processSheet2(workbook, fileInfo.billNo)
  
  console.log(`  Found ${records.length} records`)
  allRecords = allRecords.concat(records)
}

console.log(`\n=== Total: ${allRecords.length} records ===\n`)

// Unique vehicles and clients
const uniqueVehicles = [...new Set(allRecords.map(r => r.vehicle_number))].filter(v => v)
const uniqueClients = [...new Set(allRecords.map(r => r.client_code))].filter(c => c)

console.log(`Unique vehicles: ${uniqueVehicles.length}`)
console.log(uniqueVehicles.join(', '))
console.log(`\nUnique clients: ${uniqueClients.length}`)
console.log(uniqueClients.join(', '))

// Save for import
const outputPath = path.join(BILL_DIR, 'processed-bills.json')
fs.writeFileSync(outputPath, JSON.stringify(allRecords, null, 2))
console.log(`\nSaved to: ${outputPath}`)

// Create import-ready format for Supabase
const supabaseImport = {
  vehicles: uniqueVehicles.map(v => ({
    vehicle_number: v,
    vehicle_type: 'Truck',
    capacity_tons: 20,
    is_active: true
  })),
  clients: uniqueClients.map(c => ({
    client_code: c,
    client_name: `Client ${c}`,
    is_active: true
  })),
  trips: allRecords
}

const supabaseImportPath = path.join(BILL_DIR, 'supabase-import.json')
fs.writeFileSync(supabaseImportPath, JSON.stringify(supabaseImport, null, 2))
console.log(`Supabase import data saved to: ${supabaseImportPath}`)
