-- DEV ONLY: Reset application tables and helper function
-- Run this before re-running supabase-schema.sql when you want a clean state.

DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS appointment_messages CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS vets CASCADE;
DROP TABLE IF EXISTS pets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.notify_on_appointment_message();
DROP FUNCTION IF EXISTS public.notify_on_appointment_created();
DROP FUNCTION IF EXISTS public.notify_on_appointment_updated();
