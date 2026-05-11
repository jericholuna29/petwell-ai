'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface ConsultationResponse {
  possible_illnesses: string[];
  tips: string[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

interface ConsultationHistoryEntry {
  id: string;
  createdAt: string;
  petName: string;
  petType: 'dog' | 'cat';
  petAge: number;
  symptoms: string;
  result: ConsultationResponse;
}

interface PetOption {
  id: string;
  name: string;
  species: string;
  age: number | null;
}

const COMMON_SYMPTOMS = {
  dog: [
    'Vomiting',
    'Diarrhea',
    'Lethargy',
    'Coughing',
    'Sneezing',
    'Itching',
    'Hair loss',
    'Loss of appetite',
    'Weight loss',
    'Excessive thirst',
    'Frequent urination',
    'Lameness',
    'Limping',
    'Ear discharge',
    'Eye discharge',
    'Bad breath',
    'Gum inflammation',
    'Difficulty breathing',
    'Wheezing',
    'Seizures',
  ],
  cat: [
    'Vomiting',
    'Diarrhea',
    'Constipation',
    'Lethargy',
    'Sneezing',
    'Coughing',
    'Itching',
    'Hair loss',
    'Loss of appetite',
    'Weight loss',
    'Excessive thirst',
    'Frequent urination',
    'Difficulty urinating',
    'Lameness',
    'Limping',
    'Ear discharge',
    'Eye discharge',
    'Bad breath',
    'Gum inflammation',
    'Drooling',
  ],
};

export default function ConsultationForm() {
  const router = useRouter();
  const [petName, setPetName] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [petOptions, setPetOptions] = useState<PetOption[]>([]);
  const [loadingPets, setLoadingPets] = useState(false);
  const [petType, setPetType] = useState<'dog' | 'cat'>('dog');
  const [petAge, setPetAge] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [filteredSymptoms, setFilteredSymptoms] = useState<string[]>([]);
  const [showSymptomDropdown, setShowSymptomDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultationResponse | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consultationHistory, setConsultationHistory] = useState<ConsultationHistoryEntry[]>([]);

  useEffect(() => {
    const loadPets = async () => {
      setLoadingPets(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setLoadingPets(false);
        return;
      }

      const { data, error } = await supabase
        .from('pets')
        .select('id, name, species, age')
        .eq('owner_id', authData.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error(error.message || 'Failed to load pets for consultation');
        setPetOptions([]);
        setLoadingPets(false);
        return;
      }

      const rows = (data || []) as PetOption[];
      setPetOptions(rows);

      if (!selectedPetId && rows.length > 0) {
        setSelectedPetId(rows[0].id);
      }

      setLoadingPets(false);
    };

    void loadPets();
  }, []);

  useEffect(() => {
    if (!selectedPetId) {
      return;
    }

    const selectedPet = petOptions.find((pet) => pet.id === selectedPetId);
    if (!selectedPet) {
      return;
    }

    setPetName(selectedPet.name);

    const normalizedSpecies = selectedPet.species.trim().toLowerCase();
    if (normalizedSpecies === 'dog' || normalizedSpecies === 'cat') {
      setPetType(normalizedSpecies);
    }

    if (selectedPet.age !== null && selectedPet.age !== undefined) {
      setPetAge(String(selectedPet.age));
    }
  }, [selectedPetId, petOptions]);

  useEffect(() => {
    const loadConsultationHistory = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return;
      }

      const { data, error } = await supabase
        .from('ai_consultations')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to load consultation history:', error);
        return;
      }

      if (!data || data.length === 0) return;

      const entries: ConsultationHistoryEntry[] = data.map((row: any) => ({
        id: row.id,
        createdAt: row.created_at,
        petName: row.pet_name,
        petType: row.pet_type as 'dog' | 'cat',
        petAge: row.pet_age,
        symptoms: row.symptoms,
        result: {
          possible_illnesses: row.possible_illnesses,
          tips: row.tips,
          recommendations: row.recommendations,
          severity: row.severity,
        },
      }));

      setConsultationHistory(entries);

      const latest = entries[0];
      setPetName(latest.petName);
      setPetType(latest.petType);
      setPetAge(String(latest.petAge));
      setSymptoms(latest.symptoms);
      setResult(latest.result);
    };

    void loadConsultationHistory();
  }, []);

  const handleSymptomChange = (value: string) => {
    setSymptoms(value);

    if (!value.trim()) {
      setFilteredSymptoms([]);
      setShowSymptomDropdown(false);
      return;
    }

    const availableSymptoms = COMMON_SYMPTOMS[petType] || [];
    const filtered = availableSymptoms.filter((s) =>
      s.toLowerCase().includes(value.toLowerCase())
    );

    setFilteredSymptoms(filtered);
    setShowSymptomDropdown(filtered.length > 0);
  };

  const selectSymptom = (symptom: string) => {
    setSymptoms(symptom);
    setFilteredSymptoms([]);
    setShowSymptomDropdown(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedPetId) newErrors.petName = 'Please select your pet';
    if (!petAge) newErrors.petAge = 'Pet age is required';
    if (!symptoms) newErrors.symptoms = 'Symptoms are required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const persistHistory = async (entry: ConsultationHistoryEntry) => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      toast.error('Not authenticated');
      return;
    }

    const { error } = await supabase.from('ai_consultations').insert({
      user_id: authData.user.id,
      pet_id: selectedPetId,
      pet_name: entry.petName,
      pet_type: entry.petType,
      pet_age: entry.petAge,
      symptoms: entry.symptoms,
      possible_illnesses: entry.result.possible_illnesses,
      tips: entry.result.tips,
      recommendations: entry.result.recommendations,
      severity: entry.result.severity,
    });

    if (error) {
      console.error('Failed to save consultation:', error);
      toast.error('Failed to save consultation to database');
      return;
    }

    setConsultationHistory([entry, ...consultationHistory]);
  };

  const loadHistoryEntry = (entry: ConsultationHistoryEntry) => {
    setPetName(entry.petName);
    setPetType(entry.petType);
    setPetAge(String(entry.petAge));
    setSymptoms(entry.symptoms);
    setResult(entry.result);
    setErrors({});
  };

  const clearHistory = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      toast.error('Not authenticated');
      return;
    }

    const { error } = await supabase
      .from('ai_consultations')
      .delete()
      .eq('user_id', authData.user.id);

    if (error) {
      toast.error('Failed to clear consultation history');
      return;
    }

    setConsultationHistory([]);
    setResult(null);
    toast.success('Consultation history cleared.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const normalizedSymptoms = symptoms.trim();
      const parsedPetAge = Number(petAge);

      const response = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petType,
          petAge: parsedPetAge,
          symptoms: normalizedSymptoms,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Consultation failed (${response.status})`);
      }

      const data = await response.json();

      const nextHistory: ConsultationHistoryEntry = {
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        petName: petName.trim(),
        petType,
        petAge: parsedPetAge,
        symptoms: normalizedSymptoms,
        result: data,
      };

      await persistHistory(nextHistory);

      // Redirect to results page with data
      const resultData = {
        petName: petName.trim(),
        petType,
        symptoms: normalizedSymptoms,
        possible_illnesses: data.possible_illnesses,
        tips: data.tips,
        recommendations: data.recommendations,
        severity: data.severity,
      };

      const resultsUrl = `/consultation/results?result=${encodeURIComponent(
        JSON.stringify(resultData)
      )}`;
      router.push(resultsUrl);
      toast.success('Consultation analysis complete!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get consultation';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="mb-6">
        <div className="mb-6 flex items-center gap-3">
          <Image
            src="/Petwellai.svg"
            alt="Petwell AI logo"
            width={56}
            height={56}
            className="h-12 w-12"
          />
          <h2 className="text-2xl font-bold text-[#191D3A]">
            Petwell AI Consultation
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#32375D] mb-2">
              Select Pet
            </label>
            <select
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="w-full px-4 py-2 border border-[#C9BEFF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494FF]"
              disabled={loadingPets || petOptions.length === 0}
            >
              <option value="">Select your pet</option>
              {petOptions.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} ({pet.species})
                </option>
              ))}
            </select>
            {errors.petName && (
              <p className="text-[#6367FF] text-sm mt-1">{errors.petName}</p>
            )}

            {petOptions.length === 0 && !loadingPets && (
              <p className="text-sm text-[#32375D] mt-2">
                No pets found.{' '}
                <Link href="/pets/add" className="font-semibold text-[#6367FF] hover:underline">
                  Add a pet first
                </Link>
                .
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#32375D] mb-2">
              Pet Type
            </label>
            <select
              value={petType}
              onChange={(e) => setPetType(e.target.value as 'dog' | 'cat')}
              className="w-full px-4 py-2 border border-[#C9BEFF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494FF]"
            >
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
            </select>
          </div>

          <Input
            label="Pet Age (in years)"
            type="number"
            value={petAge}
            onChange={(e) => setPetAge(e.target.value)}
            error={errors.petAge}
            placeholder="Enter pet's age"
            min="0"
            step="0.1"
          />

          <div>
            <label className="block text-sm font-medium text-[#32375D] mb-2">
              Symptoms Description
            </label>
            <div className="relative">
              <input
                type="text"
                value={symptoms}
                onChange={(e) => handleSymptomChange(e.target.value)}
                onFocus={() => {
                  if (symptoms.trim() && filteredSymptoms.length > 0) {
                    setShowSymptomDropdown(true);
                  }
                }}
                className={`w-full px-4 py-2 border border-[#C9BEFF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494FF] ${
                  errors.symptoms ? 'border-[#6367FF]' : ''
                }`}
                placeholder="Type or select a symptom..."
              />

              {showSymptomDropdown && filteredSymptoms.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#C9BEFF] rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {filteredSymptoms.map((symptom) => (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => selectSymptom(symptom)}
                      className="w-full text-left px-4 py-2 hover:bg-[#F5F3FF] hover:text-[#6367FF] text-[#32375D] transition-colors"
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {symptoms && (
              <div className="mt-3 p-3 bg-[#F5F3FF] rounded-lg">
                <p className="text-sm font-medium text-[#32375D] mb-2">Selected symptom:</p>
                <p className="text-[#6367FF]">{symptoms}</p>
              </div>
            )}

            {errors.symptoms && (
              <p className="text-[#6367FF] text-sm mt-1">{errors.symptoms}</p>
            )}
          </div>

          <Button
            type="submit"
            loading={loading}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Get AI Analysis
          </Button>
        </form>
      </Card>

      {consultationHistory.length > 0 && (
        <Card className="mb-6 border border-[#C9BEFF]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#191D3A]">Previous Consultations</h3>
              <p className="text-sm text-[#24274A]/75">Your recent AI consultation results are saved on this device.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={clearHistory}>
              Clear History
            </Button>
          </div>

          <div className="space-y-2">
            {consultationHistory.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() =>
                  router.push(
                    `/profile?section=recent-consultations&consultationId=${encodeURIComponent(entry.id)}`
                  )
                }
                className="w-full rounded-lg border border-[#C9BEFF] bg-white/70 px-4 py-3 text-left transition hover:border-[#8494FF]"
              >
                <p className="font-semibold text-[#191D3A]">
                  {entry.petName} ({entry.petType.toUpperCase()})
                </p>
                <p className="text-sm text-[#32375D]">
                  {new Date(entry.createdAt).toLocaleString()} • Severity: {entry.result.severity.toUpperCase()}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-[#24274A]/80">Symptoms: {entry.symptoms}</p>
                <p className="mt-2 text-xs font-semibold text-[#6367FF]">Open in Profile Recent Consultations</p>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

