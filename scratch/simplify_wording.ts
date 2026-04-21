import fs from 'fs'
import path from 'path'

const appDir = 'c:\\Users\\pc\\Desktop\\Sikas_Logistics\\app'

const wordingReplacements: Record<string, string> = {
  'Client Nodes': 'Clients',
  'Live Economic Synchronization Active': 'Manage Clients',
  'Total Registered Nodes': 'Total Clients',
  'Dynamic Global Yield': 'Total Profit',
  'Outstanding Receivables': 'Pending Payments',
  'Node Identifier': 'Client ID',
  'Operational Logic': 'Orders',
  'Asset Density': 'Vehicles',
  'Live Net Yield': 'Profit',
  '+ Provision Node ID': '+ Add Client',
  '+ Provision Node': '+ Add Client',
  'Identify node': 'Edit Client',
  'Provision Node': 'Add Client',
  'Network origin Identifier': 'Client Details',
  'Execute Registration': 'Save',
  'Global Transmissions': 'Orders',
  'Network node updated.': 'Client saved.',
  
  // Vehicles
  'Asset Nodes': 'Vehicles',
  'Global Fleet Registration Active': 'Manage Vehicles',
  '+ Provision Asset': '+ Add Vehicle',
  'Registered Assets': 'Total Vehicles',
  'Active Field Deployment': 'Available Vehicles',
  'Maintenance Queue': 'In Maintenance',
  'Asset Identifier': 'Vehicle ID',
  'Mechanical Spec': 'Type',
  'Payload Capacity': 'Capacity',
  'Status': 'Status',
  'Provision Asset': 'Add Vehicle',
  'Identify Asset': 'Edit Vehicle',
  'Hardware profile ID': 'Vehicle Details',
  'Execute Provisioning': 'Save',
  'Asset instance updated.': 'Vehicle saved.',

  // Drivers
  'Human Resources': 'Drivers',
  'Live Operator Tracking Active': 'Manage Drivers',
  '+ Provision Operator': '+ Add Driver',
  'Registered Operators': 'Total Drivers',
  'Active Clearance': 'Active Drivers',
  'Pending Disciplinary': 'Inactive Drivers',
  'Operator Identifier': 'Driver ID',
  'Operator Name': 'Name',
  'Clearance Code': 'License No',
  'Contact Node': 'Contact',
  'Provision Operator': 'Add Driver',
  'Identify Operator': 'Edit Driver',
  'Operator profile ID': 'Driver Details',

  // Orders
  'Operational Transmissions': 'Orders',
  'Live Order Pipeline Active': 'Manage Orders',
  '+ Initialize Transmission': '+ Add Order',
  'Total Transmissions': 'Total Orders',
  'Pending Execution': 'Pending Orders',
  'Completed Transmissions': 'Delivered Orders',
  'Transmission ID': 'Order ID',
  'Target Node': 'Client',
  'Transport Asset': 'Vehicle',
  'Operator': 'Driver',
  'Timeline': 'Date',
  'Initialize Transmission': 'Add Order',
  'Modify Transmission': 'Edit Order',
  'Transmission logic mapping': 'Order Details',
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

      // Apply wording replacements
      for (const [oldWord, newWord] of Object.entries(wordingReplacements)) {
        if (content.includes(oldWord)) {
          // simple string replacement globally
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
