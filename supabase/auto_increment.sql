-- SIKAS ERP: Auto-Increment Sequences and Triggers

CREATE OR REPLACE FUNCTION generate_custom_id()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    id_field TEXT;
    max_id TEXT;
    next_num INTEGER;
    query TEXT;
BEGIN
    prefix := TG_ARGV[0];
    id_field := TG_ARGV[1];
    
    -- If value is provided and not empty, skip
    EXECUTE format('SELECT ($1).%I', id_field) INTO max_id USING NEW;
    IF max_id IS NOT NULL AND max_id <> '' THEN
        RETURN NEW;
    END IF;

    -- Find the max id
    query := format('SELECT MAX(CAST(SUBSTRING(%I FROM length(%L) + 1) AS INTEGER)) FROM %I WHERE %I LIKE %L', 
                    id_field, prefix, TG_TABLE_NAME, id_field, prefix || '%');
    EXECUTE query INTO next_num;

    IF next_num IS NULL THEN
        next_num := 1;
    ELSE
        next_num := next_num + 1;
    END IF;

    -- Pad differently for INV
    IF prefix = 'INV-' THEN
        NEW := jsonb_populate_record(NEW, to_jsonb(NEW) || jsonb_build_object(id_field, prefix || lpad(next_num::TEXT, 3, '0')));
    ELSIF prefix = 'A' OR prefix = 'S' OR prefix = 'R' OR prefix = 'PT' OR prefix = 'CT' OR prefix = 'SUP' OR prefix = 'I' OR prefix = 'K' THEN
        NEW := jsonb_populate_record(NEW, to_jsonb(NEW) || jsonb_build_object(id_field, prefix || lpad(next_num::TEXT, 4, '0')));
    ELSE
        NEW := jsonb_populate_record(NEW, to_jsonb(NEW) || jsonb_build_object(id_field, prefix || lpad(next_num::TEXT, 2, '0')));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_vehicles_id ON vehicles;
CREATE TRIGGER trigger_vehicles_id BEFORE INSERT ON vehicles FOR EACH ROW EXECUTE FUNCTION generate_custom_id('V', 'vehicle_id');

DROP TRIGGER IF EXISTS trigger_drivers_id ON drivers;
CREATE TRIGGER trigger_drivers_id BEFORE INSERT ON drivers FOR EACH ROW EXECUTE FUNCTION generate_custom_id('DR', 'driver_id');

DROP TRIGGER IF EXISTS trigger_clients_id ON clients;
CREATE TRIGGER trigger_clients_id BEFORE INSERT ON clients FOR EACH ROW EXECUTE FUNCTION generate_custom_id('C', 'client_id');

DROP TRIGGER IF EXISTS trigger_departments_id ON departments;
CREATE TRIGGER trigger_departments_id BEFORE INSERT ON departments FOR EACH ROW EXECUTE FUNCTION generate_custom_id('D', 'department_id');

DROP TRIGGER IF EXISTS trigger_employees_id ON employees;
CREATE TRIGGER trigger_employees_id BEFORE INSERT ON employees FOR EACH ROW EXECUTE FUNCTION generate_custom_id('E', 'employee_id');

DROP TRIGGER IF EXISTS trigger_orders_id ON orders;
CREATE TRIGGER trigger_orders_id BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_custom_id('O', 'order_id');

DROP TRIGGER IF EXISTS trigger_deliveries_id ON deliveries;
CREATE TRIGGER trigger_deliveries_id BEFORE INSERT ON deliveries FOR EACH ROW EXECUTE FUNCTION generate_custom_id('DEL', 'delivery_id');

DROP TRIGGER IF EXISTS trigger_usage_logs_id ON vehicle_usage_logs;
CREATE TRIGGER trigger_usage_logs_id BEFORE INSERT ON vehicle_usage_logs FOR EACH ROW EXECUTE FUNCTION generate_custom_id('F', 'usage_id');

DROP TRIGGER IF EXISTS trigger_maintenance_id ON maintenance_records;
CREATE TRIGGER trigger_maintenance_id BEFORE INSERT ON maintenance_records FOR EACH ROW EXECUTE FUNCTION generate_custom_id('M', 'maintenance_id');

DROP TRIGGER IF EXISTS trigger_fuel_id ON fuel_tracking;
CREATE TRIGGER trigger_fuel_id BEFORE INSERT ON fuel_tracking FOR EACH ROW EXECUTE FUNCTION generate_custom_id('FT', 'fuel_id');

DROP TRIGGER IF EXISTS trigger_attendance_id ON attendance;
CREATE TRIGGER trigger_attendance_id BEFORE INSERT ON attendance FOR EACH ROW EXECUTE FUNCTION generate_custom_id('A', 'attendance_id');

DROP TRIGGER IF EXISTS trigger_salaries_id ON salaries;
CREATE TRIGGER trigger_salaries_id BEFORE INSERT ON salaries FOR EACH ROW EXECUTE FUNCTION generate_custom_id('S', 'salary_id');

DROP TRIGGER IF EXISTS trigger_revenue_id ON revenue;
CREATE TRIGGER trigger_revenue_id BEFORE INSERT ON revenue FOR EACH ROW EXECUTE FUNCTION generate_custom_id('R', 'revenue_id');

DROP TRIGGER IF EXISTS trigger_expenses_id ON expenses;
CREATE TRIGGER trigger_expenses_id BEFORE INSERT ON expenses FOR EACH ROW EXECUTE FUNCTION generate_custom_id('E', 'expense_id');

DROP TRIGGER IF EXISTS trigger_payments_id ON payments;
CREATE TRIGGER trigger_payments_id BEFORE INSERT ON payments FOR EACH ROW EXECUTE FUNCTION generate_custom_id('P', 'payment_id');

DROP TRIGGER IF EXISTS trigger_trips_id ON profit_per_trip;
CREATE TRIGGER trigger_trips_id BEFORE INSERT ON profit_per_trip FOR EACH ROW EXECUTE FUNCTION generate_custom_id('PT', 'trip_id');

DROP TRIGGER IF EXISTS trigger_invoices_id ON invoices;
CREATE TRIGGER trigger_invoices_id BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION generate_custom_id('INV-', 'invoice_number');

DROP TRIGGER IF EXISTS trigger_contacts_id ON contacts;
CREATE TRIGGER trigger_contacts_id BEFORE INSERT ON contacts FOR EACH ROW EXECUTE FUNCTION generate_custom_id('CT', 'contact_id');
