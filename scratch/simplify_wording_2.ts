import fs from 'fs'
import path from 'path'

const appDir = 'c:\\Users\\pc\\Desktop\\Sikas_Logistics\\app'

const wordingReplacements: Record<string, string> = {
  'Financial Sovereign': 'Revenue Dashboard',
  'Central Intelligence Terminal :: Absolute Manifest': 'Revenue Overview',
  'Provision Entry': 'Add Revenue',
  'Total Managed Inflow': 'Total Revenue',
  'Total Managed Burn (Trip Expenses)': 'Total Expenses',
  'Net Economic Yield': 'Net Profit',
  'Operational Payload (Order/Client)': 'Order / Client',
  'Net Performance': 'Net Profit',
  'Recalibrate Manifest': 'Edit Revenue',
  'Provision Sovereign Entry': 'Add Revenue',
  'Commit Manifest Segment': 'Save Revenue',
  'Live Calculation': 'Calculated',
  'Operational Burn (Expenses)': 'Expenses',
  'Gross Inflow (Invoiced)': 'Amount',
  'Collection State Logic': 'Payment Status',
  'Entry Identifier': 'Revenue ID',
  'Operational Order': 'Order ID',
  'Timestamp': 'Date'
}

function processDirectory(dir: string) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath)
    } else if (fullPath.endsWith('page.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8')
      let changed = false

      for (const [oldWord, newWord] of Object.entries(wordingReplacements)) {
        if (content.includes(oldWord)) {
          const regex = new RegExp(oldWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          content = content.replace(regex, newWord)
          changed = true
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content)
        console.log(`Simplified wording in: ${fullPath}`)
      }
    }
  }
}

processDirectory(appDir)
