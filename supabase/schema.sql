-- SIKAS ERP - Supabase Database Schema
-- Version: 1.0.0
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

-- =====================================================
-- MASTER DATA TABLES
-- =====================================================

-- Clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_code VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    credit_limit DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type VARCHAR(100),
    make VARCHAR(100),
    model VARCHAR(100),
    year_of_manufacture INTEGER,
    capacity_tons DECIMAL(10,2) DEFAULT 0,
    registration_number VARCHAR(100),
    fitness_expiry DATE,
    insurance_expiry DATE,
    status vehicle_status DEFAULT 'available',
    fuel_capacity DECIMAL(10,2),
    average_km_per_liter DECIMAL(6,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drivers table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    cnic VARCHAR(20) UNIQUE,
    phone VARCHAR(50),
    emergency_contact VARCHAR(50),
    license_number VARCHAR(50),
    license_expiry DATE,
    hire_date DATE,
    salary DECIMAL(10,2) DEFAULT 0,
    overtime_rate DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES drivers(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tile Types table (sizes + weights)
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
    client_id UUID REFERENCES clients(id),
    tile_type_id UUID REFERENCES tile_types(id),
    rate_per_ton DECIMAL(10,2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ORDER MANAGEMENT TABLES
-- =====================================================

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    order_date DATE NOT NULL,
    delivery_date DATE,
    delivery_address TEXT,
    tile_quantities JSONB DEFAULT '{}',
    total_boxes INTEGER DEFAULT 0,
    total_weight_tons DECIMAL(10,2) DEFAULT 0,
    status delivery_status DEFAULT 'pending',
    assigned_vehicle_id UUID REFERENCES vehicles(id),
    assigned_driver_id UUID REFERENCES drivers(id),
    dispatch_date TIMESTAMPTZ,
    delivery_completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dispatch Challans table
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
-- FLEET MANAGEMENT TABLES
-- =====================================================

-- Vehicle Usage Logs
CREATE TABLE vehicle_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id),
    order_id UUID REFERENCES orders(id),
    driver_id UUID REFERENCES drivers(id),
    date DATE NOT NULL,
    start_km INTEGER,
    end_km INTEGER,
    distance_km INTEGER DEFAULT 0,
    purpose VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Records
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id),
    maintenance_type VARCHAR(100) NOT NULL,
    description TEXT,
    maintenance_date DATE NOT NULL,
    next_due_date DATE,
    cost DECIMAL(10,2) DEFAULT 0,
    service_provider VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fuel Tracking
CREATE TABLE fuel_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES drivers(id),
    fill_date DATE NOT NULL,
    quantity_liters DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    odometer_reading INTEGER,
    fuel_station VARCHAR(255),
    receipt_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DRIVER & HR TABLES
-- =====================================================

-- Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id),
    attendance_date DATE NOT NULL,
    status attendance_status DEFAULT 'present',
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(driver_id, attendance_date)
);

-- Salaries
CREATE TABLE salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    base_salary DECIMAL(10,2) NOT NULL,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL,
    payment_date DATE,
    payment_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(driver_id, month, year)
);

-- =====================================================
-- FINANCE & BILLING TABLES
-- =====================================================

-- Trips (for revenue tracking)
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

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_type VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES drivers(id),
    category VARCHAR(100),
    receipt_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices (Weekly)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
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
-- CRM TABLES
-- =====================================================

-- Client Contacts
CREATE TABLE client_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    contact_name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
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
-- USER MANAGEMENT TABLES
-- =====================================================

-- User Profiles (with roles)
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

-- =====================================================
-- AUDIT LOG
-- =====================================================

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
-- SEED DATA (Sample Data)
-- =====================================================

-- Sample Clients
INSERT INTO clients (client_code, client_name, contact_person, phone, address) VALUES
('ORL001', 'Oreal Ceramics', 'Mr. Ahmed', '+92-42-1234567', 'Lahore, Pakistan'),
('ORL002', 'Dawn Ceramics', 'Mr. Shahid', '+92-42-2345678', 'Faisalabad, Pakistan'),
('ORL003', 'Shams Ceramics', 'Mr. Raza', '+92-42-3456789', 'Karachi, Pakistan');

-- Sample Vehicles
INSERT INTO vehicles (vehicle_number, vehicle_type, make, model, capacity_tons, registration_number) VALUES
('LK-1001', 'Truck', 'Hino', 'FG2JRTD', 20, 'LKR-12345'),
('LK-1002', 'Truck', 'Hino', 'FG2JRTD', 20, 'LKR-12346'),
('LK-1003', 'Truck', 'Isuzu', 'NPR75', 15, 'LKR-12347'),
('LK-1004', 'Truck', 'Hino', 'FG2JRTD', 20, 'LKR-12348'),
('LK-1005', 'Truck', 'Isuzu', 'NPR75', 15, 'LKR-12349');

-- Sample Drivers
INSERT INTO drivers (driver_code, first_name, last_name, cnic, phone, license_number, salary, overtime_rate) VALUES
('DRV001', 'Kashif', 'Mahmood', '35202-1234567-8', '+92-300-1234567', 'LDR-12345', 50000, 200),
('DRV002', 'Imran', 'Khan', '35202-2345678-9', '+92-300-2345678', 'LDR-23456', 50000, 200),
('DRV003', 'Shahid', 'Mehmood', '35202-3456789-0', '+92-300-3456789', 'LDR-34567', 45000, 180),
('DRV004', 'Rashid', 'Ali', '35202-4567890-1', '+92-300-4567890', 'LDR-45678', 50000, 200),
('DRV005', 'Javaid', 'Akhtar', '35202-5678901-2', '+92-300-5678901', 'LDR-56789', 45000, 180);

-- Sample Tile Types
INSERT INTO tile_types (tile_name, size_inches, pieces_per_box, weight_per_box_kg) VALUES
('Ceramic Floor Tile 12x12', '12x12', 12, 14),
('Ceramic Floor Tile 16x16', '16x16', 8, 15),
('Porcelain Tile 24x24', '24x24', 4, 18),
('Ceramic Wall Tile 8x12', '8x12', 15, 12),
('Granite Tile 24x24', '24x24', 2, 22);

-- Sample Rate Card
INSERT INTO rate_cards (client_id, tile_type_id, rate_per_ton, effective_from)
SELECT c.id, t.id, 2500, '2026-01-01'
FROM clients c, tile_types t
WHERE c.client_code = 'ORL001';

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tile_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Function to get current user role
-- Grant access to auth schema
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Create a custom role function that works without auth schema access
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        (SELECT role FROM user_profiles WHERE user_id = auth.uid()),
        'operations'
    );
$$ LANGUAGE SQL STABLE;

-- For RLS policies, use this simpler approach without calling auth.uid()
-- We'll update the policies to use a different approach

-- Grant permissions for RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- RLS Policies - Admin gets full access (simplified without auth.role())
-- Using (current_setting('app.current_role', true) = 'admin') as alternative
-- Or use supabase auth directly

CREATE POLICY "admin_full_access" ON clients FOR ALL USING (
    true  -- For now, allow all access. Add role check in application layer
);

CREATE POLICY "admin_full_access" ON vehicles FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON drivers FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON departments FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON tile_types FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON rate_cards FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON orders FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON dispatch_challans FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON vehicle_usage_logs FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON maintenance_records FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON fuel_tracking FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON attendance FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON salaries FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON trips FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON expenses FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON invoices FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON invoice_items FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON client_contacts FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON complaints FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON user_profiles FOR ALL USING (
    true
);

CREATE POLICY "admin_full_access" ON audit_logs FOR ALL USING (
    true
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate profit
CREATE OR REPLACE FUNCTION calculate_trip_profit()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_expenses := COALESCE(NEW.fuel_expense, 0) + COALESCE(NEW.driver_expense, 0) + COALESCE(NEW.other_expenses, 0);
    NEW.profit := COALESCE(NEW.revenue, 0) - NEW.total_expenses;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_trip_profit BEFORE INSERT OR UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION calculate_trip_profit();

-- =====================================================
-- REAL-TIME SUBSCRIPTIONS
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE dispatch_challans;
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
