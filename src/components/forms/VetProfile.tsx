'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const VET_PROFILE_PHOTO_KEY_PREFIX = 'petwell_vet_profile_photo_v1_';

export default function VetProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    specializations: '',
    experience: '',
    clinic: '',
    address: '',
    licenseNumber: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        toast.error('Please sign in to view profile');
        setLoading(false);
        return;
      }

      setUserId(authData.user.id);

      const storedProfilePhoto = window.localStorage.getItem(
        `${VET_PROFILE_PHOTO_KEY_PREFIX}${authData.user.id}`
      );
      if (storedProfilePhoto) {
        setProfilePhoto(storedProfilePhoto);
      }

      const [{ data: profileData, error: profileError }, { data: vetData, error: vetError }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, email, phone, address')
            .eq('id', authData.user.id)
            .single(),
          supabase
            .from('vets')
            .select('specialization, experience_years, clinic_name, clinic_address, license_number')
            .eq('id', authData.user.id)
            .single(),
        ]);

      if (profileError) {
        toast.error(profileError.message || 'Failed to load profile information');
      }

      if (vetError && vetError.code !== 'PGRST116') {
        toast.error(vetError.message || 'Failed to load veterinarian details');
      }

      setProfile({
        fullName: profileData?.full_name || '',
        email: profileData?.email || authData.user.email || '',
        phone: profileData?.phone || '',
        specializations: vetData?.specialization || '',
        experience:
          typeof vetData?.experience_years === 'number'
            ? String(vetData.experience_years)
            : '',
        clinic: vetData?.clinic_name || '',
        address: vetData?.clinic_address || profileData?.address || '',
        licenseNumber: vetData?.license_number || '',
      });

      setLoading(false);
    };

    void loadProfile();
  }, []);

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

  const handleSave = async () => {
    setSaving(true);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      toast.error('Please sign in to update profile');
      setSaving(false);
      return;
    }

    const vetExperience = profile.experience.trim();
    const parsedExperience = vetExperience ? Number(vetExperience) : null;

    if (vetExperience && Number.isNaN(parsedExperience)) {
      toast.error('Years of experience must be a valid number');
      setSaving(false);
      return;
    }

    if (parsedExperience !== null && parsedExperience < 0) {
      toast.error('Years of experience cannot be negative');
      setSaving(false);
      return;
    }

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        full_name: profile.fullName.trim() || null,
        phone: profile.phone.trim() || null,
        address: profile.address.trim() || null,
      })
      .eq('id', authData.user.id);

    if (updateProfileError) {
      const fallbackNeeded = /column|does not exist|schema cache/i.test(updateProfileError.message || '');

      if (!fallbackNeeded) {
        toast.error(updateProfileError.message || 'Failed to update profile');
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
        .eq('id', authData.user.id);

      if (fallbackError) {
        toast.error(fallbackError.message || 'Failed to update profile');
        setSaving(false);
        return;
      }
    }

    // Save vets record with fallback strategies for RLS/permission issues
    const vetData = {
      id: authData.user.id,
      specialization: profile.specializations.trim() || null,
      experience_years: parsedExperience,
      clinic_name: profile.clinic.trim() || null,
      clinic_address: profile.address.trim() || null,
      license_number: profile.licenseNumber.trim() || null,
    };

    // Try upsert first
    let { error: updateVetError } = await supabase
      .from('vets')
      .upsert([vetData], { onConflict: 'id' });

    // If upsert fails, try insert (row may not exist yet)
    if (updateVetError) {
      const { error: insertError } = await supabase
        .from('vets')
        .insert([vetData]);
      
      // If insert fails (row already exists), try update
      if (insertError) {
        const { error: updateError } = await supabase
          .from('vets')
          .update(vetData)
          .eq('id', authData.user.id);
        
        updateVetError = updateError;
      } else {
        updateVetError = null; // Insert succeeded
      }
    }

    if (updateVetError) {
      toast.error(updateVetError.message || 'Failed to update veterinarian details');
      setSaving(false);
      return;
    }

    if (profilePhoto) {
      window.localStorage.setItem(`${VET_PROFILE_PHOTO_KEY_PREFIX}${authData.user.id}`, profilePhoto);
    } else {
      window.localStorage.removeItem(`${VET_PROFILE_PHOTO_KEY_PREFIX}${authData.user.id}`);
    }

    toast.success('Profile updated successfully!');
    setIsEditing(false);
    setSaving(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 lg:px-8 space-y-6">
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
                  {profile.fullName.trim() ? profile.fullName.trim().slice(0, 2).toUpperCase() : 'VT'}
                </div>
              )}
            </div>
            <div>
              <p className="pw-chip mb-2 uppercase tracking-[0.18em]">Veterinarian Profile</p>
              <h2 className="text-3xl font-bold text-[#191D3A] md:text-4xl">
                {profile.fullName || 'Veterinarian Profile'}
              </h2>
              <p className="pw-subtext mt-2 max-w-2xl text-sm md:text-base">
                Present your clinic details, specialty, and professional credentials in a clean responsive layout.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#5E6288]">
                <span className="font-semibold text-[#6367FF]">★★★★★</span>
                <span>{profile.clinic || 'Clinic profile'}</span>
              </div>
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

      <Card className="border-[#D7D0FF] bg-white/90">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-[#191D3A]">Professional Details</h3>
            <p className="pw-subtext text-sm">A concise, mobile-friendly overview of your practice information.</p>
          </div>
        </div>

        {loading ? (
          <p className="pw-subtext">Loading veterinarian profile...</p>
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
            <Input
              label="Full Name"
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
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
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
            <Input
              label="Clinic Name"
              value={profile.clinic}
              onChange={(e) => setProfile({ ...profile, clinic: e.target.value })}
            />
            <Input
              label="Specializations"
              value={profile.specializations}
              onChange={(e) => setProfile({ ...profile, specializations: e.target.value })}
            />
            <Input
              label="License Number"
              value={profile.licenseNumber}
              onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })}
            />
            <Input
              label="Years of Experience"
              type="number"
              value={profile.experience}
              onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
            />
            <Input
              label="Address"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />
            <div className="md:col-span-2">
              <Button
                variant="primary"
                className="w-full sm:w-auto"
                loading={saving}
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="text-sm pw-subtext">Phone</p>
              <p className="mt-1 text-base font-semibold text-[#191D3A] md:text-lg">{profile.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm pw-subtext">Consultation Fee</p>
              <p className="mt-1 text-base font-semibold text-[#191D3A] md:text-lg">Not provided</p>
            </div>
            <div>
              <p className="text-sm pw-subtext">Years of Experience</p>
              <p className="mt-1 text-base font-semibold text-[#191D3A] md:text-lg">
                {profile.experience ? `${profile.experience} years` : 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-sm pw-subtext">Specializations</p>
              <p className="mt-1 text-base font-semibold text-[#191D3A] md:text-lg">
                {profile.specializations || 'Not provided'}
              </p>
            </div>
            <div className="sm:col-span-2 xl:col-span-3">
              <p className="text-sm pw-subtext">Clinic Address</p>
              <p className="mt-1 text-base text-[#191D3A] md:text-lg">{profile.address || 'Not provided'}</p>
            </div>
            <div className="sm:col-span-2 xl:col-span-3">
              <p className="text-sm pw-subtext">License Number</p>
              <p className="mt-1 text-base text-[#191D3A] md:text-lg">{profile.licenseNumber || 'Not provided'}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

