-- SIKAS ERP - ALTER TABLE Migration Script
-- Run this to update existing tables to match ERP_Prototype.xlsx schema
-- Last Updated: 2026-04-05

-- =====================================================
-- ENUMS (create if not exist)
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
        CREATE TYPE delivery_status AS ENUM ('pending', 'dispatched', 'delivered', 'cancelled');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('draft', 'generated', 'sent', 'paid', 'overdue');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_status') THEN
        CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
        CREATE TYPE vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'out_of_service');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'leave', 'late');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category') THEN
        CREATE TYPE expense_category AS ENUM ('fuel', 'maintenance', 'salaries', 'toll', 'parking', 'other');
    END IF;
END $$;

-- =====================================================
-- ALTER TABLES - MASTER DATA
-- =====================================================

-- Vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50) UNIQUE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS type VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_no VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS capacity VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status vehicle_status DEFAULT 'available';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS make VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year_of_manufacture INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_capacity DECIMAL(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS average_km_per_liter DECIMAL(6,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fitness_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Drivers
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_id VARCHAR(50) UNIQUE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_no VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS contact_info VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cnic VARCHAR(20);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(50);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_expiry DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2) DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS overtime_rate DECIMAL(10,2) DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_id VARCHAR(50) UNIQUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_name VARCHAR(255) NOT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_info VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS department_id VARCHAR(50) UNIQUE;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS manager_id VARCHAR(255);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contact VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Tile Types
ALTER TABLE tile_types ADD COLUMN IF NOT EXISTS tile_name VARCHAR(100);
ALTER TABLE tile_types ADD COLUMN IF NOT EXISTS size_inches VARCHAR(50);
ALTER TABLE tile_types ADD COLUMN IF NOT EXISTS pieces_per_box INTEGER DEFAULT 0;
ALTER TABLE tile_types ADD COLUMN IF NOT EXISTS weight_per_box_kg DECIMAL(8,2) DEFAULT 0;
ALTER TABLE tile_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =====================================================
-- ALTER TABLES - ORDERS
-- =====================================================

-- Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_id VARCHAR(50) UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_id VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status delivery_status DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tile_quantities JSONB DEFAULT '{}';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_boxes INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_weight_tons DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatch_date TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_completed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Deliveries
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_id VARCHAR(50) UNIQUE;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS order_id VARCHAR(50);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending';

-- Dispatch Challans
ALTER TABLE dispatch_challans ADD COLUMN IF NOT EXISTS challan_number VARCHAR(50) UNIQUE;
ALTER TABLE dispatch_challans ADD COLUMN IF NOT EXISTS vehicle_start_km INTEGER;
ALTER TABLE dispatch_challans ADD COLUMN IF NOT EXISTS vehicle_end_km INTEGER;
ALTER TABLE dispatch_challans ADD COLUMN IF NOT EXISTS total_boxes INTEGER DEFAULT 0;
ALTER TABLE dispatch_challans ADD COLUMN IF NOT EXISTS total_weight_tons DECIMAL(10,2) DEFAULT 0;
ALTER TABLE dispatch_challans ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- =====================================================
-- ALTER TABLES - FLEET
-- =====================================================

-- Vehicle Usage Logs
ALTER TABLE vehicle_usage_logs ADD COLUMN IF NOT EXISTS usage_id VARCHAR(50) UNIQUE;
ALTER TABLE vehicle_usage_logs ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50);
ALTER TABLE vehicle_usage_logs ADD COLUMN IF NOT EXISTS date DATE NOT NULL;
ALTER TABLE vehicle_usage_logs ADD COLUMN IF NOT EXISTS distance_travelled INTEGER DEFAULT 0;
ALTER TABLE vehicle_usage_logs ADD COLUMN IF NOT EXISTS trip_fuel VARCHAR(50);
ALTER TABLE vehicle_usage_logs ADD COLUMN IF NOT EXISTS driver_id VARCHAR(50);
ALTER TABLE vehicle_usage_logs ADD COLUMN IF NOT EXISTS purpose VARCHAR(255);

-- Maintenance Records
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS maintenance_id VARCHAR(50) UNIQUE;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS maintenance_date DATE NOT NULL;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS maintenance_type VARCHAR(100);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS service_provider VARCHAR(255);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled';

-- Fuel Tracking
ALTER TABLE fuel_tracking ADD COLUMN IF NOT EXISTS fuel_id VARCHAR(50) UNIQUE;
ALTER TABLE fuel_tracking ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50);
ALTER TABLE fuel_tracking ADD COLUMN IF NOT EXISTS fill_date DATE NOT NULL;
ALTER TABLE fuel_tracking ADD COLUMN IF NOT EXISTS fuel_liters DECIMAL(10,2);
ALTER TABLE fuel_tracking ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2);
ALTER TABLE fuel_tracking ADD COLUMN IF NOT EXISTS odometer_reading INTEGER;
ALTER TABLE fuel_tracking ADD COLUMN IF NOT EXISTS fuel_station VARCHAR(255);
ALTER TABLE fuel_tracking ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100);

-- =====================================================
-- ALTER TABLES - HR
-- =====================================================

-- Attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS attendance_id VARCHAR(50) UNIQUE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS driver_id VARCHAR(50);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS attendance_date DATE NOT NULL;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status attendance_status DEFAULT 'present';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(6,2) DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS notes TEXT;

-- Salaries
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS salary_id VARCHAR(50) UNIQUE;
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS month VARCHAR(20) NOT NULL;
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS payment_date DATE;

-- =====================================================
-- ALTER TABLES - FINANCE
-- =====================================================

-- Revenue
ALTER TABLE revenue ADD COLUMN IF NOT EXISTS revenue_id VARCHAR(50) UNIQUE;
ALTER TABLE revenue ADD COLUMN IF NOT EXISTS order_id VARCHAR(50);
ALTER TABLE revenue ADD COLUMN IF NOT EXISTS revenue_date DATE;
ALTER TABLE revenue ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE revenue ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';

-- Expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_id VARCHAR(50) UNIQUE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date DATE NOT NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category expense_category;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) NOT NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100);

-- Payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_id VARCHAR(50) UNIQUE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_id VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';

-- Profit Per Trip
ALTER TABLE profit_per_trip ADD COLUMN IF NOT EXISTS trip_id VARCHAR(50) UNIQUE;
ALTER TABLE profit_per_trip ADD COLUMN IF NOT EXISTS order_id VARCHAR(50);
ALTER TABLE profit_per_trip ADD COLUMN IF NOT EXISTS revenue DECIMAL(12,2) DEFAULT 0;
ALTER TABLE profit_per_trip ADD COLUMN IF NOT EXISTS expenses DECIMAL(12,2) DEFAULT 0;
ALTER TABLE profit_per_trip ADD COLUMN IF NOT EXISTS profit DECIMAL(12,2) DEFAULT 0;

-- Trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_date DATE NOT NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS origin VARCHAR(255);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination VARCHAR(255);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS distance_km INTEGER DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS weight_tons DECIMAL(10,2) DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS rate_per_ton DECIMAL(10,2) DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS revenue DECIMAL(12,2) DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS fuel_expense DECIMAL(10,2) DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_expense DECIMAL(10,2) DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS other_expenses DECIMAL(10,2) DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS total_expenses DECIMAL(10,2) DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS profit DECIMAL(10,2) DEFAULT 0;

-- Invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_id VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date DATE NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS week_start_date DATE NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS week_end_date DATE NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_weight_tons DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS grand_total DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status invoice_status DEFAULT 'draft';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;

-- Invoice Items
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS trip_id UUID;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS order_number VARCHAR(50);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tile_quantities JSONB DEFAULT '{}';
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS total_boxes INTEGER DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS total_weight_tons DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS rate_per_ton DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2) DEFAULT 0;

-- =====================================================
-- ALTER TABLES - INVENTORY
-- =====================================================

-- Inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS item_id VARCHAR(50) UNIQUE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS item_name VARCHAR(255) NOT NULL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS total_value DECIMAL(12,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_id VARCHAR(50) UNIQUE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255) NOT NULL;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_info VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =====================================================
-- ALTER TABLES - CRM
-- =====================================================

-- Contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_id VARCHAR(50) UNIQUE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255) NOT NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Complaints
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complaint_number VARCHAR(50) UNIQUE;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complaint_type VARCHAR(100);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS description TEXT NOT NULL;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS status complaint_status DEFAULT 'open';
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- =====================================================
-- ALTER TABLES - KPIs
-- =====================================================

-- KPIs
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS kpi_id VARCHAR(50) UNIQUE;
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS metric VARCHAR(255) NOT NULL;
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS target DECIMAL(10,2);
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS actual DECIMAL(10,2);
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS variance DECIMAL(10,2);
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- SEED DATA (if tables are empty)
-- =====================================================

-- Seed Vehicles (only if not exists)
INSERT INTO vehicles (vehicle_id, type, registration_no, capacity, status) VALUES
('V01', 'Truck', 'RWP-123', '10 tons', 'available'),
('V02', 'Van', 'ISB-456', '2 tons', 'available'),
('V03', 'Trailer', 'LHR-789', '20 tons', 'maintenance'),
('V04', 'Truck', 'KHI-321', '15 tons', 'available'),
('V05', 'Van', 'FSD-654', '3 tons', 'available'),
('V06', 'Trailer', 'MUL-987', '25 tons', 'available'),
('V07', 'Truck', 'PWR-111', '12 tons', 'available'),
('V08', 'Van', 'SWL-222', '2 tons', 'available'),
('V09', 'Trailer', 'HYD-333', '18 tons', 'maintenance'),
('V10', 'Truck', 'GJR-444', '14 tons', 'available')
ON CONFLICT (vehicle_id) DO NOTHING;

-- Seed Drivers
INSERT INTO drivers (driver_id, name, license_no, contact_info) VALUES
('DR01', 'Imran Ali', 'LIC-12345', '2223552'),
('DR02', 'Kamran Shah', 'LIC-67890', '5556918'),
('DR03', 'Asif Mehmood', 'LIC-54321', '1112462'),
('DR04', 'Javed Iqbal', 'LIC-98765', '4445819'),
('DR05', 'Rashid Khan', 'LIC-24680', '7779107'),
('DR06', 'Sohail Akbar', 'LIC-13579', '2223585'),
('DR07', 'Waqar Ahmed', 'LIC-11223', '5556906'),
('DR08', 'Noman Tariq', 'LIC-44556', '8890153'),
('DR09', 'Adnan Raza', 'LIC-77889', '9991330'),
('DR10', 'Salman Ali', 'LIC-99001', '1112474')
ON CONFLICT (driver_id) DO NOTHING;

-- Seed Clients
INSERT INTO clients (client_id, client_name, contact_info, address) VALUES
('C01', 'PakFuel Ltd.', '9876751', 'Lahore, Pakistan'),
('C02', 'AutoMart Co.', '1234808', 'Karachi, Pakistan'),
('C03', 'Logistics Hub', '5556906', 'Islamabad'),
('C04', 'Mega Tyres', '1112486', 'Rawalpindi'),
('C05', 'OfficeMart', '4445774', 'Faisalabad'),
('C06', 'SupplyChain PK', '7779140', 'Multan'),
('C07', 'Cargo Express', '2223573', 'Peshawar'),
('C08', 'FastTrack Ltd.', '5556930', 'Sialkot'),
('C09', 'Allied Traders', '8890108', 'Hyderabad'),
('C10', 'Zenith Logistics', '9991363', 'Gujranwala')
ON CONFLICT (client_id) DO NOTHING;

-- Seed Departments
INSERT INTO departments (department_id, name, manager_id) VALUES
('D01', 'Operations', 'Ali Khan'),
('D02', 'Finance', 'Sara Ahmed'),
('D03', 'HR', 'Nadia Malik'),
('D04', 'Maintenance', 'Hamza Ali'),
('D05', 'Logistics', 'Bilal Raza'),
('D06', 'IT', 'Ayesha Noor'),
('D07', 'Procurement', 'Usman Tariq'),
('D08', 'Sales', 'Fatima Zahra'),
('D09', 'Marketing', 'Imran Shah'),
('D10', 'Admin', 'Mahnoor Iqbal')
ON CONFLICT (department_id) DO NOTHING;

-- Seed Orders
INSERT INTO orders (order_id, client_id, order_date, driver_id, vehicle_id, status) VALUES
('O501', 'C01', '2026-01-22', 'DR01', 'V01', 'delivered'),
('O502', 'C02', '2026-02-19', 'DR02', 'V02', 'pending'),
('O503', 'C03', '2026-03-22', 'DR03', 'V03', 'delivered'),
('O504', 'C04', '2026-04-21', 'DR04', 'V04', 'delivered'),
('O505', 'C05', '2026-05-22', 'DR05', 'V05', 'pending'),
('O506', 'C06', '2026-06-21', 'DR06', 'V06', 'delivered'),
('O507', 'C07', '2026-07-22', 'DR07', 'V07', 'delivered'),
('O508', 'C08', '2026-08-22', 'DR08', 'V08', 'pending'),
('O509', 'C09', '2026-09-21', 'DR09', 'V09', 'delivered'),
('O510', 'C10', '2026-10-22', 'DR10', 'V10', 'delivered')
ON CONFLICT (order_id) DO NOTHING;

-- Seed Fleet Usage
INSERT INTO vehicle_usage_logs (usage_id, vehicle_id, date, distance_travelled, trip_fuel) VALUES
('F701', 'V01', '2026-01-22', 250, '80 L'),
('F702', 'V02', '2026-02-19', 120, '40 L'),
('F703', 'V03', '2026-03-22', 300, '100 L'),
('F704', 'V04', '2026-04-21', 180, '60 L'),
('F705', 'V05', '2026-05-22', 150, '50 L'),
('F706', 'V06', '2026-06-21', 400, '130 L'),
('F707', 'V07', '2026-07-22', 220, '70 L'),
('F708', 'V08', '2026-08-22', 100, '35 L'),
('F709', 'V09', '2026-09-21', 280, '90 L'),
('F710', 'V10', '2026-10-22', 200, '65 L')
ON CONFLICT (usage_id) DO NOTHING;

-- Seed Maintenance
INSERT INTO maintenance_records (maintenance_id, vehicle_id, maintenance_date, cost, maintenance_type) VALUES
('M801', 'V01', '2026-01-01', 8000, 'Brake service'),
('M802', 'V03', '2026-01-22', 15000, 'Engine repair'),
('M803', 'V05', '2026-02-19', 5000, 'Oil change'),
('M804', 'V07', '2026-03-22', 12000, 'Tire replacement'),
('M805', 'V09', '2026-04-21', 7000, 'Suspension fix'),
('M806', 'V02', '2026-05-22', 6000, 'Battery check'),
('M807', 'V04', '2026-06-21', 9000, 'Gearbox repair'),
('M808', 'V06', '2026-07-22', 11000, 'Cooling system'),
('M809', 'V08', '2026-08-22', 4000, 'Minor service'),
('M810', 'V10', '2026-09-21', 10000, 'Brake pads')
ON CONFLICT (maintenance_id) DO NOTHING;

-- Seed Fuel Tracking
INSERT INTO fuel_tracking (fuel_id, vehicle_id, fill_date, fuel_liters, cost) VALUES
('FT901', 'V01', '2026-01-22', 80, 12000),
('FT902', 'V02', '2026-02-19', 40, 6000),
('FT903', 'V03', '2026-03-22', 100, 15000),
('FT904', 'V04', '2026-04-21', 60, 9000),
('FT905', 'V05', '2026-05-22', 50, 7500),
('FT906', 'V06', '2026-06-21', 130, 19500),
('FT907', 'V07', '2026-07-22', 70, 10500),
('FT908', 'V08', '2026-08-22', 35, 5250),
('FT909', 'V09', '2026-09-21', 90, 13500),
('FT910', 'V10', '2026-10-22', 65, 9750)
ON CONFLICT (fuel_id) DO NOTHING;

-- Seed Attendance
INSERT INTO attendance (attendance_id, driver_id, attendance_date, status) VALUES
('A1101', 'DR01', '2026-01-22', 'present'),
('A1102', 'DR02', '2026-01-22', 'absent'),
('A1103', 'DR03', '2026-01-22', 'present'),
('A1104', 'DR04', '2026-01-22', 'present'),
('A1105', 'DR05', '2026-01-22', 'absent'),
('A1106', 'DR06', '2026-01-22', 'present'),
('A1107', 'DR07', '2026-01-22', 'present'),
('A1108', 'DR08', '2026-01-22', 'absent'),
('A1109', 'DR09', '2026-01-22', 'present'),
('A1110', 'DR10', '2026-01-22', 'present')
ON CONFLICT (attendance_id) DO NOTHING;

-- Seed Salaries
INSERT INTO salaries (salary_id, employee_id, month, amount, status) VALUES
('S1201', 'DR01', 'Feb', 50000, 'paid'),
('S1202', 'DR02', 'Feb', 60000, 'pending'),
('S1203', 'DR03', 'Feb', 45000, 'paid'),
('S1204', 'DR04', 'Feb', 55000, 'paid'),
('S1205', 'DR05', 'Feb', 50000, 'pending'),
('S1206', 'DR06', 'Feb', 65000, 'paid'),
('S1207', 'DR07', 'Feb', 48000, 'paid'),
('S1208', 'DR08', 'Feb', 52000, 'pending'),
('S1209', 'DR09', 'Feb', 50000, 'paid'),
('S1210', 'DR10', 'Feb', 60000, 'paid')
ON CONFLICT (salary_id) DO NOTHING;

-- Seed Revenue
INSERT INTO revenue (revenue_id, order_id, revenue_date, amount, payment_status) VALUES
('R1301', 'O501', '2026-01-22', 25000, 'paid'),
('R1302', 'O502', '2026-02-19', 40000, 'pending'),
('R1303', 'O503', '2026-03-22', 30000, 'paid'),
('R1304', 'O504', '2026-04-21', 35000, 'paid'),
('R1305', 'O505', '2026-05-22', 20000, 'pending'),
('R1306', 'O506', '2026-06-21', 45000, 'paid'),
('R1307', 'O507', '2026-07-22', 50000, 'paid'),
('R1308', 'O508', '2026-08-22', 28000, 'pending'),
('R1309', 'O509', '2026-09-21', 32000, 'paid'),
('R1310', 'O510', '2026-10-22', 36000, 'paid')
ON CONFLICT (revenue_id) DO NOTHING;

-- Seed Expenses
INSERT INTO expenses (expense_id, expense_date, category, amount, notes) VALUES
('E1401', '2026-01-01', 'fuel', 12000, 'Diesel refill'),
('E1402', '2026-01-22', 'maintenance', 8000, 'Brake service'),
('E1403', '2026-02-19', 'salaries', 50000, 'Payroll'),
('E1404', '2026-03-22', 'fuel', 15000, 'Petrol refill'),
('E1405', '2026-04-21', 'maintenance', 10000, 'Engine repair'),
('E1406', '2026-05-22', 'salaries', 60000, 'Payroll'),
('E1407', '2026-06-21', 'fuel', 13000, 'Diesel refill'),
('E1408', '2026-07-22', 'maintenance', 7000, 'Tire change'),
('E1409', '2026-08-22', 'salaries', 55000, 'Payroll'),
('E1410', '2026-09-21', 'fuel', 14000, 'Petrol refill')
ON CONFLICT (expense_id) DO NOTHING;

-- Seed Payments
INSERT INTO payments (payment_id, order_id, payment_date, amount, payment_method, payment_status) VALUES
('P1501', 'O501', '2026-01-22', 25000, 'Bank Transfer', 'paid'),
('P1502', 'O502', '2026-02-19', 40000, 'Cash', 'pending'),
('P1503', 'O503', '2026-03-22', 30000, 'Bank Transfer', 'paid'),
('P1504', 'O504', '2026-04-21', 35000, 'Cheque', 'paid'),
('P1505', 'O505', '2026-05-22', 20000, 'Cash', 'pending'),
('P1506', 'O506', '2026-06-21', 45000, 'Bank Transfer', 'paid'),
('P1507', 'O507', '2026-07-22', 50000, 'Cheque', 'paid'),
('P1508', 'O508', '2026-08-22', 28000, 'Cash', 'pending'),
('P1509', 'O509', '2026-09-21', 32000, 'Bank Transfer', 'paid'),
('P1510', 'O510', '2026-10-22', 36000, 'Cheque', 'paid')
ON CONFLICT (payment_id) DO NOTHING;

-- Seed Profit Per Trip
INSERT INTO profit_per_trip (trip_id, order_id, revenue, expenses, profit) VALUES
('PT1601', 'O501', 25000, 12000, 13000),
('PT1602', 'O502', 40000, 18000, 22000),
('PT1603', 'O503', 30000, 15000, 15000),
('PT1604', 'O504', 35000, 17000, 18000),
('PT1605', 'O505', 20000, 10000, 10000),
('PT1606', 'O506', 45000, 20000, 25000),
('PT1607', 'O507', 50000, 22000, 28000),
('PT1608', 'O508', 28000, 13000, 15000),
('PT1609', 'O509', 32000, 14000, 18000),
('PT1610', 'O510', 36000, 16000, 20000)
ON CONFLICT (trip_id) DO NOTHING;

-- Seed Invoices
INSERT INTO invoices (invoice_number, client_id, invoice_date, week_start_date, week_end_date, total_weight_tons, total_amount, tax_amount, grand_total, status, paid_amount) VALUES
('INV-001', 'C01', '2026-01-28', '2026-01-22', '2026-01-28', 50, 25000, 4500, 29500, 'paid', 29500),
('INV-002', 'C02', '2026-02-25', '2026-02-19', '2026-02-25', 30, 40000, 7200, 47200, 'pending', 0),
('INV-003', 'C03', '2026-03-28', '2026-03-22', '2026-03-28', 45, 30000, 5400, 35400, 'paid', 35400),
('INV-004', 'C04', '2026-04-28', '2026-04-21', '2026-04-28', 40, 35000, 6300, 41300, 'paid', 41300),
('INV-005', 'C05', '2026-05-28', '2026-05-22', '2026-05-28', 25, 20000, 3600, 23600, 'pending', 0),
('INV-006', 'C06', '2026-06-28', '2026-06-21', '2026-06-28', 60, 45000, 8100, 53100, 'paid', 53100),
('INV-007', 'C07', '2026-07-28', '2026-07-22', '2026-07-28', 55, 50000, 9000, 59000, 'paid', 59000),
('INV-008', 'C08', '2026-08-28', '2026-08-22', '2026-08-28', 20, 28000, 5040, 33040, 'pending', 0),
('INV-009', 'C09', '2026-09-28', '2026-09-21', '2026-09-28', 48, 32000, 5760, 37760, 'paid', 37760),
('INV-010', 'C10', '2026-10-28', '2026-10-22', '2026-10-28', 52, 36000, 6480, 42480, 'paid', 42480)
ON CONFLICT (invoice_number) DO NOTHING;

-- Seed Inventory
INSERT INTO inventory (item_id, item_name, category, quantity, unit_cost, total_value) VALUES
('I1701', 'Diesel', 'Fuel', 1000, 120, 120000),
('I1702', 'Brake Pads', 'Spare Parts', 50, 500, 25000),
('I1703', 'Engine Oil', 'Supplies', 200, 300, 60000),
('I1704', 'Packaging Boxes', 'Supplies', 500, 50, 25000),
('I1705', 'Tires', 'Spare Parts', 20, 4000, 80000),
('I1706', 'Lubricant', 'Supplies', 100, 250, 25000),
('I1707', 'Filters', 'Spare Parts', 75, 200, 15000),
('I1708', 'Coolant', 'Supplies', 60, 150, 9000),
('I1709', 'Batteries', 'Spare Parts', 40, 3500, 140000),
('I1710', 'Safety Helmets', 'Supplies', 30, 800, 24000)
ON CONFLICT (item_id) DO NOTHING;

-- Seed Suppliers
INSERT INTO suppliers (supplier_id, supplier_name, category, contact_info, address) VALUES
('SUP1801', 'PakFuel Ltd.', 'Fuel', '1112441', 'Lahore, Pakistan'),
('SUP1802', 'AutoParts Co.', 'Spare Parts', 'autoparts@sikas.com', 'Karachi, Pakistan'),
('SUP1803', 'Lubricants PK', 'Supplies', '9876784', 'Islamabad, Pakistan'),
('SUP1804', 'Mega Tyres', 'Spare Parts', 'megatyres@sikas.com', 'Rawalpindi, Pakistan'),
('SUP1805', 'OfficeMart', 'Misc', '5556906', 'Faisalabad, Pakistan'),
('SUP1806', 'Coolant Corp', 'Supplies', '2223597', 'Multan, Pakistan'),
('SUP1807', 'Battery House', 'Spare Parts', '3334663', 'Gujranwala, Pakistan'),
('SUP1808', 'SafetyGear PK', 'Supplies', '4445807', 'Sialkot, Pakistan'),
('SUP1809', 'Zenith Oils', 'Fuel', '5556906', 'Hyderabad, Pakistan'),
('SUP1810', 'Allied Parts', 'Spare Parts', '6668041', 'Peshawar, Pakistan')
ON CONFLICT (supplier_id) DO NOTHING;

-- Seed Contacts
INSERT INTO contacts (contact_id, contact_name, contact_type, phone, email, address) VALUES
('CT1901', 'Ahmed Raza', 'Client', '1112441', 'ahmed.raza@sikas.com', 'Lahore, Pakistan'),
('CT1902', 'PakFuel Ltd.', 'Supplier', '9876784', 'info@pakfuel.com', 'Karachi, Pakistan'),
('CT1903', 'Salman Ali', 'Client', '5556906', 'salman.ali@sikas.com', 'Islamabad, Pakistan'),
('CT1904', 'Mega Tyres', 'Supplier', '2223597', 'sales@megatyres.com', 'Rawalpindi, Pakistan'),
('CT1905', 'OfficeMart', 'Partner', '4445784', 'contact@officemart.pk', 'Faisalabad, Pakistan')
ON CONFLICT (contact_id) DO NOTHING;

-- Seed KPIs
INSERT INTO kpis (kpi_id, metric, target, actual, variance, notes) VALUES
('K2001', 'Revenue Growth (%)', 20, 18, -2, 'Slight dip'),
('K2002', 'On-Time Deliveries', 95, 92, -3, 'Traffic delays'),
('K2003', 'Fuel Efficiency', 8, 8.5, 0.5, 'Improved routes'),
('K2004', 'Client Retention %', 90, 88, -2, 'New competitors'),
('K2005', 'Avg Profit/Trip', 15000, 16000, 1000, 'Strong margins'),
('K2006', 'Vehicle Utilization', 85, 80, -5, 'Idle trucks'),
('K2007', 'Maintenance Costs', 100000, 95000, -5000, 'Controlled spend'),
('K2008', 'Attendance Rate %', 98, 96, -2, 'Absenteeism spike'),
('K2009', 'Payment Collection', 1, 0.94, -6, 'Pending invoices'),
('K2010', 'Inventory Accuracy', 97, 95, -2, 'Stock mismatch')
ON CONFLICT (kpi_id) DO NOTHING;

-- =====================================================
-- RLS POLICIES (if not exist)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'vehicles') THEN
        ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON vehicles FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'drivers') THEN
        ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON drivers FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'clients') THEN
        ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON clients FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'departments') THEN
        ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON departments FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'orders') THEN
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON orders FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'invoices') THEN
        ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON invoices FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'attendance') THEN
        ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON attendance FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'expenses') THEN
        ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON expenses FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'vehicle_usage_logs') THEN
        ALTER TABLE vehicle_usage_logs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON vehicle_usage_logs FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'maintenance_records') THEN
        ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON maintenance_records FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'fuel_tracking') THEN
        ALTER TABLE fuel_tracking ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON fuel_tracking FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'salaries') THEN
        ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON salaries FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'full_access' AND tablename = 'kpis') THEN
        ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "full_access" ON kpis FOR ALL USING (true);
    END IF;
END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
