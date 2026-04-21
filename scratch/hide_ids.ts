import fs from 'fs'
import path from 'path'

const appDir = 'c:\\Users\\pc\\Desktop\\Sikas_Logistics\\app'

// List of exact formData properties that represent the auto-generated IDs
const idFields = [
  'order_id', 'driver_id', 'vehicle_id', 'tile_name', 'employee_id',
  'department_id', 'client_id', 'attendance_id', 'salary_id', 'usage_id',
  'trip_id', 'revenue_id', 'invoice_number', 'maintenance_id', 'expense_id',
  'fuel_id', 'contact_id'
]

function processDirectory(dir: string) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath)
    } else if (fullPath.endsWith('page.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8')
      let changed = false

      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes('<input') && line.includes('value={formData.')) {
          // Check if it's an ID field
          for (const field of idFields) {
            if (line.includes(`value={formData.${field}}`) || line.includes(`value={formData?.${field}}`)) {
              // It's the ID field! Let's modify it to be disabled and not required.
              let newLine = line.replace(/required(\s*="")?/, 'disabled')
              
              // change placeholder if it exists
              if (newLine.includes('placeholder=')) {
                 newLine = newLine.replace(/placeholder="[^"]+"/, 'placeholder="Auto-generated"')
              } else {
                 newLine = newLine.replace('<input ', '<input placeholder="Auto-generated" ')
              }
              
              if (newLine !== line) {
                lines[i] = newLine
                changed = true
              }
            }
          }
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, lines.join('\n'))
        console.log(`Updated ID input in: ${fullPath}`)
      }
    }
  }
}

processDirectory(appDir)
