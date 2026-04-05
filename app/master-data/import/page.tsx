'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

interface BillingRow {
  'Sr.No': number
  'Date': string
  'Vehicle#': string
  'Client Code': string
  'Order#': string
  'Delivery Address': string
  'Total Boxes': number
  'Total Weight (Tons)': number
  'Rate per Ton': number
  'Amount (PKR)': number
}

export default function ExcelImportPage() {
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<{success: number; errors: string[]} | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setResults(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<BillingRow>(worksheet)

      let successCount = 0
      const errors: string[] = []

      for (const row of jsonData) {
        try {
          const clientRes = await supabase.from('clients').select('id').eq('client_code', row['Client Code']).single()
          const vehicleRes = await supabase.from('vehicles').select('id').eq('vehicle_number', row['Vehicle#']).single()

          if (!clientRes.data || !vehicleRes.data) {
            errors.push(`Row ${row['Sr.No']}: Client or Vehicle not found`)
            continue
          }

          const tripPayload = {
            vehicle_id: vehicleRes.data.id,
            driver_id: null,
            trip_date: row['Date'],
            origin: '',
            destination: row['Delivery Address'],
            distance_km: 0,
            weight_tons: row['Total Weight (Tons)'],
            rate_per_ton: row['Rate per Ton'],
            revenue: row['Amount (PKR)'],
            fuel_expense: 0,
            driver_expense: 0,
            other_expenses: 0,
            total_expenses: 0,
            profit: row['Amount (PKR)'],
          }

          const { error } = await supabase.from('trips').insert(tripPayload)
          if (error) {
            errors.push(`Row ${row['Sr.No']}: ${error.message}`)
          } else {
            successCount++
          }
        } catch (err: any) {
          errors.push(`Row ${row['Sr.No']}: ${err.message}`)
        }
      }

      setResults({ success: successCount, errors })
    } catch (err: any) {
      setResults({ success: 0, errors: [err.message] })
    }

    setImporting(false)
  }

  const downloadTemplate = () => {
    const template = [
      {
        'Sr.No': 1,
        'Date': '2026-01-01',
        'Vehicle#': 'LK-1001',
        'Client Code': 'ORL001',
        'Order#': 'ORD-001',
        'Delivery Address': 'Lahore, Pakistan',
        'Total Boxes': 100,
        'Total Weight (Tons)': 20,
        'Rate per Ton': 2500,
        'Amount (PKR)': 50000,
      },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'billing_import_template.xlsx')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Excel Import</h1>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Import Historical Billing Data</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload an Excel file (.xlsx) with the following columns: Sr.No, Date, Vehicle#, Client Code, Order#, 
          Delivery Address, Total Boxes, Total Weight (Tons), Rate per Ton, Amount (PKR)
        </p>
        
        <div className="flex items-center space-x-4 mb-6">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="input w-64"
            disabled={importing}
          />
          <button onClick={downloadTemplate} className="btn btn-secondary">
            Download Template
          </button>
        </div>

        {importing && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <span>Importing...</span>
          </div>
        )}

        {results && (
          <div className={`mt-4 p-4 rounded-lg ${results.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
            <p className="font-medium">Import Complete</p>
            <p className="text-sm">Successfully imported: {results.success} records</p>
            {results.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium">Errors:</p>
                <ul className="text-sm text-red-600 mt-1">
                  {results.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {results.errors.length > 10 && (
                    <li>...and {results.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>Download the template to see the expected format</li>
          <li>Ensure Client Code matches existing clients in the system</li>
          <li>Ensure Vehicle# matches existing vehicles in the system</li>
          <li>Date format should be YYYY-MM-DD</li>
          <li>Upload the file and click Import</li>
          <li>The data will be created as trip records in the system</li>
        </ol>
      </div>
    </div>
  )
}
