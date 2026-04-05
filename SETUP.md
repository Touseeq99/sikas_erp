# SIKAS ERP - Complete Setup Guide

## 📁 Project Structure

```
Sikas_Logistics/
├── app/                      # Next.js App (React frontend)
│   ├── components/           # UI components
│   ├── lib/                  # Supabase client
│   ├── types/                # TypeScript types
│   ├── hooks/                # Custom React hooks
│   ├── master-data/          # Vehicles, Drivers, Clients, etc.
│   ├── orders/               # Order management
│   ├── fleet/                # Fleet management
│   ├── hr/                   # HR & Attendance
│   ├── finance/              # Trips, Expenses, Invoices
│   └── crm/                  # CRM
├── scripts/                  # Import scripts
│   ├── auto-import.js        # Main import script
│   ├── process-bills.js      # Process Excel files
│   └── analyze-files.js     # Debug Excel files
├── supabase/
│   └── schema.sql           # Database schema
└── package.json
```

---

## 🚀 How to Run

### Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** in Supabase Dashboard
3. Copy and paste the contents of `supabase/schema.sql`
4. Click **Run** to execute

### Step 2: Configure Environment

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Start the App

```bash
npm run dev
```

Open http://localhost:3000

---

## 📥 How to Import Your Excel Bills

### Option 1: Web Interface (Easiest)

1. Open the app at http://localhost:3000
2. Go to **Master Data → Import**
3. Upload each Excel file:
   - `SIKAS BILL 08-14 AUG.xlsx`
   - `SIKAS BILL 15-21 SEP.xlsx`
   - `SIKAS BILL 1-7 SEP.xlsx`
   - `SIKAS BILL 22-31 SEP.xlsx`

### Option 2: Auto-Import Script

The script will automatically:
- Add all unique clients (29 client codes)
- Add all unique vehicles (103 vehicles)
- Add all trip records (181 trips)

**Step 1:** Edit the script with your credentials:

```bash
# Edit scripts/auto-import.js
# Change these values:
const CONFIG = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_KEY: 'your-service-role-key',
  BILL_DIR: 'C:\\Users\\pc\\Desktop\\Sikas_Logistics'
}
```

**Step 2:** Run the script:

```bash
node scripts/auto-import.js
```

---

## 📊 How the Data Maps

### Excel Columns → Supabase Tables

| Excel Column | Supabase Table | Field |
|--------------|----------------|-------|
| Sr. No. | trips | - |
| Date | trips | trip_date |
| Vehicle # | vehicles → trips | vehicle_id (linked) |
| Code | clients → trips | client_id (linked) |
| Order | trips | order_number |
| Address | trips | destination |
| Total Weight | trips | weight_tons |
| Rate per Ton | trips | rate_per_ton |
| Amount | trips | revenue, profit |

### Excel Bill Structure
- **Sheet1**: Billing details (rows 6+ contain data)
- **Columns**: Sr.No, Date, Vehicle#, Client Code, Order#, Address, then 12 tile size columns, Total Boxes, Total Weight, Rate per Ton, Amount

---

## 🔄 How the Import Process Works

### 1. Process Excel Files
```
Bill Files → Read Rows → Extract Data → Create Records
```

### 2. Create Unique Entities
- **Clients**: Extract unique client codes, create if not exists
- **Vehicles**: Extract unique vehicle numbers, create if not exists

### 3. Link and Import Trips
```
Trips → Find Vehicle ID → Find Client ID → Insert Record
```

---

## 📈 Dashboard Features

- **Live Updates**: Real-time data using Supabase Realtime
- **KPI Cards**: Total trips, on-time delivery, fleet utilization, profit margin
- **Charts**: Weekly revenue, order status pie chart, profit trend
- **Quick Stats**: Active vehicles, drivers, total trips

---

## 🎨 UI Features

- Modern gradient design
- Animated metric cards
- Real-time "live data" indicator
- Responsive layout
- Dark sidebar with navigation

---

## ⚠️ Important Notes

1. **Client Codes**: Your Excel uses short codes (C-001, C-154, OR-002). These are mapped to your Supabase clients.

2. **Vehicle Numbers**: The script normalizes (removes spaces, uppercase) to match Supabase format.

3. **Date Format**: Excel dates are serial numbers - script converts automatically.

4. **Duplicate Handling**: Script skips existing records to avoid duplicates.

---

## 🆘 Troubleshooting

### "Invalid supabaseUrl"
- Check your `.env.local` has valid URL

### "Vehicle/Client not found"
- Run the full import to create them first

### "No records imported"
- Check Excel file path in CONFIG.BILL_DIR

### Script errors
- Make sure you have Node.js installed
- Run: `npm install`

---

## 📞 Need Help?

The app includes:
- Debug scripts in `scripts/` folder
- Template download in import page
- Detailed error messages

Run debug script to analyze your Excel files:
```bash
node scripts/analyze-files.js
node scripts/process-bills.js
```
