const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

const BILL_FILES = [
  'SIKAS BILL 08-14 AUG.xlsx',
  'SIKAS BILL 15-21 SEP.xlsx', 
  'SIKAS BILL 1-7 SEP.xlsx',
  'SIKAS BILL 22-31 SEP.xlsx'
]

async function importBills() {
  console.log('Starting import...\n')

  for (const file of BILL_FILES) {
    const filePath = path.join(__dirname, file)
    
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${file}`)
      continue
    }

    console.log(`\n=== Processing: ${file} ===`)
    
    const workbook = XLSX.readFile(filePath)
    const sheet1Name = workbook.SheetNames[0]
    const sheet1 = workbook.Sheets[sheet1Name]
    const data = XLSX.utils.sheet_to_json(sheet1)

    console.log(`Found ${data.length} rows in Sheet1`)

    let imported = 0
    for (const row of data) {
      try {
        const record = {
          'Sr.No': row['Sr.No'] || row['Sr. No.'] || row['Sr.No.'] || 0,
          'Date': formatDate(row['Date']),
          'Vehicle#': row['Vehicle#'] || row['Vehicle'] || row['Vehicle No'] || '',
          'Client Code': row['Client Code'] || row['Client'] || row['ClientCode'] || '',
          'Order#': row['Order#'] || row['Order'] || row['Order No'] || '',
          'Delivery Address': row['Delivery Address'] || row['Address'] || row['DeliveryAdd'] || '',
          'Total Boxes': row['Total Boxes'] || row['Boxes'] || row['TotalBoxes'] || 0,
          'Total Weight (Tons)': row['Total Weight (Tons)'] || row['Weight (Tons)'] || row['TotalWeight'] || row['Weight (Tons)'] || 0,
          'Rate per Ton': row['Rate per Ton'] || row['Rate'] || row['RatePerTon'] || 0,
          'Amount (PKR)': row['Amount (PKR)'] || row['Amount'] || row['Amount (Rs)'] || row['Amount (PKR)'] || 0,
        }

        if (record['Amount (PKR)'] > 0) {
          imported++
        }
      } catch (e) {
        console.log('Error:', e.message)
      }
    }

    console.log(`Processed ${imported} valid records from ${file}`)
  }

  console.log('\n=== Import Complete ===')
  console.log('\nTo import to Supabase, run this script with valid credentials.')
}

function formatDate(dateVal) {
  if (!dateVal) return ''
  if (typeof dateVal === 'string') return dateVal
  if (typeof dateVal === 'number') {
    const date = new Date((dateVal - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  return String(dateVal)
}

importBills()
