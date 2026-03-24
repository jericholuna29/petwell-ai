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

    const { error: updateVetError } = await supabase
      .from('vets')
      .upsert(
        {
          id: authData.user.id,
          specialization: profile.specializations.trim() || null,
          experience_years: parsedExperience,
          clinic_name: profile.clinic.trim() || null,
          clinic_address: profile.address.trim() || null,
          license_number: profile.licenseNumber.trim() || null,
        },
        { onConflict: 'id' }
      );

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
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[#191D3A]">Veterinarian Profile</h2>
          <Button
            variant={isEditing ? 'secondary' : 'primary'}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="pw-subtext">Loading veterinarian profile...</p>
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
                {profile.fullName.trim() ? profile.fullName.trim().slice(0, 2).toUpperCase() : 'VT'}
              </div>
            )}
            <div className="ml-6">
              <h3 className="text-2xl font-bold text-[#191D3A]">{profile.fullName}</h3>
              <p className="pw-subtext">{profile.clinic}</p>
              <div className="flex items-center mt-2">
                <span className="text-[#6367FF]">★★★★★</span>
                <span className="pw-subtext text-sm ml-2">Vet Clinic Profile</span>
              </div>
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
                label="Clinic Name"
                value={profile.clinic}
                onChange={(e) =>
                  setProfile({ ...profile, clinic: e.target.value })
                }
              />
              <Input
                label="Specializations"
                value={profile.specializations}
                onChange={(e) =>
                  setProfile({ ...profile, specializations: e.target.value })
                }
              />
              <Input
                label="License Number"
                value={profile.licenseNumber}
                onChange={(e) =>
                  setProfile({ ...profile, licenseNumber: e.target.value })
                }
              />
              <Input
                label="Years of Experience"
                type="number"
                value={profile.experience}
                onChange={(e) =>
                  setProfile({ ...profile, experience: e.target.value })
                }
              />
              <Input
                label="Address"
                value={profile.address}
                onChange={(e) =>
                  setProfile({ ...profile, address: e.target.value })
                }
              />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm pw-subtext">Phone</p>
                <p className="text-lg font-semibold text-[#191D3A]">
                  {profile.phone}
                </p>
              </div>
              <div>
                <p className="text-sm pw-subtext">Consultation Fee</p>
                <p className="text-lg font-semibold text-[#191D3A]">
                  Not provided
                </p>
              </div>
              <div>
                <p className="text-sm pw-subtext">Years of Experience</p>
                <p className="text-lg font-semibold text-[#191D3A]">
                  {profile.experience ? `${profile.experience} years` : 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm pw-subtext">Specializations</p>
                <p className="text-lg font-semibold text-[#191D3A]">
                  {profile.specializations || 'Not provided'}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm pw-subtext">Clinic Address</p>
                <p className="text-lg text-[#191D3A]">{profile.address || 'Not provided'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm pw-subtext">License Number</p>
                <p className="text-lg text-[#191D3A]">{profile.licenseNumber || 'Not provided'}</p>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

