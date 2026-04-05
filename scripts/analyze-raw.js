const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const BILL_DIR = 'C:\\Users\\pc\\Desktop\\Sikas_Logistics'

function analyzeRawSheet(filePath) {
  const workbook = XLSX.readFile(filePath)
  const sheet1 = workbook.Sheets['Sheet1']
  
  console.log(`\n=== ${path.basename(filePath)} ===`)
  
  const range = XLSX.utils.decode_range(sheet1['!ref'])
  console.log(`Range: ${sheet1['!ref']}`)
  console.log(`Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`)
  
  console.log('\nFirst 15 rows (first 10 columns):')
  for (let r = 0; r < Math.min(15, range.e.r + 1); r++) {
    const rowData = []
    for (let c = 0; c < Math.min(10, range.e.c + 1); c++) {
      const cell = sheet1[XLSX.utils.encode_cell({r, c})]
      const val = cell ? (cell.v || '').toString().substring(0, 15) : ''
      rowData.push(val)
    }
    console.log(`Row ${r}: ${rowData.join(' | ')}`)
  }
}

const files = [
  'SIKAS BILL 08-14 AUG.xlsx',
  'SIKAS BILL 15-21 SEP.xlsx', 
  'SIKAS BILL 1-7 SEP.xlsx',
  'SIKAS BILL 22-31 SEP.xlsx'
]

for (const file of files) {
  const filePath = path.join(BILL_DIR, file)
  if (fs.existsSync(filePath)) {
    analyzeRawSheet(filePath)
  }
}
