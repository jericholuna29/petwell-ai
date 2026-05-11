-- Add AI consultations table for storing AI analysis results
CREATE TABLE IF NOT EXISTS ai_consultations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  pet_name TEXT NOT NULL,
  pet_type TEXT NOT NULL, -- dog, cat
  pet_age INTEGER NOT NULL,
  symptoms TEXT NOT NULL,
  possible_illnesses TEXT[] NOT NULL,
  tips TEXT[] NOT NULL,
  recommendations TEXT[] NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_consultations_user_id ON ai_consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_consultations_pet_id ON ai_consultations(pet_id);

-- Enable RLS
ALTER TABLE ai_consultations ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own consultations
CREATE POLICY "Users can insert their own consultations"
ON ai_consultations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own consultations
CREATE POLICY "Users can read their own consultations"
ON ai_consultations FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to update their own consultations
CREATE POLICY "Users can update their own consultations"
ON ai_consultations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own consultations
CREATE POLICY "Users can delete their own consultations"
ON ai_consultations FOR DELETE
USING (auth.uid() = user_id);
