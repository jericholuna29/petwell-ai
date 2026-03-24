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

interface VetProfileRow {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
}

interface VetDetailsRow {
  id: string;
  clinic_name: string | null;
  clinic_address: string | null;
  specialization: string | null;
  experience_years: number | null;
}

interface RecommendedVet {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  clinicName: string;
  clinicAddress: string;
  specialization: string;
  experienceYears: string;
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

interface ConsultationBookingPrefill {
  from: 'consultation';
  createdAt: string;
  vetId: string;
  vetName: string;
  petId: string;
  petName: string;
  petType: 'dog' | 'cat';
  petAge: number;
  symptoms: string;
  severity: 'low' | 'medium' | 'high';
  possibleIllnesses: string[];
  recommendations: string[];
}

const CONSULTATION_HISTORY_KEY = 'petwell_consultation_history_v1';
const CONSULTATION_BOOKING_PREFILL_KEY = 'petwell_consultation_booking_prefill_v1';

export default function ConsultationForm() {
  const router = useRouter();
  const [petName, setPetName] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [petOptions, setPetOptions] = useState<PetOption[]>([]);
  const [loadingPets, setLoadingPets] = useState(false);
  const [petType, setPetType] = useState<'dog' | 'cat'>('dog');
  const [petAge, setPetAge] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultationResponse | null>(null);
  const [recommendedVets, setRecommendedVets] = useState<RecommendedVet[]>([]);
  const [loadingVets, setLoadingVets] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consultationHistory, setConsultationHistory] = useState<ConsultationHistoryEntry[]>([]);

  const saveBookingPrefill = (vet: RecommendedVet) => {
    if (!result) {
      return;
    }

    if (!selectedPetId) {
      return;
    }

    const parsedPetAge = Number(petAge);
    const payload: ConsultationBookingPrefill = {
      from: 'consultation',
      createdAt: new Date().toISOString(),
      vetId: vet.id,
      vetName: vet.name,
      petId: selectedPetId,
      petName: petName.trim(),
      petType,
      petAge: Number.isFinite(parsedPetAge) ? parsedPetAge : 0,
      symptoms: symptoms.trim(),
      severity: result.severity,
      possibleIllnesses: result.possible_illnesses,
      recommendations: result.recommendations,
    };

    window.localStorage.setItem(CONSULTATION_BOOKING_PREFILL_KEY, JSON.stringify(payload));
  };

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
    try {
      const rawHistory = window.localStorage.getItem(CONSULTATION_HISTORY_KEY);
      if (!rawHistory) return;

      const parsed = JSON.parse(rawHistory) as ConsultationHistoryEntry[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      setConsultationHistory(parsed);

      const latest = parsed[0];
      setPetName(latest.petName);
      setPetType(latest.petType);
      setPetAge(String(latest.petAge));
      setSymptoms(latest.symptoms);
      setResult(latest.result);
    } catch {
      window.localStorage.removeItem(CONSULTATION_HISTORY_KEY);
    }
  }, []);

  useEffect(() => {
    if (!result || result.severity === 'low' || recommendedVets.length > 0 || loadingVets) {
      return;
    }

    loadRecommendedVets();
  }, [result, recommendedVets.length, loadingVets]);

  const loadRecommendedVets = async () => {
    setLoadingVets(true);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, address')
      .eq('role', 'vet')
      .order('created_at', { ascending: false })
      .limit(6);

    if (profileError) {
      toast.error(profileError.message || 'Failed to load veterinarian recommendations');
      setRecommendedVets([]);
      setLoadingVets(false);
      return;
    }

    const vetProfiles = (profileData || []) as VetProfileRow[];
    if (!vetProfiles.length) {
      setRecommendedVets([]);
      setLoadingVets(false);
      return;
    }

    const vetIds = vetProfiles.map((row) => row.id);
    const { data: vetData, error: vetError } = await supabase
      .from('vets')
      .select('id, clinic_name, clinic_address, specialization, experience_years')
      .in('id', vetIds);

    if (vetError) {
      toast.error(vetError.message || 'Failed to load clinic information');
      setRecommendedVets([]);
      setLoadingVets(false);
      return;
    }

    const vetDetailsMap = new Map<string, VetDetailsRow>();
    ((vetData || []) as VetDetailsRow[]).forEach((row) => {
      vetDetailsMap.set(row.id, row);
    });

    const merged = vetProfiles.map((profile) => {
      const details = vetDetailsMap.get(profile.id);
      return {
        id: profile.id,
        name: profile.full_name?.trim() || profile.email,
        email: profile.email,
        phone: profile.phone?.trim() || 'Not provided',
        address: profile.address?.trim() || 'Not provided',
        clinicName: details?.clinic_name?.trim() || 'Independent Practice',
        clinicAddress: details?.clinic_address?.trim() || profile.address?.trim() || 'Location not provided',
        specialization: details?.specialization?.trim() || 'General Veterinary Care',
        experienceYears:
          typeof details?.experience_years === 'number'
            ? `${details.experience_years} years`
            : 'Not provided',
      };
    });

    setRecommendedVets(merged);
    setLoadingVets(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedPetId) newErrors.petName = 'Please select your pet';
    if (!petAge) newErrors.petAge = 'Pet age is required';
    if (!symptoms) newErrors.symptoms = 'Symptoms are required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const persistHistory = (nextHistory: ConsultationHistoryEntry[]) => {
    setConsultationHistory(nextHistory);
    window.localStorage.setItem(CONSULTATION_HISTORY_KEY, JSON.stringify(nextHistory));
  };

  const loadHistoryEntry = (entry: ConsultationHistoryEntry) => {
    setPetName(entry.petName);
    setPetType(entry.petType);
    setPetAge(String(entry.petAge));
    setSymptoms(entry.symptoms);
    setResult(entry.result);
    setErrors({});
  };

  const clearHistory = () => {
    setConsultationHistory([]);
    setResult(null);
    window.localStorage.removeItem(CONSULTATION_HISTORY_KEY);
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
      setResult(data);
      await loadRecommendedVets();

      const nextHistory: ConsultationHistoryEntry[] = [
        {
          id: `${Date.now()}`,
          createdAt: new Date().toISOString(),
          petName: petName.trim(),
          petType,
          petAge: parsedPetAge,
          symptoms: normalizedSymptoms,
          result: data,
        },
        ...consultationHistory,
      ];

      persistHistory(nextHistory);
      toast.success('Consultation analysis complete!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get consultation';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const severity_colors = {
    low: 'bg-gradient-to-br from-[#FFDBFD] to-[#C9BEFF] border-[#C9BEFF]',
    medium: 'bg-gradient-to-br from-[#C9BEFF] to-[#8494FF]/30 border-[#8494FF]',
    high: 'bg-gradient-to-br from-[#C9BEFF] to-[#6367FF]/30 border-[#6367FF]',
  };

  const severity_badge = {
    low: 'bg-[#FFDBFD] text-[#24274A]',
    medium: 'bg-[#C9BEFF] text-[#24274A]',
    high: 'bg-[#8494FF] text-white',
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
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className={`w-full px-4 py-2 border border-[#C9BEFF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494FF] ${
                errors.symptoms ? 'border-[#6367FF]' : ''
              }`}
              rows={5}
              placeholder="Describe your pet's symptoms in detail..."
            />
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

      {result && (
        <Card className={`border-2 ${severity_colors[result.severity]}`}>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-[#191D3A]">Analysis Results</h3>
              <p className="text-sm text-[#24274A]/75">Review possible conditions, care tips, and next-step recommendations.</p>
            </div>
            <span className={`px-4 py-1 rounded-full font-semibold text-sm ${severity_badge[result.severity]}`}>
              Severity: {result.severity.toUpperCase()}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <section className="rounded-xl border border-[#C9BEFF]/80 bg-white/70 p-4">
              <h4 className="mb-3 text-base font-semibold text-[#24274A]">Possible Illnesses</h4>
              <ul className="space-y-2 text-sm">
                {result.possible_illnesses.length > 0 ? (
                  result.possible_illnesses.map((illness, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-2 mt-0.5 text-[#6367FF]">•</span>
                      <span className="text-[#24274A]/85">{illness}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[#24274A]/70">No possible illnesses were identified.</li>
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-[#C9BEFF]/80 bg-white/70 p-4">
              <h4 className="mb-3 text-base font-semibold text-[#24274A]">Care Tips</h4>
              <ul className="space-y-2 text-sm">
                {result.tips.length > 0 ? (
                  result.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-2 mt-0.5 text-[#8494FF]">•</span>
                      <span className="text-[#24274A]/85">{tip}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[#24274A]/70">No care tips were returned.</li>
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-[#C9BEFF]/80 bg-white/70 p-4">
              <h4 className="mb-3 text-base font-semibold text-[#24274A]">Recommendations</h4>
              <ul className="space-y-2 text-sm">
                {result.recommendations.length > 0 ? (
                  result.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-2 mt-0.5 text-[#6367FF]">•</span>
                      <span className="text-[#24274A]/85">{rec}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[#24274A]/70">No recommendations were returned.</li>
                )}
              </ul>
            </section>
          </div>

            {result.severity !== 'low' && (
              <div className="mt-6 border-t border-[#C9BEFF] pt-5">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => router.push('/appointments')}
                >
                  Book Appointment with Veterinarian
                </Button>

                <div className="mt-4 rounded-xl border border-[#C9BEFF] bg-white/70 p-4">
                  <h4 className="text-lg font-semibold text-[#191D3A] mb-1">Recommended Veterinarian Contacts</h4>
                  <p className="text-sm pw-subtext mb-4">
                    Based on available registered vet clinics. Use contact info to call or send a message for follow-up care.
                  </p>

                  {loadingVets ? (
                    <p className="pw-subtext">Loading vet recommendations...</p>
                  ) : recommendedVets.length === 0 ? (
                    <p className="pw-subtext">No registered veterinarian details available yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {recommendedVets.map((vet) => {
                        return (
                          <div key={vet.id} className="rounded-lg border border-[#C9BEFF] bg-[#FFDBFD]/35 p-3">
                            <p className="font-semibold text-[#191D3A]">{vet.name}</p>
                            <p className="text-sm pw-subtext">Clinic: {vet.clinicName}</p>
                            <p className="text-sm pw-subtext">Specialization: {vet.specialization}</p>
                            <p className="text-sm pw-subtext">Experience: {vet.experienceYears}</p>
                            <p className="text-sm text-[#32375D] mt-2">Contact: {vet.phone}</p>
                            <p className="text-sm text-[#32375D]">Email: {vet.email}</p>
                            <p className="text-sm text-[#32375D]">Address: {vet.clinicAddress}</p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <a
                                href={`tel:${vet.phone}`}
                                className="rounded-md border border-[#8494FF] px-3 py-1 text-sm font-semibold text-[#6367FF]"
                              >
                                Call Vet
                              </a>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  saveBookingPrefill(vet);
                                  router.push(
                                    `/appointments?from=consultation&vetId=${encodeURIComponent(vet.id)}`
                                  );
                                }}
                              >
                                Book Appointment
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
        </Card>
      )}
    </div>
  );
}

