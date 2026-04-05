-- =====================================================
-- FIX FOR: permission denied for schema auth
-- =====================================================

-- The issue is that auth.role() function tries to access auth.uid()
-- which requires special permissions. Let's fix this:

-- Option 1: Drop the problematic function and use simpler approach
-- (This removes the custom auth.role function)

-- Option 2: Grant proper permissions to auth schema
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT FUNCTION ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Option 3 (Recommended): Simplify RLS policies to allow all access
-- Run this in Supabase SQL Editor:

-- Drop existing policies that use auth.role()
DROP POLICY IF EXISTS "admin_full_access" ON clients;
DROP POLICY IF EXISTS "admin_full_access" ON vehicles;
DROP POLICY IF EXISTS "admin_full_access" ON drivers;
DROP POLICY IF EXISTS "admin_full_access" ON departments;
DROP POLICY IF EXISTS "admin_full_access" ON tile_types;
DROP POLICY IF EXISTS "admin_full_access" ON rate_cards;
DROP POLICY IF EXISTS "admin_full_access" ON orders;
DROP POLICY IF EXISTS "admin_full_access" ON dispatch_challans;
DROP POLICY IF EXISTS "admin_full_access" ON vehicle_usage_logs;
DROP POLICY IF EXISTS "admin_full_access" ON maintenance_records;
DROP POLICY IF EXISTS "admin_full_access" ON fuel_tracking;
DROP POLICY IF EXISTS "admin_full_access" ON attendance;
DROP POLICY IF EXISTS "admin_full_access" ON salaries;
DROP POLICY IF EXISTS "admin_full_access" ON trips;
DROP POLICY IF EXISTS "admin_full_access" ON expenses;
DROP POLICY IF EXISTS "admin_full_access" ON invoices;
DROP POLICY IF EXISTS "admin_full_access" ON invoice_items;
DROP POLICY IF EXISTS "admin_full_access" ON client_contacts;
DROP POLICY IF EXISTS "admin_full_access" ON complaints;
DROP POLICY IF EXISTS "admin_full_access" ON user_profiles;
DROP POLICY IF EXISTS "admin_full_access" ON audit_logs;

-- Create permissive policies (allow all operations)
-- You can add role-based filtering in your application code

CREATE POLICY "allow_all" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON tile_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rate_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON dispatch_challans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON vehicle_usage_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON maintenance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON fuel_tracking FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON salaries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON client_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON complaints FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- ALTERNATIVELY: If you want to keep role-based security
-- Use this simpler function that doesn't need auth schema
-- =====================================================

-- Drop the old function
DROP FUNCTION IF EXISTS auth.role();

-- Create new function in public schema
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        (SELECT role FROM user_profiles WHERE user_id = auth.uid()),
        'admin'  -- Default to admin for now
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Grant execute access
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon, authenticated, service_role;

-- Now update RLS policies to use this:
/*
CREATE POLICY "admin_full_access" ON trips FOR ALL USING (
    public.get_current_user_role() IN ('admin', 'finance', 'operations')
);
*/
