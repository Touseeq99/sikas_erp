import * as xlsx from 'xlsx'

const filePath = 'C:\\Users\\pc\\Desktop\\Sikas_Logistics\\Sikas Logistics ERP Data.finalized.xlsx'
const workbook = xlsx.readFile(filePath)

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName]
  const data = xlsx.utils.sheet_to_json(sheet)
  console.log(`\n--- Sheet: ${sheetName} ---`)
  if (data.length > 0) {
    console.log(`Row count: ${data.length}`)
    console.log('Columns:', Object.keys(data[0] as object))
    console.log('First row:', data[0])
  } else {
    console.log('Empty sheet')
  }
}
