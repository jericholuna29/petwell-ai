'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
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

interface ConsultationResult {
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
  result: ConsultationResult;
}

const CONSULTATION_HISTORY_KEY = 'petwell_consultation_history_v1';
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

  useEffect(() => {
    try {
      const rawHistory = window.localStorage.getItem(CONSULTATION_HISTORY_KEY);
      if (!rawHistory) {
        return;
      }

      const parsed = JSON.parse(rawHistory) as ConsultationHistoryEntry[];
      if (!Array.isArray(parsed)) {
        return;
      }

      setConsultationHistory(parsed);
      if (parsed.length > 0) {
        setSelectedConsultationId(parsed[0].id);
      }
    } catch {
      window.localStorage.removeItem(CONSULTATION_HISTORY_KEY);
    }
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

  const visiblePets = useMemo(() => pets.filter(
    (pet) => pet.name.trim() || pet.type.trim() || pet.age.trim()
  ), [pets]);

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
      currentPets.map((pet, petIndex) =>
        petIndex === idx ? { ...pet, [key]: value } : pet
      )
    );
  };

  const addPet = () => {
    setPets((currentPets) => [...currentPets, { name: '', type: '', age: '', imageUrl: '' }]);
  };

  const handlePetImageUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

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

if (
  pet.age &&
  parsedAge !== null &&
  (Number.isNaN(parsedAge) || parsedAge < 0)
) {
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
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[#191D3A]">My Profile</h2>
          <Button
            variant={isEditing ? 'secondary' : 'primary'}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="pw-subtext">Loading profile...</p>
          ) : (
            <>
          <div className="flex items-center mb-6">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border border-[#C9BEFF]"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-[#8494FF] to-[#6367FF] rounded-full flex items-center justify-center text-white text-lg font-bold">
                {profile.fullName.trim() ? profile.fullName.trim().slice(0, 2).toUpperCase() : 'NA'}
              </div>
            )}
            <div className="ml-6">
              {profile.fullName.trim() && (
                <h3 className="text-2xl font-bold text-[#191D3A]">{profile.fullName}</h3>
              )}
              {profile.email.trim() && (
                <p className="pw-subtext">{profile.email}</p>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#32375D] mb-2">
                  Profile Picture
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full px-3 py-2 border border-[#C9BEFF] rounded-lg bg-white"
                />
              </div>
              <Input
                label="Full Name"
                value={profile.fullName}
                onChange={(e) =>
                  setProfile({ ...profile, fullName: e.target.value })
                }
              />
              <Input
                label="Email"
                type="email"
                value={profile.email}
                onChange={() => undefined}
                disabled
              />
              <Input
                label="Phone"
                value={profile.phone}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
              />
              <Input
                label="Address"
                value={profile.address}
                onChange={(e) =>
                  setProfile({ ...profile, address: e.target.value })
                }
              />
              <Input
                label="City"
                value={profile.city}
                onChange={(e) =>
                  setProfile({ ...profile, city: e.target.value })
                }
              />
              <Input
                label="Country"
                value={profile.country}
                onChange={(e) =>
                  setProfile({ ...profile, country: e.target.value })
                }
              />
              <div>
                <label className="block text-sm font-medium text-[#32375D] mb-2">
                  Bio
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#C9BEFF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494FF]"
                  rows={4}
                />
              </div>
              <Button
                variant="primary"
                className="w-full"
                loading={saving}
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </div>
          ) : (
            <>
              {visibleProfileFields.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {visibleProfileFields.map((field) => (
                    <div key={field.label} className={field.label === 'Bio' ? 'md:col-span-2' : ''}>
                      <p className="text-sm pw-subtext">{field.label}</p>
                      <p className="text-lg font-semibold text-[#191D3A]">{field.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#5E6288]">No profile details added yet.</p>
              )}
            </>
          )}
          </>
          )}
        </div>
      </Card>

      {/* My Pets */}
      <Card>
        <h3 className="text-2xl font-bold text-[#191D3A] mb-4">My Pets</h3>
        {isEditing ? (
          <div className="space-y-3">
            {pets.map((pet, idx) => (
              <div key={`${pet.name}-${idx}`} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <div>
                  {pet.imageUrl ? (
                    <img
                      src={pet.imageUrl}
                      alt={`${pet.name || 'Pet'} profile`}
                      className="h-24 w-24 rounded-xl object-cover border border-[#C9BEFF]"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-xl bg-[#FFDBFD] border border-[#C9BEFF] flex items-center justify-center text-xs font-semibold text-[#5E6288]">
                      No image
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#32375D] mb-2">
                    Pet Profile Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePetImageUpload(idx, e)}
                    className="w-full px-3 py-2 border border-[#C9BEFF] rounded-lg bg-white"
                  />
                </div>
                <Input
                  label="Pet Name"
                  value={pet.name}
                  onChange={(e) => updatePet(idx, 'name', e.target.value)}
                />
                <Input
                  label="Pet Type"
                  value={pet.type}
                  onChange={(e) => updatePet(idx, 'type', e.target.value)}
                />
                <Input
                  label="Pet Age"
                  type="number"
                  min="0"
                  value={pet.age}
                  onChange={(e) => updatePet(idx, 'age', e.target.value)}
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removePet(idx)}
                >
                  Remove Pet
                </Button>
              </div>
            ))}
            <Button variant="secondary" onClick={addPet}>
              Add Pet
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {visiblePets.length > 0 ? (
              visiblePets.map((pet, idx) => (
                <div key={`${pet.name}-${idx}`} className="border rounded-lg p-4 bg-gray-50">
                  {(() => {
                    const petDetails = [pet.type && `Type: ${pet.type}`, pet.age && `Age: ${pet.age}`]
                      .filter(Boolean)
                      .join(' | ');

                    return (
                      <div className="flex items-center gap-3">
                        {pet.imageUrl ? (
                          <img
                            src={pet.imageUrl}
                            alt={`${pet.name || 'Pet'} profile`}
                            className="h-14 w-14 rounded-lg object-cover border border-[#C9BEFF]"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-[#FFDBFD] border border-[#C9BEFF] flex items-center justify-center text-xs font-semibold text-[#5E6288]">
                            Pet
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[#191D3A]">{pet.name || 'Unnamed Pet'}</p>
                          {petDetails && <p className="text-sm pw-subtext">{petDetails}</p>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))
            ) : (
              <p className="text-[#5E6288]">No pets added yet.</p>
            )}
          </div>
        )}
      </Card>

      <div id="recent-consultations">
      <Card>
        <h3 className="text-2xl font-bold text-[#191D3A] mb-4">Recent Consultations</h3>

        {consultationHistory.length === 0 ? (
          <p className="text-[#5E6288]">No consultation history yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {consultationHistory.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-lg border transition ${
                    selectedConsultationId === entry.id
                      ? 'border-[#8494FF] bg-[#EDE9FF]'
                      : 'border-[#C9BEFF] bg-white/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedConsultationId((current) => (current === entry.id ? null : entry.id))
                    }
                    className="w-full px-4 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#191D3A]">
                          {entry.petName} ({entry.petType.toUpperCase()})
                        </p>
                        <p className="text-sm text-[#32375D]">
                          {new Date(entry.createdAt).toLocaleString()} • Severity: {entry.result.severity.toUpperCase()}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-[#24274A]/80">Symptoms: {entry.symptoms}</p>
                      </div>
                      <span className="text-xs font-semibold text-[#6367FF]">
                        {selectedConsultationId === entry.id ? 'Hide Analysis' : 'Show Analysis'}
                      </span>
                    </div>
                  </button>

                  {selectedConsultationId === entry.id && (
                    <div className="border-t border-[#C9BEFF] px-4 pb-4 pt-3">
                      <h4 className="text-xl font-bold text-[#191D3A] mb-1">Analysis Results</h4>
                      <p className="text-sm text-[#32375D] mb-4">
                        {entry.petName} • {new Date(entry.createdAt).toLocaleString()}
                      </p>

                      <div className="grid gap-4 md:grid-cols-3">
                        <section className="rounded-lg border border-[#C9BEFF]/80 bg-white/80 p-3">
                          <h5 className="font-semibold text-[#24274A] mb-2">Possible Illnesses</h5>
                          <ul className="space-y-1 text-sm text-[#24274A]/85">
                            {entry.result.possible_illnesses.length > 0 ? (
                              entry.result.possible_illnesses.map((illness, idx) => (
                                <li key={idx}>• {illness}</li>
                              ))
                            ) : (
                              <li>No possible illnesses identified.</li>
                            )}
                          </ul>
                        </section>

                        <section className="rounded-lg border border-[#C9BEFF]/80 bg-white/80 p-3">
                          <h5 className="font-semibold text-[#24274A] mb-2">Care Tips</h5>
                          <ul className="space-y-1 text-sm text-[#24274A]/85">
                            {entry.result.tips.length > 0 ? (
                              entry.result.tips.map((tip, idx) => (
                                <li key={idx}>• {tip}</li>
                              ))
                            ) : (
                              <li>No care tips available.</li>
                            )}
                          </ul>
                        </section>

                        <section className="rounded-lg border border-[#C9BEFF]/80 bg-white/80 p-3">
                          <h5 className="font-semibold text-[#24274A] mb-2">Recommendations</h5>
                          <ul className="space-y-1 text-sm text-[#24274A]/85">
                            {entry.result.recommendations.length > 0 ? (
                              entry.result.recommendations.map((item, idx) => (
                                <li key={idx}>• {item}</li>
                              ))
                            ) : (
                              <li>No recommendations available.</li>
                            )}
                          </ul>
                        </section>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}

