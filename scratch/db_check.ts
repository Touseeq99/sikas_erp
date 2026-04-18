import { supabase } from '../app/lib/supabase'

async function checkDatabase() {
  const tables = ['clients', 'orders', 'vehicles', 'drivers', 'employees', 'attendance', 'fuel', 'revenue', 'invoices', 'departments']
  
  console.log('--- Database Check ---')
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`❌ Table [${table}]: ERROR - ${error.message}`)
    } else {
      console.log(`✅ Table [${table}]: OK (Found ${data.length} test record)`)
    }
  }
}

checkDatabase()
