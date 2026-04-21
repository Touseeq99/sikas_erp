import * as xlsx from 'xlsx'
import fs from 'fs'

const filePath = 'C:\\Users\\pc\\Desktop\\Sikas_Logistics\\Sikas Logistics ERP Data.finalized.xlsx'
const workbook = xlsx.readFile(filePath)

const schema: Record<string, string[]> = {}

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName]
  const data = xlsx.utils.sheet_to_json(sheet)
  if (data.length > 0) {
     schema[sheetName] = Object.keys(data[0] as object)
  }
}

fs.writeFileSync('C:\\Users\\pc\\Desktop\\Sikas_Logistics\\scratch\\excel_schema.json', JSON.stringify(schema, null, 2))
console.log('Schema dumped to scratch/excel_schema.json')
