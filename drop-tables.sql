-- Drop existing tables in reverse order (due to foreign key constraints)
-- Run this FIRST if you get "relation already exists" errors

-- Drop triggers first
DROP TRIGGER IF EXISTS update_consultations_updated_at ON consultations;
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
DROP TRIGGER IF EXISTS update_pets_updated_at ON pets;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();

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

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS consultations;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS vets;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS profiles;

-- Now you can run the main schema SQL