'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface PetItem {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  pet_image_url: string | null;
}

export default function MyPetManager() {
  const [pets, setPets] = useState<PetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    species: 'dog',
    breed: '',
    age: '',
  });
  const [petImagePreview, setPetImagePreview] = useState<string | null>(null);

  const ensureProfileExists = async (user: { id: string; email?: string | null }) => {
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (existingProfile) {
      return;
    }

    const { error: createProfileError } = await supabase.from('profiles').insert([
      {
        id: user.id,
        email: user.email || `${user.id}@petwell.local`,
        role: 'pet_owner',
      },
    ]);

    if (createProfileError) {
      throw createProfileError;
    }
  };

  const loadPets = async () => {
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('pets')
      .select('id, name, species, breed, age, pet_image_url')
      .eq('owner_id', authData.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(error.message || 'Failed to load pets');
      setPets([]);
    } else {
      setPets((data || []) as PetItem[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadPets();
  }, []);

  const handlePetImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPetImagePreview(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('Image is too large. Please use an image below 1.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPetImagePreview(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Pet name is required');
      return;
    }

    if (!form.species.trim()) {
      toast.error('Pet type is required');
      return;
    }

    setSaving(true);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      toast.error('Please sign in to add a pet');
      setSaving(false);
      return;
    }

    const ageValue = form.age.trim() ? Number(form.age) : null;

    if (ageValue !== null && (Number.isNaN(ageValue) || ageValue < 0)) {
      toast.error('Age must be a valid non-negative number');
      setSaving(false);
      return;
    }

    try {
      await ensureProfileExists({ id: authData.user.id, email: authData.user.email });
    } catch (profileError: any) {
      toast.error(profileError?.message || 'Failed to prepare your profile for pet saving');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('pets').insert([
      {
        owner_id: authData.user.id,
        name: form.name.trim(),
        species: form.species.trim(),
        breed: form.breed.trim() || null,
        age: ageValue,
        pet_image_url: petImagePreview,
      },
    ]);

    if (error) {
      toast.error(error.message || 'Failed to add pet');
      setSaving(false);
      return;
    }

    toast.success('Pet added successfully');
    setForm({ name: '', species: 'dog', breed: '', age: '' });
    setPetImagePreview(null);
    await loadPets();
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card className="bg-gradient-to-br from-[#FFDBFD] to-[#C9BEFF]/70">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-[#191D3A]">My Pet</h2>
          <Link href="/dashboard" className="text-sm font-semibold text-[#6367FF] hover:underline">
            Back to Dashboard
          </Link>
        </div>
        <p className="text-[#32375D]">Manage your pet records and add a new pet profile.</p>
      </Card>

      <Card>
        <h3 className="text-xl font-bold text-[#191D3A] mb-4">Add a Pet</h3>
        <form onSubmit={handleAddPet} className="space-y-4">
          <Input
            label="Pet Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Enter pet name"
          />

          <div>
            <label className="block text-sm font-medium text-[#2B2F66] mb-2">Pet Type</label>
            <select
              value={form.species}
              onChange={(e) => setForm({ ...form, species: e.target.value })}
              className="w-full px-4 py-2 border border-[#C9BEFF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494FF]"
            >
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
            </select>
          </div>

          <Input
            label="Breed (Optional)"
            value={form.breed}
            onChange={(e) => setForm({ ...form, breed: e.target.value })}
            placeholder="Enter breed"
          />

          <Input
            label="Age (Optional)"
            type="number"
            min="0"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            placeholder="Enter age in years"
          />

          <div>
            <label className="block text-sm font-medium text-[#2B2F66] mb-2">Pet Profile Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePetImageUpload}
              className="w-full px-3 py-2 border border-[#C9BEFF] rounded-lg bg-white"
            />
            {petImagePreview && (
              <img
                src={petImagePreview}
                alt="Pet profile preview"
                className="mt-3 h-20 w-20 rounded-full object-cover border border-[#C9BEFF]"
              />
            )}
          </div>

          <Button type="submit" variant="primary" loading={saving}>
            Add Pet
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-xl font-bold text-[#191D3A] mb-4">My Pets</h3>

        {loading ? (
          <p className="pw-subtext">Loading pets...</p>
        ) : pets.length === 0 ? (
          <p className="pw-subtext">No pets added yet.</p>
        ) : (
          <div className="space-y-3">
            {pets.map((pet) => (
              <div key={pet.id} className="border border-[#C9BEFF] rounded-lg bg-gradient-to-br from-[#FFDBFD]/70 to-[#C9BEFF]/40 p-4">
                <div className="flex items-center gap-3">
                  {pet.pet_image_url ? (
                    <img
                      src={pet.pet_image_url}
                      alt={`${pet.name} profile`}
                      className="h-14 w-14 rounded-full object-cover border border-[#C9BEFF]"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#8494FF] to-[#6367FF] text-white text-sm font-bold flex items-center justify-center">
                      {pet.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-[#191D3A]">{pet.name}</p>
                    <p className="text-sm text-[#32375D]">
                      {[pet.species, pet.breed || null, pet.age !== null ? `${pet.age} years` : null]
                        .filter(Boolean)
                        .join(' | ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

