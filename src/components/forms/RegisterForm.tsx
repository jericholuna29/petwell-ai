'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'pet_owner' | 'vet'>('pet_owner');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Email is required';
    if (!fullName) newErrors.fullName = 'Full name is required';
    if (!password) newErrors.password = 'Password is required';
    if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    if (role === 'vet') {
      if (!phone.trim()) newErrors.phone = 'Contact number is required for veterinarian registration';
      if (!address.trim()) newErrors.address = 'Address is required for veterinarian registration';
      if (!clinicName.trim()) newErrors.clinicName = 'Clinic name is required';
      if (!clinicAddress.trim()) newErrors.clinicAddress = 'Clinic address is required for map recommendation';
      if (!specialization.trim()) newErrors.specialization = 'Specialization is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getSignupErrorMessage = (error: any) => {
    const rawMessage = (error?.message || '').toLowerCase();

    if (error?.status === 429) {
      return 'Too many registration attempts. Please wait and try again later.';
    }

    if (error?.status === 409) {
      return 'This account already exists. Please sign in instead.';
    }

    if (error?.status === 422) {
      if (rawMessage.includes('password')) {
        return 'Password does not meet policy requirements. Use at least 8 characters.';
      }

      if (rawMessage.includes('signups not allowed')) {
        return 'Signups are currently disabled in Supabase Auth settings.';
      }

      return error?.message || 'Signup data is invalid. Please check your details and try again.';
    }

    if (error?.status === 400) {
      return error?.message || 'Invalid registration data. Please check your input.';
    }

    return error?.message || 'Registration failed';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role,
            phone: phone.trim(),
            address: address.trim(),
            clinic_name: clinicName.trim(),
            clinic_address: clinicAddress.trim(),
            specialization: specialization.trim(),
            experience_years: experienceYears.trim(),
            license_number: licenseNumber.trim(),
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        toast.success('Registration successful! Please check your email to confirm.');
        router.push('/auth/login');
      }
    } catch (error: any) {
      toast.error(getSignupErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Full Name"
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={errors.fullName}
        placeholder="John Doe"
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        placeholder="••••••••"
      />

      <div>
        <label className="block text-sm font-medium text-[#32375D] mb-2">
          I am a:
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="pet_owner"
              checked={role === 'pet_owner'}
              onChange={(e) => setRole(e.target.value as 'pet_owner' | 'vet')}
              className="mr-2"
            />
            <span className="text-[#32375D]">Pet Owner</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="vet"
              checked={role === 'vet'}
              onChange={(e) => setRole(e.target.value as 'pet_owner' | 'vet')}
              className="mr-2"
            />
            <span className="text-[#32375D]">Veterinarian</span>
          </label>
        </div>
      </div>

      {role === 'vet' && (
        <>
          <Input
            label="Contact Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
            placeholder="e.g. +63 912 345 6789"
          />
          <Input
            label="Address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            error={errors.address}
            placeholder="Your professional address"
          />
          <Input
            label="Clinic Name"
            type="text"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            error={errors.clinicName}
            placeholder="Petwell Veterinary Clinic"
          />
          <Input
            label="Clinic Address"
            type="text"
            value={clinicAddress}
            onChange={(e) => setClinicAddress(e.target.value)}
            error={errors.clinicAddress}
            placeholder="Clinic location for map recommendation"
          />
          <Input
            label="Specialization"
            type="text"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            error={errors.specialization}
            placeholder="Small Animals, Surgery, Dermatology"
          />
          <Input
            label="Years of Experience (Optional)"
            type="number"
            min="0"
            value={experienceYears}
            onChange={(e) => setExperienceYears(e.target.value)}
            placeholder="e.g. 5"
          />
          <Input
            label="License Number (Optional)"
            type="text"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="Professional license number"
          />
        </>
      )}

      <Button
        type="submit"
        loading={loading}
        variant="primary"
        size="md"
        className="w-full mt-6"
      >
        Create Account
      </Button>
      <p className="text-center pw-subtext text-sm">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-[#6367FF] hover:underline font-semibold">
          Sign in
        </Link>
      </p>
    </form>
  );
}

