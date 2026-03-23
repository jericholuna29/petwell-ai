-- DEV ONLY: Reset application tables and helper function
-- Run this before re-running supabase-schema.sql when you want a clean state.

DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS vets CASCADE;
DROP TABLE IF EXISTS pets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS public.update_updated_at_column();
