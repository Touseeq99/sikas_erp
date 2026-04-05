-- SIKAS ERP - Updated Supabase Database Schema
-- Based on ERP_Prototype.xlsx column structure
-- Last Updated: 2026-04-05

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE delivery_status AS ENUM ('pending', 'dispatched', 'delivered', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('draft', 'generated', 'sent', 'paid', 'overdue');
CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'out_of_service');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'leave', 'late');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE expense_category AS ENUM ('fuel', 'maintenance', 'salaries', 'toll', 'parking', 'other');

-- =====================================================
-- MASTER DATA TABLES (Matching ERP_Prototype Columns)
-- =====================================================

-- Vehicles table (ERP: VehicleID, Type, RegistrationNo, Capacity, Status)
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(100),
    registration_no VARCHAR(100),
    capacity VARCHAR(50),
    status vehicle_status DEFAULT 'available',
    make VARCHAR(100),
    model VARCHAR(100),
    year_of_manufacture INTEGER,
    fuel_capacity DECIMAL(10,2),
    average_km_per_liter DECIMAL(6,2),
    fitness_expiry DATE,
    insurance_expiry DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drivers table (ERP: DriverID, Name, LicenseNo, ContactInfo)
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    license_no VARCHAR(100),
    contact_info VARCHAR(100),
    cnic VARCHAR(20),
    phone VARCHAR(50),
    emergency_contact VARCHAR(50),
    license_expiry DATE,
    hire_date DATE,
    salary DECIMAL(10,2) DEFAULT 0,
    overtime_rate DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table (ERP: ClientID, Name, ContactInfo, Address)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    contact_info VARCHAR(100),
    address TEXT,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments table (ERP: DepartmentID, Name, ManagerID)
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    manager_id VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table (ERP: Employee ID, Name, Department ID, Role, Contact)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department_id VARCHAR(50) REFERENCES departments(department_id),
    role VARCHAR(100),
    contact VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tile Types table
CREATE TABLE tile_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tile_name VARCHAR(100) NOT NULL,
    size_inches VARCHAR(50),
    pieces_per_box INTEGER DEFAULT 0,
    weight_per_box_kg DECIMAL(8,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate Cards table
CREATE TABLE rate_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) REFERENCES clients(client_id),
    tile_type_id UUID REFERENCES tile_types(id),
    rate_per_ton DECIMAL(10,2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ORDER MANAGEMENT TABLES (Matching ERP_Prototype Columns)
-- =====================================================

-- Orders table (ERP: OrderID, ClientID, OrderDate, DriverID, VehicleID, Status2)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(50) UNIQUE NOT NULL,
    client_id VARCHAR(50) REFERENCES clients(client_id),
    order_date DATE,
    driver_id VARCHAR(50) REFERENCES drivers(driver_id),
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    status delivery_status DEFAULT 'pending',
    delivery_address TEXT,
    delivery_date DATE,
    tile_quantities JSONB DEFAULT '{}',
    total_boxes INTEGER DEFAULT 0,
    total_weight_tons DECIMAL(10,2) DEFAULT 0,
    dispatch_date TIMESTAMPTZ,
    delivery_completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliveries table (ERP: DeliveryID, OrderID, DeliveryDate, DeliveryStatus)
CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id VARCHAR(50) UNIQUE NOT NULL,
    order_id VARCHAR(50) REFERENCES orders(order_id),
    delivery_date DATE,
    delivery_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dispatch Challans
CREATE TABLE dispatch_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID REFERENCES orders(id),
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES drivers(id),
    dispatch_date TIMESTAMPTZ DEFAULT NOW(),
    delivery_date DATE,
    delivery_address TEXT,
    total_boxes INTEGER DEFAULT 0,
    total_weight_tons DECIMAL(10,2) DEFAULT 0,
    vehicle_start_km INTEGER,
    vehicle_end_km INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FLEET MANAGEMENT TABLES (Matching ERP_Prototype Columns)
-- =====================================================

-- Fleet Usage (ERP: UsageID, VehicleID, Date, DistanceTravelled, TripFuel)
CREATE TABLE vehicle_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usage_id VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    date DATE NOT NULL,
    distance_travelled INTEGER DEFAULT 0,
    trip_fuel VARCHAR(50),
    driver_id VARCHAR(50) REFERENCES drivers(driver_id),
    purpose VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance (ERP: Maintenance, VehicleID, Date, Cost, Type)
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_id VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    maintenance_date DATE NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,
    maintenance_type VARCHAR(100),
    description TEXT,
    service_provider VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fuel Tracking (ERP: FuelID, VehicleID, Date, FuelLiters, Cost)
CREATE TABLE fuel_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fuel_id VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    fill_date DATE NOT NULL,
    fuel_liters DECIMAL(10,2),
    cost DECIMAL(10,2),
    odometer_reading INTEGER,
    fuel_station VARCHAR(255),
    receipt_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- HR TABLES (Matching ERP_Prototype Columns)
-- =====================================================

-- Attendance (ERP: AttendanceID, DriversID, Date, Status)
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id VARCHAR(50) UNIQUE NOT NULL,
    driver_id VARCHAR(50) REFERENCES drivers(driver_id),
    attendance_date DATE NOT NULL,
    status attendance_status DEFAULT 'present',
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(driver_id, attendance_date)
);

-- Salaries (ERP: SalaryID, EmployeeID, Month, Amount, Status)
CREATE TABLE salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salary_id VARCHAR(50) UNIQUE NOT NULL,
    employee_id VARCHAR(50),
    month VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    payment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, month)
);

-- =====================================================
-- FINANCE TABLES (Matching ERP_Prototype Columns)
-- =====================================================

-- Revenue (ERP: RevenueID, OrderID, Date, Amount, PaymentStatus)
CREATE TABLE revenue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revenue_id VARCHAR(50) UNIQUE NOT NULL,
    order_id VARCHAR(50) REFERENCES orders(order_id),
    revenue_date DATE,
    amount DECIMAL(12,2) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses (ERP: ExpenseID, Date, Category, Amount, Notes)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id VARCHAR(50) UNIQUE NOT NULL,
    expense_date DATE NOT NULL,
    category expense_category,
    amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    receipt_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments (ERP: PaymentID, OrderID, Date, Amount, Method, Status)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id VARCHAR(50) UNIQUE NOT NULL,
    order_id VARCHAR(50) REFERENCES orders(order_id),
    payment_date DATE,
    amount DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profit Per Trip (ERP: TripID, OrderID, Revenue, Expenses, Profit)
CREATE TABLE profit_per_trip (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id VARCHAR(50) UNIQUE NOT NULL,
    order_id VARCHAR(50) REFERENCES orders(order_id),
    revenue DECIMAL(12,2) DEFAULT 0,
    expenses DECIMAL(12,2) DEFAULT 0,
    profit DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips (for detailed revenue tracking)
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES drivers(id),
    trip_date DATE NOT NULL,
    origin VARCHAR(255),
    destination VARCHAR(255),
    distance_km INTEGER DEFAULT 0,
    weight_tons DECIMAL(10,2) DEFAULT 0,
    rate_per_ton DECIMAL(10,2) DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    fuel_expense DECIMAL(10,2) DEFAULT 0,
    driver_expense DECIMAL(10,2) DEFAULT 0,
    other_expenses DECIMAL(10,2) DEFAULT 0,
    total_expenses DECIMAL(10,2) DEFAULT 0,
    profit DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id VARCHAR(50) REFERENCES clients(client_id),
    invoice_date DATE NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_weight_tons DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    status invoice_status DEFAULT 'draft',
    due_date DATE,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id),
    trip_id UUID REFERENCES trips(id),
    date DATE,
    vehicle_number VARCHAR(50),
    order_number VARCHAR(50),
    delivery_address TEXT,
    tile_quantities JSONB DEFAULT '{}',
    total_boxes INTEGER DEFAULT 0,
    total_weight_tons DECIMAL(10,2) DEFAULT 0,
    rate_per_ton DECIMAL(10,2) DEFAULT 0,
    amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INVENTORY TABLES (Matching ERP_Prototype)
-- =====================================================

-- Inventory (ERP: ItemID, ItemName, Category, Quantity, UnitCost, TotalValue)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers (ERP: SupplierID, Name, Category, ContactInfo, Address)
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    contact_info VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CRM TABLES (Matching ERP_Prototype)
-- =====================================================

-- Contacts (ERP: ContactID, Name, Type, Phone, Email, Address)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id VARCHAR(50) UNIQUE NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_type VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaints
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    order_id UUID REFERENCES orders(id),
    complaint_type VARCHAR(100),
    description TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium',
    status complaint_status DEFAULT 'open',
    assigned_to UUID REFERENCES drivers(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- KPIs TABLE (Matching ERP_Prototype)
-- =====================================================

-- KPIs (ERP: KPIID, Metric, Target, Actual, Variance, Notes)
CREATE TABLE kpis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_id VARCHAR(50) UNIQUE NOT NULL,
    metric VARCHAR(255) NOT NULL,
    target DECIMAL(10,2),
    actual DECIMAL(10,2),
    variance DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USER MANAGEMENT
-- =====================================================

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'operations',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SEED DATA from ERP_Prototype.xlsx
-- =====================================================

-- Seed Vehicles
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
('V10', 'Truck', 'GJR-444', '14 tons', 'available');

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
('DR10', 'Salman Ali', 'LIC-99001', '1112474');

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
('C10', 'Zenith Logistics', '9991363', 'Gujranwala');

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
('D10', 'Admin', 'Mahnoor Iqbal');

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
('O510', 'C10', '2026-10-22', 'DR10', 'V10', 'delivered');

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
('F710', 'V10', '2026-10-22', 200, '65 L');

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
('M810', 'V10', '2026-09-21', 10000, 'Brake pads');

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
('FT910', 'V10', '2026-10-22', 65, 9750);

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
('A1110', 'DR10', '2026-01-22', 'present');

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
('S1210', 'DR10', 'Feb', 60000, 'paid');

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
('R1310', 'O510', '2026-10-22', 36000, 'paid');

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
('E1410', '2026-09-21', 'fuel', 14000, 'Petrol refill');

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
('P1510', 'O510', '2026-10-22', 36000, 'Cheque', 'paid');

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
('PT1610', 'O510', 36000, 16000, 20000);

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
('INV-010', 'C10', '2026-10-28', '2026-10-22', '2026-10-28', 52, 36000, 6480, 42480, 'paid', 42480);

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
('I1710', 'Safety Helmets', 'Supplies', 30, 800, 24000);

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
('SUP1810', 'Allied Parts', 'Spare Parts', '6668041', 'Peshawar, Pakistan');

-- Seed Contacts
INSERT INTO contacts (contact_id, contact_name, contact_type, phone, email, address) VALUES
('CT1901', 'Ahmed Raza', 'Client', '1112441', 'ahmed.raza@sikas.com', 'Lahore, Pakistan'),
('CT1902', 'PakFuel Ltd.', 'Supplier', '9876784', 'info@pakfuel.com', 'Karachi, Pakistan'),
('CT1903', 'Salman Ali', 'Client', '5556906', 'salman.ali@sikas.com', 'Islamabad, Pakistan'),
('CT1904', 'Mega Tyres', 'Supplier', '2223597', 'sales@megatyres.com', 'Rawalpindi, Pakistan'),
('CT1905', 'OfficeMart', 'Partner', '4445784', 'contact@officemart.pk', 'Faisalabad, Pakistan');

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
('K2010', 'Inventory Accuracy', 97, 95, -2, 'Stock mismatch');

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tile_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_per_trip ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- RLS Policies (allow all for now)
CREATE POLICY "full_access" ON vehicles FOR ALL USING (true);
CREATE POLICY "full_access" ON drivers FOR ALL USING (true);
CREATE POLICY "full_access" ON clients FOR ALL USING (true);
CREATE POLICY "full_access" ON departments FOR ALL USING (true);
CREATE POLICY "full_access" ON employees FOR ALL USING (true);
CREATE POLICY "full_access" ON tile_types FOR ALL USING (true);
CREATE POLICY "full_access" ON rate_cards FOR ALL USING (true);
CREATE POLICY "full_access" ON orders FOR ALL USING (true);
CREATE POLICY "full_access" ON deliveries FOR ALL USING (true);
CREATE POLICY "full_access" ON dispatch_challans FOR ALL USING (true);
CREATE POLICY "full_access" ON vehicle_usage_logs FOR ALL USING (true);
CREATE POLICY "full_access" ON maintenance_records FOR ALL USING (true);
CREATE POLICY "full_access" ON fuel_tracking FOR ALL USING (true);
CREATE POLICY "full_access" ON attendance FOR ALL USING (true);
CREATE POLICY "full_access" ON salaries FOR ALL USING (true);
CREATE POLICY "full_access" ON revenue FOR ALL USING (true);
CREATE POLICY "full_access" ON expenses FOR ALL USING (true);
CREATE POLICY "full_access" ON payments FOR ALL USING (true);
CREATE POLICY "full_access" ON profit_per_trip FOR ALL USING (true);
CREATE POLICY "full_access" ON trips FOR ALL USING (true);
CREATE POLICY "full_access" ON invoices FOR ALL USING (true);
CREATE POLICY "full_access" ON invoice_items FOR ALL USING (true);
CREATE POLICY "full_access" ON inventory FOR ALL USING (true);
CREATE POLICY "full_access" ON suppliers FOR ALL USING (true);
CREATE POLICY "full_access" ON contacts FOR ALL USING (true);
CREATE POLICY "full_access" ON complaints FOR ALL USING (true);
CREATE POLICY "full_access" ON kpis FOR ALL USING (true);
CREATE POLICY "full_access" ON user_profiles FOR ALL USING (true);
CREATE POLICY "full_access" ON audit_logs FOR ALL USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;