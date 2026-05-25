'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface ProfileState {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  bio: string;
}

interface PetState {
  id?: string;
  name: string;
  type: string;
  age: string;
  imageUrl: string;
}

interface ConsultationHistoryEntry {
  id: string;
  created_at: string;
  pet_name: string;
  pet_type: 'dog' | 'cat';
  pet_age: number;
  symptoms: string;
  possible_illnesses: string[];
  tips: string[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

const PROFILE_PHOTO_KEY_PREFIX = 'petwell_profile_photo_v1_';

export default function PetOwnerProfile() {
  const searchParams = useSearchParams();
  const section = searchParams.get('section');
  const consultationId = searchParams.get('consultationId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [existingPetIds, setExistingPetIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileState>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    bio: '',
  });
  const [pets, setPets] = useState<PetState[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [consultationHistory, setConsultationHistory] = useState<ConsultationHistoryEntry[]>([]);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
  const [petsOpen, setPetsOpen] = useState(true);
  const [consultationsOpen, setConsultationsOpen] = useState(true);

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

      const entries: ConsultationHistoryEntry[] = (data || []).map((row: any) => ({
        id: row.id,
        created_at: row.created_at,
        pet_name: row.pet_name,
        pet_type: row.pet_type,
        pet_age: row.pet_age,
        symptoms: row.symptoms,
        possible_illnesses: row.possible_illnesses,
        tips: row.tips,
        recommendations: row.recommendations,
        severity: row.severity,
      }));

      setConsultationHistory(entries);
      if (entries.length > 0) {
        setSelectedConsultationId(entries[0].id);
      }
    };

    void loadConsultationHistory();
  }, []);

  useEffect(() => {
    if (consultationId) {
      setSelectedConsultationId(consultationId);
    }
  }, [consultationId]);

  useEffect(() => {
    if (section !== 'recent-consultations') {
      return;
    }

    const target = document.getElementById('recent-consultations');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [section, consultationHistory.length]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (sessionError || !user) {
        toast.error('Please sign in to view your profile');
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const storedProfilePhoto = window.localStorage.getItem(`${PROFILE_PHOTO_KEY_PREFIX}${user.id}`);
      if (storedProfilePhoto) {
        setProfilePhoto(storedProfilePhoto);
      }

      const [{ data: profileData, error: profileError }, { data: petsData, error: petsError }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, email, phone, address, city, country, bio')
            .eq('id', user.id)
            .single(),
          supabase
            .from('pets')
            .select('id, name, species, age, pet_image_url')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

      if (profileError) {
        toast.error(profileError.message || 'Failed to load profile details');
      } else {
        setProfile({
          fullName: profileData?.full_name || '',
          email: profileData?.email || user.email || '',
          phone: profileData?.phone || '',
          address: profileData?.address || '',
          city: profileData?.city || '',
          country: profileData?.country || '',
          bio: profileData?.bio || '',
        });
      }

      if (petsError) {
        toast.error(petsError.message || 'Failed to load pets');
        setPets([]);
        setExistingPetIds([]);
      } else {
        const loadedPets = (petsData || []).map((pet) => ({
          id: pet.id,
          name: pet.name || '',
          type: pet.species || '',
          age: pet.age !== null && pet.age !== undefined ? String(pet.age) : '',
          imageUrl: pet.pet_image_url || '',
        }));

        setPets(loadedPets);
        setExistingPetIds(loadedPets.map((pet) => pet.id!).filter(Boolean));
      }

      setLoading(false);
    };

    void loadProfile();
  }, []);

  const visibleProfileFields = [
    { label: 'Phone', value: profile.phone },
    { label: 'Address', value: profile.address },
    { label: 'City', value: profile.city },
    { label: 'Country', value: profile.country },
    { label: 'Bio', value: profile.bio },
  ].filter((field) => field.value.trim() !== '');

  const visiblePets = useMemo(
    () => pets.filter((pet) => pet.name.trim() || pet.type.trim() || pet.age.trim()),
    [pets]
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const updatePet = (idx: number, key: keyof PetState, value: string) => {
    setPets((currentPets) =>
      currentPets.map((pet, petIndex) => (petIndex === idx ? { ...pet, [key]: value } : pet))
    );
  };

  const addPet = () => {
    setPets((currentPets) => [...currentPets, { name: '', type: '', age: '', imageUrl: '' }]);
  };

  const handlePetImageUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updatePet(idx, 'imageUrl', String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const removePet = (idx: number) => {
    setPets((currentPets) => currentPets.filter((_, petIndex) => petIndex !== idx));
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error('Please sign in to update your profile');
      return;
    }

    setSaving(true);

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        full_name: profile.fullName.trim() || null,
        phone: profile.phone.trim() || null,
        address: profile.address.trim() || null,
        city: profile.city.trim() || null,
        country: profile.country.trim() || null,
        bio: profile.bio.trim() || null,
      })
      .eq('id', userId);

    if (profileUpdateError) {
      const fallbackNeeded = /column|does not exist|schema cache/i.test(profileUpdateError.message || '');

      if (!fallbackNeeded) {
        toast.error(profileUpdateError.message || 'Failed to update profile');
        setSaving(false);
        return;
      }

      const { error: fallbackError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.fullName.trim() || null,
          phone: profile.phone.trim() || null,
          address: profile.address.trim() || null,
        })
        .eq('id', userId);

      if (fallbackError) {
        toast.error(fallbackError.message || 'Failed to update profile');
        setSaving(false);
        return;
      }
    }

    if (profilePhoto) {
      window.localStorage.setItem(`${PROFILE_PHOTO_KEY_PREFIX}${userId}`, profilePhoto);
    } else {
      window.localStorage.removeItem(`${PROFILE_PHOTO_KEY_PREFIX}${userId}`);
    }

    const trimmedPets = pets
      .map((pet) => ({
        ...pet,
        name: pet.name.trim(),
        type: pet.type.trim().toLowerCase(),
        age: pet.age.trim(),
        imageUrl: pet.imageUrl,
      }))
      .filter((pet) => pet.name || pet.type || pet.age || pet.imageUrl);

    for (const pet of trimmedPets) {
      const parsedAge = pet.age ? Number(pet.age) : null;

      if (pet.age && parsedAge !== null && (Number.isNaN(parsedAge) || parsedAge < 0)) {
        toast.error('Pet age must be a valid non-negative number');
        setSaving(false);
        return;
      }

      if (!pet.id && (!pet.name || !pet.type)) {
        continue;
      }

      if (!pet.name) {
        toast.error('Each pet must have a name');
        setSaving(false);
        return;
      }

      if (!pet.type) {
        toast.error('Each pet must have a type');
        setSaving(false);
        return;
      }

      if (pet.id) {
        const { error } = await supabase
          .from('pets')
          .update({
            name: pet.name,
            species: pet.type,
            age: parsedAge,
            pet_image_url: pet.imageUrl || null,
          })
          .eq('id', pet.id)
          .eq('owner_id', userId);

        if (error) {
          toast.error(error.message || 'Failed to update pet information');
          setSaving(false);
          return;
        }
      } else {
        const { error } = await supabase.from('pets').insert([
          {
            owner_id: userId,
            name: pet.name,
            species: pet.type,
            age: parsedAge,
            pet_image_url: pet.imageUrl || null,
          },
        ]);

        if (error) {
          toast.error(error.message || 'Failed to add new pet');
          setSaving(false);
          return;
        }
      }
    }

    const currentIds = new Set(trimmedPets.map((pet) => pet.id).filter(Boolean) as string[]);
    const removedIds = existingPetIds.filter((id) => !currentIds.has(id));

    if (removedIds.length) {
      const { error: deleteError } = await supabase
        .from('pets')
        .delete()
        .eq('owner_id', userId)
        .in('id', removedIds);

      if (deleteError) {
        toast.error(deleteError.message || 'Failed to remove deleted pets');
        setSaving(false);
        return;
      }
    }

    const { data: refreshedPets, error: refreshPetsError } = await supabase
      .from('pets')
      .select('id, name, species, age, pet_image_url')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (!refreshPetsError) {
      const normalizedPets = (refreshedPets || []).map((pet) => ({
        id: pet.id,
        name: pet.name || '',
        type: pet.species || '',
        age: pet.age !== null && pet.age !== undefined ? String(pet.age) : '',
        imageUrl: pet.pet_image_url || '',
      }));
      setPets(normalizedPets);
      setExistingPetIds(normalizedPets.map((pet) => pet.id!).filter(Boolean));
    }

    toast.success('Profile updated successfully!');
    setIsEditing(false);
    setSaving(false);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8 space-y-6">
      <Card className="border-[#D7D0FF] bg-gradient-to-br from-white via-white to-[#F7F4FF]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Profile"
                  className="h-24 w-24 rounded-3xl object-cover border border-[#C9BEFF] shadow-[0_10px_24px_rgba(99,103,255,0.12)]"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#8494FF] to-[#6367FF] text-2xl font-bold text-white shadow-[0_10px_24px_rgba(99,103,255,0.22)]">
                  {profile.fullName.trim() ? profile.fullName.trim().slice(0, 2).toUpperCase() : 'NA'}
                </div>
              )}
            </div>
            <div>
              <p className="pw-chip mb-2 uppercase tracking-[0.18em]">Owner Profile</p>
              <h2 className="text-3xl font-bold text-[#191D3A] md:text-4xl">
                {profile.fullName.trim() || 'My Profile'}
              </h2>
              <p className="pw-subtext mt-2 max-w-2xl text-sm md:text-base">
                Manage your contact details, pets, and consultation history from one responsive dashboard.
              </p>
              {profile.email.trim() && <p className="mt-3 text-sm font-medium text-[#5E6288]">{profile.email}</p>}
            </div>
          </div>

          <Button
            variant={isEditing ? 'secondary' : 'primary'}
            className="w-full lg:w-auto"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel editing' : 'Edit profile'}
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="space-y-6">
          <Card className="border-[#D7D0FF] bg-white/90">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-[#191D3A]">Profile Details</h3>
                <p className="pw-subtext text-sm">Your core contact information and bio.</p>
              </div>
            </div>

            {loading ? (
              <p className="pw-subtext">Loading profile...</p>
            ) : isEditing ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#32375D]">Profile Picture</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="w-full rounded-xl border border-[#C9BEFF] bg-white px-3 py-2"
                  />
                </div>
                <Input label="Full Name" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
                <Input label="Email" type="email" value={profile.email} onChange={() => undefined} disabled />
                <Input label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                <Input label="Address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                <Input label="City" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
                <Input label="Country" value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} />
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#32375D]">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="min-h-[120px] w-full rounded-xl border border-[#C9BEFF] px-4 py-3 outline-none transition focus:border-[#8494FF] focus:ring-2 focus:ring-[#8494FF]/20"
                    rows={4}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button variant="primary" className="w-full sm:w-auto" loading={saving} onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : visibleProfileFields.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProfileFields.map((field) => (
                  <div key={field.label} className={field.label === 'Bio' ? 'sm:col-span-2 xl:col-span-3' : ''}>
                    <p className="text-sm pw-subtext">{field.label}</p>
                    <p className="mt-1 text-base font-semibold text-[#191D3A] md:text-lg">{field.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#5E6288]">No profile details added yet.</p>
            )}
          </Card>

          <Card className="border-[#D7D0FF] bg-white/90 overflow-hidden">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setPetsOpen((o) => !o)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h3 className="text-2xl font-bold text-[#191D3A]">My Pets</h3>
                <p className="pw-subtext text-sm">{visiblePets.length} pet{visiblePets.length !== 1 ? 's' : ''} registered</p>
              </div>
              <ChevronDown
                size={22}
                className={`text-[#8494FF] transition-transform duration-300 flex-shrink-0 ${petsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Accordion Body */}
            {petsOpen && (
              <div className="mt-5">
                {isEditing ? (
                  <div className="space-y-4">
                    {pets.map((pet, idx) => (
                      <div
                        key={`${pet.name}-${idx}`}
                        className="rounded-2xl border border-[#E2DDFF] bg-[#FCFBFF] p-4 shadow-sm space-y-4 md:grid md:grid-cols-[120px_minmax(0,1fr)] md:gap-4 md:space-y-0"
                      >
                        <div>
                          {pet.imageUrl ? (
                            <img
                              src={pet.imageUrl}
                              alt={`${pet.name || 'Pet'} profile`}
                              className="h-24 w-24 rounded-2xl object-cover border border-[#C9BEFF]"
                            />
                          ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[#C9BEFF] bg-[#FFDBFD] text-xs font-semibold text-[#5E6288]">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-[#32375D]">Pet Profile Image</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePetImageUpload(idx, e)}
                              className="w-full rounded-xl border border-[#C9BEFF] bg-white px-3 py-2"
                            />
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input label="Pet Name" value={pet.name} onChange={(e) => updatePet(idx, 'name', e.target.value)} />
                            <Input label="Pet Type" value={pet.type} onChange={(e) => updatePet(idx, 'type', e.target.value)} />
                            <Input label="Pet Age" type="number" min="0" value={pet.age} onChange={(e) => updatePet(idx, 'age', e.target.value)} />
                          </div>
                          <Button variant="danger" size="sm" onClick={() => removePet(idx)}>
                            Remove Pet
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="secondary" className="w-full sm:w-auto" onClick={addPet}>
                      Add Pet
                    </Button>
                  </div>
                ) : visiblePets.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {visiblePets.map((pet, idx) => {
                      const petDetails = [pet.type && `Type: ${pet.type}`, pet.age && `Age: ${pet.age}`]
                        .filter(Boolean)
                        .join(' | ');
                      return (
                        <div key={`${pet.name}-${idx}`} className="rounded-2xl border border-[#E2DDFF] bg-[#FCFBFF] p-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            {pet.imageUrl ? (
                              <img
                                src={pet.imageUrl}
                                alt={`${pet.name || 'Pet'} profile`}
                                className="h-16 w-16 rounded-2xl object-cover border border-[#C9BEFF]"
                              />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C9BEFF] bg-[#FFDBFD] text-xs font-semibold text-[#5E6288]">
                                Pet
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#191D3A]">{pet.name || 'Unnamed Pet'}</p>
                              {petDetails && <p className="mt-1 text-sm pw-subtext">{petDetails}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[#5E6288]">No pets added yet.</p>
                )}
              </div>
            )}
          </Card>
        </div>

        <div id="recent-consultations">
          <Card className="border-[#D7D0FF] bg-white/90 xl:sticky xl:top-6 overflow-hidden">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setConsultationsOpen((o) => !o)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h3 className="text-2xl font-bold text-[#191D3A]">Recent Consultations</h3>
                <p className="pw-subtext text-sm">{consultationHistory.length} consultation{consultationHistory.length !== 1 ? 's' : ''} saved</p>
              </div>
              <ChevronDown
                size={22}
                className={`text-[#8494FF] transition-transform duration-300 flex-shrink-0 ${consultationsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Accordion Body */}
            {consultationsOpen && (
              <div className="mt-5">
                {consultationHistory.length === 0 ? (
                  <p className="text-[#5E6288]">No consultation history yet.</p>
                ) : (
                  <div className="space-y-3">
                    {consultationHistory.map((entry) => {
                      const active = selectedConsultationId === entry.id;
                      return (
                        <div
                          key={entry.id}
                          className={`rounded-2xl border transition ${active ? 'border-[#8494FF] bg-[#EDE9FF]' : 'border-[#C9BEFF] bg-white/70'}`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedConsultationId((current) => (current === entry.id ? null : entry.id))}
                            className="w-full px-4 py-4 text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[#191D3A]">
                                  {entry.pet_name} ({entry.pet_type.toUpperCase()})
                                </p>
                                <p className="text-sm text-[#32375D]">
                                  {new Date(entry.created_at).toLocaleString()} • Severity: {entry.severity.toUpperCase()}
                                </p>
                                <p className="mt-1 line-clamp-2 text-sm text-[#24274A]/80">Symptoms: {entry.symptoms}</p>
                              </div>
                              <ChevronDown
                                size={16}
                                className={`flex-shrink-0 text-[#6367FF] transition-transform duration-200 mt-1 ${active ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </button>

                          {active && (
                            <div className="border-t border-[#C9BEFF] px-4 pb-4 pt-3">
                              <h4 className="mb-1 text-lg font-bold text-[#191D3A]">Analysis Results</h4>
                              <p className="mb-4 text-sm text-[#32375D]">
                                {entry.pet_name} • {new Date(entry.created_at).toLocaleString()}
                              </p>
                              <div className="grid gap-4 md:grid-cols-3">
                                <section className="rounded-2xl border border-[#C9BEFF]/80 bg-white/80 p-3">
                                  <h5 className="mb-2 font-semibold text-[#24274A]">Possible Illnesses</h5>
                                  <ul className="space-y-1 text-sm text-[#24274A]/85">
                                    {entry.possible_illnesses.length > 0 ? (
                                      entry.possible_illnesses.map((illness, idx) => <li key={idx}>• {illness}</li>)
                                    ) : (
                                      <li>No possible illnesses identified.</li>
                                    )}
                                  </ul>
                                </section>
                                <section className="rounded-2xl border border-[#C9BEFF]/80 bg-white/80 p-3">
                                  <h5 className="mb-2 font-semibold text-[#24274A]">Care Tips</h5>
                                  <ul className="space-y-1 text-sm text-[#24274A]/85">
                                    {entry.tips.length > 0 ? (
                                      entry.tips.map((tip, idx) => <li key={idx}>• {tip}</li>)
                                    ) : (
                                      <li>No care tips available.</li>
                                    )}
                                  </ul>
                                </section>
                                <section className="rounded-2xl border border-[#C9BEFF]/80 bg-white/80 p-3">
                                  <h5 className="mb-2 font-semibold text-[#24274A]">Recommendations</h5>
                                  <ul className="space-y-1 text-sm text-[#24274A]/85">
                                    {entry.recommendations.length > 0 ? (
                                      entry.recommendations.map((item, idx) => <li key={idx}>• {item}</li>)
                                    ) : (
                                      <li>No recommendations available.</li>
                                    )}
                                  </ul>
                                </section>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}