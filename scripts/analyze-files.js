const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const BILL_DIR = 'C:\\Users\\pc\\Desktop\\Sikas_Logistics'

const BILL_FILES = [
  'SIKAS BILL 08-14 AUG.xlsx',
  'SIKAS BILL 15-21 SEP.xlsx', 
  'SIKAS BILL 1-7 SEP.xlsx',
  'SIKAS BILL 22-31 SEP.xlsx'
]

function formatDate(dateVal) {
  if (!dateVal) return '2026-01-01'
  if (typeof dateVal === 'string') return dateVal.substring(0, 10)
  if (typeof dateVal === 'number') {
    const date = new Date((dateVal - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  return String(dateVal)
}

function getColumnValue(row, ...possibleNames) {
  for (const name of possibleNames) {
    if (row[name] !== undefined) return row[name]
  }
  return null
}

function analyzeFile(filePath) {
  const workbook = XLSX.readFile(filePath)
  console.log(`\n=== ${path.basename(filePath)} ===`)
  console.log('Sheets:', workbook.SheetNames)
  
  const sheet1 = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet1)
  console.log('Rows:', data.length)
  
  if (data.length > 0) {
    console.log('\nColumn names:')
    console.log(Object.keys(data[0]))
    console.log('\nSample row:')
    console.log(JSON.stringify(data[0], null, 2))
  }
}

for (const file of BILL_FILES) {
  const filePath = path.join(BILL_DIR, file)
  if (fs.existsSync(filePath)) {
    analyzeFile(filePath)
  } else {
    console.log(`File not found: ${file}`)
  }
}
