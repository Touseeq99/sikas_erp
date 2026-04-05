# SIKAS ERP - Logistics Management System

A complete ERP system for SIKAS Logistics, a medium-sized 3PL company in Pakistan providing dedicated logistics to Oreal Ceramics (ceramic tile manufacturer).

## Features

- **Dashboard**: Live KPI metrics with Supabase Realtime subscriptions
- **Master Data**: Vehicles, Drivers, Clients, Tile Types, Rate Cards
- **Order Management**: Order entry, dispatch, delivery tracking
- **Fleet Management**: Usage logs, maintenance, fuel tracking
- **HR & Drivers**: Attendance, salary management
- **Finance**: Trips revenue, expenses, automated weekly invoicing
- **CRM**: Client contacts, complaint tracking
- **Excel Import**: Import historical billing data

## Tech Stack

- **Backend**: Supabase (PostgreSQL + RLS + Realtime)
- **Frontend**: Next.js 14 + React + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts

## Getting Started

### 1. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in Supabase Dashboard
3. Copy and execute the contents of `supabase/schema.sql`
4. Note your Supabase URL and anon key

### 2. Configure Environment

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Database Schema

The schema includes:

- **Master Data**: clients, vehicles, drivers, departments, tile_types, rate_cards
- **Orders**: orders, dispatch_challans
- **Fleet**: vehicle_usage_logs, maintenance_records, fuel_tracking
- **HR**: attendance, salaries
- **Finance**: trips, expenses, invoices, invoice_items
- **CRM**: client_contacts, complaints
- **System**: user_profiles, audit_logs

### Row Level Security

- **Admin**: Full access to all tables
- **Operations**: Access to orders, fleet, dispatch
- **Finance**: Access to billing, invoices, salaries

## Weekly Invoice Auto-Generation

The system automatically generates weekly invoices by:
1. Aggregating trip data by week
2. Calculating weight × rate per ton
3. Adding 18% sales tax
4. Creating invoice records with line items

## Excel Import

Import historical billing data (Bills #79, #80, #81) via:
- Navigate to Master Data → Import
- Upload Excel file with required columns
- Data is created as trip records

## Project Structure

```
app/
├── components/          # UI components (Sidebar, Header)
├── hooks/              # Custom hooks (useRealtime)
├── lib/                # Supabase client
├── types/              # TypeScript types
├── master-data/        # Vehicles, Drivers, Clients, Tile Types, Rate Cards
├── orders/             # Order management
├── fleet/              # Usage logs, Maintenance, Fuel
├── hr/                 # Attendance, Salaries
├── finance/            # Trips, Expenses, Invoices
└── crm/               # Contacts, Complaints
```

## License

MIT
