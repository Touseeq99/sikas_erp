-- Script to clear all data from Sikas ERP tables
-- This will delete all records and reset ID sequences
-- WARNING: This action cannot be undone!

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- Disable triggers to avoid foreign key constraints during truncation
    SET CONSTRAINTS ALL DEFERRED;
    
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('spatial_ref_sys') -- exclude PostGIS system tables if any
    ) LOOP 
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" RESTART IDENTITY CASCADE'; 
    END LOOP; 
END $$;
