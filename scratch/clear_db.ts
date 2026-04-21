import { createClient } from '@supabase/supabase-js'

// Using credentials from .env.local
const supabaseUrl = 'https://wdngovblytieexjlvspa.supabase.co'
// This was found in .env.local and is actually a service_role key
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbmdvdmJseXRpZWV4amx2c3BhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM4OTUyMCwiZXhwIjoyMDkwOTY1NTIwfQ.pRLV78HCuT6euy4qFulXEFwhDFQTctRdi-xpakqZxeU'

const supabase = createClient(supabaseUrl, supabaseKey)

// Tables in order of dependencies (child tables first, no foreign-key violations)
const tables = [
    'audit_logs',
    'kpis',
    'contacts',
    'suppliers',
    'inventory',
    'invoice_items',
    'invoices',
    'trips',
    'profit_per_trip',
    'payments',
    'revenue',
    'deliveries',
    'complaints',
    'dispatch_challans',
    'expenses',
    'fuel_tracking',
    'maintenance_records',
    'vehicle_usage_logs',
    'attendance',
    'salaries',
    'employees',
    'departments',
    'rate_cards',
    'tile_types',
    'orders',
    'clients',
    'drivers',
    'vehicles',
    'user_profiles'
]

async function clearAllTables() {
    console.log('🚮 Starting to clear database tables...')
    
    for (const table of tables) {
        process.stdout.write(`  🧹 Clearing ${table}... `)
        // Delete all rows where id is not null (guaranteed to catch everything)
        const { error } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')
            
        if (error) {
            console.log(`❌ Error: ${error.message}`)
        } else {
            console.log('✅ Success')
        }
    }
    
    console.log('\n✨ Database cleanup complete!')
}

clearAllTables().catch(err => {
    console.error('💥 Fatal error during cleanup:', err)
})
