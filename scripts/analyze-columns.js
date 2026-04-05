const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const BILL_DIR = 'C:\\Users\\pc\\Desktop\\Sikas_Logistics'

function analyzeFullColumns(filePath) {
  const workbook = XLSX.readFile(filePath)
  const sheet1 = workbook.Sheets['Sheet1']
  
  console.log(`\n=== ${path.basename(filePath)} ===`)
  
  const range = XLSX.utils.decode_range(sheet1['!ref'])
  const totalCols = range.e.c + 1
  
  console.log(`Total Columns: ${totalCols}`)
  
  // Print header rows (0-5) for all columns
  console.log('\nHeader structure:')
  for (let r = 0; r < 6; r++) {
    const rowData = []
    for (let c = 0; c < Math.min(totalCols, 25); c++) {
      const cell = sheet1[XLSX.utils.encode_cell({r, c})]
      const val = cell ? (cell.v || '').toString().substring(0, 12) : ''
      rowData.push(val)
    }
    console.log(`Row ${r}: ${rowData.join(' | ')}`)
  }
  
  // Sample data row
  console.log('\nData row sample (row 6):')
  const dataRow = []
  for (let c = 0; c < Math.min(totalCols, 25); c++) {
    const cell = sheet1[XLSX.utils.encode_cell({r: 6, c})]
    const val = cell ? (cell.v || '').toString().substring(0, 12) : ''
    dataRow.push(val)
  }
  console.log(dataRow.join(' | '))
}

const files = [
  'SIKAS BILL 08-14 AUG.xlsx',
]

for (const file of files) {
  const filePath = path.join(BILL_DIR, file)
  if (fs.existsSync(filePath)) {
    analyzeFullColumns(filePath)
  }
}
