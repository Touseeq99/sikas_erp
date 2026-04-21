import * as xlsx from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wdngovblytieexjlvspa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbmdvdmJseXRpZWV4amx2c3BhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM4OTUyMCwiZXhwIjoyMDkwOTY1NTIwfQ.pRLV78HCuT6euy4qFulXEFwhDFQTctRdi-xpakqZxeU'
const supabase = createClient(supabaseUrl, supabaseKey)

const filePath = 'C:\\Users\\pc\\Desktop\\Sikas_Logistics\\Sikas Logistics ERP Data.finalized.xlsx'
const workbook = xlsx.readFile(filePath)

async function importData() {
  console.log('🚀 Starting Data Import...')

  // 1. Import Vehicles
  const vehiclesSheet = workbook.Sheets['Vehicles']
  if (vehiclesSheet) {
    const vehiclesData = xlsx.utils.sheet_to_json<any>(vehiclesSheet)
    for (const v of vehiclesData) {
      if (!v['Vehicle ID']) continue
      await supabase.from('vehicles').upsert({
        vehicle_id: v['Vehicle ID'],
        registration_no: v['Vehicle Number'] || '',
        is_outsourced: false // Defaulting to in-house, user will edit in UI
      }, { onConflict: 'vehicle_id' })
    }
    console.log(`✅ Vehicles Imported: ${vehiclesData.length}`)
  }

  // 2. Import Departments & Employees
  const deptSheet = workbook.Sheets['Departments']
  if (deptSheet) {
    const deptData = xlsx.utils.sheet_to_json<any>(deptSheet)
    for (const d of deptData) {
      if (!d['Department Name']) continue
      await supabase.from('departments').upsert({
        department_id: 'D-' + d['Department Name'].substring(0,3).toUpperCase(),
        name: d['Department Name'],
        manager_id: d['HOD'] || ''
      }, { onConflict: 'department_id' })
    }
    console.log(`✅ Departments Imported: ${deptData.length}`)
  }

  const empSheet = workbook.Sheets['Employees']
  if (empSheet) {
    const empData = xlsx.utils.sheet_to_json<any>(empSheet)
    for (const e of empData) {
      if (!e['Employee ID']) continue
      await supabase.from('employees').upsert({
        employee_id: e['Employee ID'],
        name: e['Name'] || '',
      }, { onConflict: 'employee_id' })
    }
    console.log(`✅ Employees Imported: ${empData.length}`)
  }

  // 3. Tile Types
  const tileSheet = workbook.Sheets['Tile Type']
  if (tileSheet) {
    const tileData = xlsx.utils.sheet_to_json<any>(tileSheet)
    for (const t of tileData) {
      if (!t['Specification']) continue
      await supabase.from('tile_types').upsert({
         tile_name: t['Specification'],
         size_inches: t['Dimension'] || ''
      }) // no unique constraint on tile_name strictly defined matching this, but inserted safely
    }
    console.log(`✅ Tile Types Imported: ${tileData.length}`)
  }

  // 4. Operations (Orders & Trips & Revenue & Clients)
  const opsSheet = workbook.Sheets['Operations']
  if (opsSheet) {
    const opsData = xlsx.utils.sheet_to_json<any>(opsSheet)
    let opsCount = 0
    for (let i = 0; i < opsData.length; i++) {
      const op = opsData[i]
      if (!op['Client ID']) continue
      
      const clientId = op['Client ID']
      const location = op['Location'] || ''
      const weight = parseFloat(op['Weight ']) || 0
      const rpt = parseFloat(op['( RPT ) ']) || 0
      const totalRev = parseFloat(op['Revenue']) || (weight * rpt)
      
      // Auto-create client node 
      await supabase.from('clients').upsert({
        client_id: clientId,
        client_name: 'Client ' + clientId,
        address: location
      }, { onConflict: 'client_id' })
      
      // Create Order
      const orderId = `O-${1000 + i}`
      const { data: ord } = await supabase.from('orders').upsert({
        order_id: orderId,
        client_id: clientId,
        location: location,
        total_weight_tons: weight
      }, { onConflict: 'order_id' }).select().single()

      if (ord) {
        // Create Revenue Record
        await supabase.from('revenue').upsert({
          revenue_id: `R-${1000 + i}`,
          order_id: orderId,
          amount: totalRev,
          weight_tons: weight,
          rate_per_ton: rpt,
          payment_status: 'paid'
        }, { onConflict: 'revenue_id' })
        
        opsCount++
      }
    }
    console.log(`✅ Operations (Orders/Revenues) Imported: ${opsCount}`)
  }

  console.log('🎉 Data Import Complete!')
}

importData().catch(console.error)
