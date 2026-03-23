-- Drop existing tables in reverse order (due to foreign key constraints)
-- Run this FIRST if you get "relation already exists" errors

-- Drop triggers first
DROP TRIGGER IF EXISTS update_consultations_updated_at ON consultations;
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
DROP TRIGGER IF EXISTS update_pets_updated_at ON pets;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS trigger_notify_on_appointment_message ON appointment_messages;
DROP TRIGGER IF EXISTS trigger_notify_on_appointment_created ON appointments;
DROP TRIGGER IF EXISTS trigger_notify_on_appointment_updated ON appointments;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS public.notify_on_appointment_message();
DROP FUNCTION IF EXISTS public.notify_on_appointment_created();
DROP FUNCTION IF EXISTS public.notify_on_appointment_updated();

-- Drop policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Pet owners can view own pets" ON pets;
DROP POLICY IF EXISTS "Pet owners can insert own pets" ON pets;
DROP POLICY IF EXISTS "Pet owners can update own pets" ON pets;
DROP POLICY IF EXISTS "Pet owners can delete own pets" ON pets;
DROP POLICY IF EXISTS "Vets can view own vet profile" ON vets;
DROP POLICY IF EXISTS "Vets can update own vet profile" ON vets;
DROP POLICY IF EXISTS "Pet owners can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Vets can view assigned appointments" ON appointments;
DROP POLICY IF EXISTS "Pet owners can create appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their appointments" ON appointments;
DROP POLICY IF EXISTS "Pet owners can view own consultations" ON consultations;
DROP POLICY IF EXISTS "Vets can view assigned consultations" ON consultations;
DROP POLICY IF EXISTS "Vets can create consultations" ON consultations;
DROP POLICY IF EXISTS "Vets can update consultations" ON consultations;
DROP POLICY IF EXISTS "Participants can view appointment messages" ON appointment_messages;
DROP POLICY IF EXISTS "Participants can insert appointment messages" ON appointment_messages;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS appointment_messages;
DROP TABLE IF EXISTS consultations;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS vets;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS profiles;

-- Now you can run the main schema SQL