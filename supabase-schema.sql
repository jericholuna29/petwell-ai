-- Pet Health App Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('pet_owner', 'vet')) NOT NULL DEFAULT 'pet_owner',
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create pets table
CREATE TABLE IF NOT EXISTS pets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  species TEXT NOT NULL, -- dog, cat, bird, etc.
  pet_image_url TEXT,
  breed TEXT,
  age INTEGER, -- in years
  weight DECIMAL(5,2), -- in kg
  medical_history TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE pets ADD COLUMN IF NOT EXISTS pet_image_url TEXT;

-- Create vets table (additional info for vet users)
CREATE TABLE IF NOT EXISTS vets (
  id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  license_number TEXT UNIQUE,
  specialization TEXT,
  experience_years INTEGER,
  clinic_name TEXT,
  clinic_address TEXT,
  availability JSONB, -- store availability schedule
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vet_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
  appointment_type TEXT, -- consultation, checkup, vaccination, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  pet_owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vet_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  consultation_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  symptoms TEXT,
  diagnosis TEXT,
  treatment TEXT,
  prescription TEXT,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_pet_owner_id ON appointments(pet_owner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vet_id ON appointments(vet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_consultations_appointment_id ON consultations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_consultations_pet_owner_id ON consultations(pet_owner_id);
CREATE INDEX IF NOT EXISTS idx_consultations_vet_id ON consultations(vet_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vets ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read/update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can view vet profiles" ON profiles;
CREATE POLICY "Authenticated users can view vet profiles" ON profiles
  FOR SELECT USING (role = 'vet' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Vets can view pet owner profiles in assigned appointments" ON profiles;
CREATE POLICY "Vets can view pet owner profiles in assigned appointments" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM appointments
      WHERE appointments.pet_owner_id = profiles.id
        AND appointments.vet_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Pets: Pet owners can manage their own pets
DROP POLICY IF EXISTS "Pet owners can view own pets" ON pets;
CREATE POLICY "Pet owners can view own pets" ON pets
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Vets can view pets in assigned appointments" ON pets;
CREATE POLICY "Vets can view pets in assigned appointments" ON pets
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM appointments
      WHERE appointments.pet_id = pets.id
        AND appointments.vet_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Pet owners can insert own pets" ON pets;
CREATE POLICY "Pet owners can insert own pets" ON pets
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Pet owners can update own pets" ON pets;
CREATE POLICY "Pet owners can update own pets" ON pets
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Pet owners can delete own pets" ON pets;
CREATE POLICY "Pet owners can delete own pets" ON pets
  FOR DELETE USING (auth.uid() = owner_id);

-- Vets: Vets can view/update their own profile
DROP POLICY IF EXISTS "Vets can view own vet profile" ON vets;
CREATE POLICY "Vets can view own vet profile" ON vets
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can view vet directory" ON vets;
CREATE POLICY "Authenticated users can view vet directory" ON vets
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Vets can update own vet profile" ON vets;
CREATE POLICY "Vets can update own vet profile" ON vets
  FOR UPDATE USING (auth.uid() = id);

-- Appointments: Pet owners can view their appointments, vets can view appointments assigned to them
DROP POLICY IF EXISTS "Pet owners can view own appointments" ON appointments;
CREATE POLICY "Pet owners can view own appointments" ON appointments
  FOR SELECT USING (auth.uid() = pet_owner_id);

DROP POLICY IF EXISTS "Vets can view assigned appointments" ON appointments;
CREATE POLICY "Vets can view assigned appointments" ON appointments
  FOR SELECT USING (auth.uid() = vet_id);

DROP POLICY IF EXISTS "Pet owners can create appointments" ON appointments;
CREATE POLICY "Pet owners can create appointments" ON appointments
  FOR INSERT WITH CHECK (auth.uid() = pet_owner_id);

DROP POLICY IF EXISTS "Users can update their appointments" ON appointments;
CREATE POLICY "Users can update their appointments" ON appointments
  FOR UPDATE USING (auth.uid() = pet_owner_id OR auth.uid() = vet_id);

-- Consultations: Similar to appointments
DROP POLICY IF EXISTS "Pet owners can view own consultations" ON consultations;
CREATE POLICY "Pet owners can view own consultations" ON consultations
  FOR SELECT USING (auth.uid() = pet_owner_id);

DROP POLICY IF EXISTS "Vets can view assigned consultations" ON consultations;
CREATE POLICY "Vets can view assigned consultations" ON consultations
  FOR SELECT USING (auth.uid() = vet_id);

DROP POLICY IF EXISTS "Vets can create consultations" ON consultations;
CREATE POLICY "Vets can create consultations" ON consultations
  FOR INSERT WITH CHECK (auth.uid() = vet_id);

DROP POLICY IF EXISTS "Vets can update consultations" ON consultations;
CREATE POLICY "Vets can update consultations" ON consultations
  FOR UPDATE USING (auth.uid() = vet_id);

-- Function to handle user profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone, address)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'pet_owner'),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', ''), ''),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'address', ''), '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    updated_at = TIMEZONE('utc'::text, NOW());

  IF COALESCE(NEW.raw_user_meta_data->>'role', 'pet_owner') = 'vet' THEN
    INSERT INTO public.vets (
      id,
      license_number,
      specialization,
      experience_years,
      clinic_name,
      clinic_address
    )
    VALUES (
      NEW.id,
      NULLIF(COALESCE(NEW.raw_user_meta_data->>'license_number', ''), ''),
      NULLIF(COALESCE(NEW.raw_user_meta_data->>'specialization', ''), ''),
      CASE
        WHEN COALESCE(NEW.raw_user_meta_data->>'experience_years', '') ~ '^[0-9]+$'
          THEN (NEW.raw_user_meta_data->>'experience_years')::INTEGER
        ELSE NULL
      END,
      NULLIF(COALESCE(NEW.raw_user_meta_data->>'clinic_name', ''), ''),
      NULLIF(COALESCE(NEW.raw_user_meta_data->>'clinic_address', ''), '')
    )
    ON CONFLICT (id) DO UPDATE
    SET
      license_number = EXCLUDED.license_number,
      specialization = EXCLUDED.specialization,
      experience_years = EXCLUDED.experience_years,
      clinic_name = EXCLUDED.clinic_name,
      clinic_address = EXCLUDED.clinic_address;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pets_updated_at ON pets;
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_consultations_updated_at ON consultations;
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();