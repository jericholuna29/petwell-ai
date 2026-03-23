'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import AppointmentMessageThread from '@/components/forms/AppointmentMessageThread';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface VetProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

interface VetDetailsRow {
  id: string;
  clinic_name: string | null;
  specialization: string | null;
}

interface PetRow {
  id: string;
  name: string;
  species: string;
  breed: string | null;
}

interface VetCardItem {
  id: string;
  name: string;
  clinic: string;
  specialization: string;
}

interface OwnerAppointmentRow {
  id: string;
  vet_id: string;
  pet_id: string;
  appointment_date: string;
  appointment_type: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
}

export default function BookAppointment() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isPetOwner, setIsPetOwner] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedVet, setSelectedVet] = useState('');
  const [selectedPet, setSelectedPet] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [vets, setVets] = useState<VetCardItem[]>([]);
  const [pets, setPets] = useState<PetRow[]>([]);
  const [appointments, setAppointments] = useState<OwnerAppointmentRow[]>([]);

  const selectedVetData = useMemo(
    () => vets.find((vet) => vet.id === selectedVet) || null,
    [vets, selectedVet]
  );

  const selectedPetData = useMemo(
    () => pets.find((pet) => pet.id === selectedPet) || null,
    [pets, selectedPet]
  );

  const vetMap = useMemo(() => {
    return vets.reduce<Record<string, VetCardItem>>((acc, vet) => {
      acc[vet.id] = vet;
      return acc;
    }, {});
  }, [vets]);

  const petMap = useMemo(() => {
    return pets.reduce<Record<string, PetRow>>((acc, pet) => {
      acc[pet.id] = pet;
      return acc;
    }, {});
  }, [pets]);

  const loadOwnerAppointments = async (ownerId: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, vet_id, pet_id, appointment_date, appointment_type, status, notes')
      .eq('pet_owner_id', ownerId)
      .order('appointment_date', { ascending: false });

    if (error) {
      toast.error(error.message || 'Failed to load your appointments');
      setAppointments([]);
      return;
    }

    setAppointments((data || []) as OwnerAppointmentRow[]);
  };

  useEffect(() => {
    const loadBookingData = async () => {
      setInitialLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        toast.error('Please sign in to book an appointment');
        setInitialLoading(false);
        return;
      }

      setUserId(authData.user.id);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        toast.error(profileError.message || 'Failed to load your account profile');
        setInitialLoading(false);
        return;
      }

      const ownerRole = profileData?.role === 'pet_owner';
      setIsPetOwner(ownerRole);
      if (!ownerRole) {
        setInitialLoading(false);
        return;
      }

      const [{ data: petData, error: petError }, { data: vetProfiles, error: vetProfilesError }] =
        await Promise.all([
          supabase
            .from('pets')
            .select('id, name, species, breed')
            .eq('owner_id', authData.user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'vet')
            .order('created_at', { ascending: false }),
        ]);

      if (petError) {
        toast.error(petError.message || 'Failed to load your pets');
      } else {
        setPets((petData || []) as PetRow[]);
      }

      if (vetProfilesError) {
        toast.error(vetProfilesError.message || 'Failed to load veterinarians');
        setInitialLoading(false);
        return;
      }

      const vetRows = ((vetProfiles || []) as VetProfileRow[]).filter((row) => row.id !== authData.user.id);

      if (!vetRows.length) {
        setVets([]);
        setInitialLoading(false);
        return;
      }

      const vetIds = vetRows.map((vet) => vet.id);
      const { data: vetDetailsData } = await supabase
        .from('vets')
        .select('id, clinic_name, specialization')
        .in('id', vetIds);

      const vetDetailsMap = new Map<string, VetDetailsRow>();
      ((vetDetailsData || []) as VetDetailsRow[]).forEach((detail) => {
        vetDetailsMap.set(detail.id, detail);
      });

      const normalizedVets = vetRows.map((vet) => {
        const details = vetDetailsMap.get(vet.id);
        return {
          id: vet.id,
          name: vet.full_name?.trim() || vet.email,
          clinic: details?.clinic_name?.trim() || 'Independent Practice',
          specialization: details?.specialization?.trim() || 'General Veterinary Care',
        };
      });

      setVets(normalizedVets);
      await loadOwnerAppointments(authData.user.id);
      setInitialLoading(false);
    };

    void loadBookingData();
  }, []);

  const handleBooking = async () => {
    if (!userId) {
      toast.error('Please sign in to continue');
      return;
    }

    if (!selectedPet || !selectedVet || !appointmentDate || !appointmentTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);

      if (Number.isNaN(appointmentDateTime.getTime())) {
        throw new Error('Invalid appointment date/time');
      }

      const { error } = await supabase.from('appointments').insert([
        {
          pet_owner_id: userId,
          pet_id: selectedPet,
          vet_id: selectedVet,
          appointment_date: appointmentDateTime.toISOString(),
          appointment_type: 'consultation',
          notes: notes.trim() || null,
        },
      ]);

      if (error) {
        throw error;
      }

      toast.success('Appointment request sent. Please wait for vet clinic approval.');
      setSelectedVet('');
      setSelectedPet('');
      setAppointmentDate('');
      setAppointmentTime('');
      setNotes('');
      await loadOwnerAppointments(userId);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <p className="pw-subtext">Loading booking form...</p>
        </Card>
      </div>
    );
  }

  if (!isPetOwner) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <h2 className="text-2xl font-bold text-[#191D3A] mb-2">Book Appointment</h2>
          <p className="pw-subtext">Appointment booking is available for pet owner accounts only.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <h2 className="text-3xl font-bold text-[#191D3A] mb-2">Book Appointment</h2>
        <p className="pw-subtext mb-6">Select your pet, choose a registered veterinarian, and schedule your appointment</p>

        {pets.length === 0 && (
          <div className="mb-6 rounded-lg border border-[#C9BEFF] bg-[#FFDBFD]/55 p-4">
            <p className="text-sm text-[#32375D]">
              You need at least one pet profile before booking.
              {' '}
              <Link href="/pets/add" className="font-semibold text-[#6367FF] hover:underline">
                Add your pet here
              </Link>
              .
            </p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <h3 className="text-lg font-semibold text-[#191D3A]">Select Your Pet</h3>
          <div>
            <label className="block text-sm font-medium text-[#32375D] mb-2">Pet</label>
            <select
              value={selectedPet}
              onChange={(e) => setSelectedPet(e.target.value)}
              className="w-full px-4 py-2 border border-[#C9BEFF] rounded-lg hover:border-[#8494FF]/70 focus:outline-none focus:ring-2 focus:ring-[#8494FF]/60"
              disabled={!pets.length}
            >
              <option value="">Select your pet</option>
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} ({pet.species}{pet.breed ? ` | ${pet.breed}` : ''})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vet Selection */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-[#191D3A]">Select a Registered Veterinarian</h3>
          {!vets.length ? (
            <div className="rounded-lg border border-[#C9BEFF] bg-white/70 p-4">
              <p className="pw-subtext">No veterinarian users found yet. Once someone registers as a veterinarian, they will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vets.map((vet) => (
                <div
                  key={vet.id}
                  onClick={() => setSelectedVet(vet.id)}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedVet === vet.id
                      ? 'border-[#8494FF] bg-gradient-to-br from-[#FFDBFD] to-[#C9BEFF]'
                      : 'border-[#D8D4F6] hover:border-[#C9BEFF]'
                  }`}
                >
                  <div className="flex items-start mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#8494FF] to-[#6367FF] rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">
                      VET
                    </div>
                    <div>
                      <p className="font-semibold text-[#191D3A]">{vet.name}</p>
                      <p className="text-sm pw-subtext">{vet.clinic}</p>
                    </div>
                  </div>
                  <div className="text-sm pw-subtext space-y-1">
                    <p>Specialization: {vet.specialization}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedVet && (
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold text-[#191D3A]">Schedule Details</h3>

            <Input
              label="Appointment Date"
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />

            <Input
              label="Appointment Time"
              type="time"
              value={appointmentTime}
              onChange={(e) => setAppointmentTime(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-[#32375D] mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-[#C9BEFF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494FF]"
                rows={4}
                placeholder="Any additional information for the vet..."
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm pw-subtext mb-2">Booking Summary</p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-semibold">Pet:</span>{' '}
                  {selectedPetData ? `${selectedPetData.name} (${selectedPetData.species})` : '-'}
                </p>
                <p>
                  <span className="font-semibold">Veterinarian:</span>{' '}
                  {selectedVetData?.name || '-'}
                </p>
                <p>
                  <span className="font-semibold">Date:</span>{' '}
                  {appointmentDate ? new Date(appointmentDate).toLocaleDateString() : '-'}
                </p>
                <p>
                  <span className="font-semibold">Time:</span> {appointmentTime || '-'}
                </p>
                <p>
                  <span className="font-semibold">Clinic:</span>{' '}
                  {selectedVetData?.clinic || '-'}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
              disabled={!selectedPet || !selectedVet || !appointmentDate || !appointmentTime || !pets.length}
              onClick={handleBooking}
            >
              Confirm Booking
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-xl font-bold text-[#191D3A] mb-2">My Appointment Requests</h3>
        <p className="pw-subtext mb-4">Track clinic approval status for your bookings.</p>

        {appointments.length === 0 ? (
          <p className="pw-subtext">No appointment requests yet.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => {
              const vet = vetMap[appointment.vet_id];
              const pet = petMap[appointment.pet_id];

              const statusLabel =
                appointment.status === 'pending'
                  ? 'Waiting for vet approval'
                  : appointment.status === 'confirmed'
                    ? 'Approved by vet clinic'
                    : appointment.status === 'cancelled'
                      ? 'Declined by vet clinic'
                      : appointment.status;

              const statusClass =
                appointment.status === 'pending'
                  ? 'bg-[#FFF1B8] text-[#7A5A00]'
                  : appointment.status === 'confirmed'
                    ? 'bg-[#CFF7DE] text-[#1E6B3A]'
                    : appointment.status === 'cancelled'
                      ? 'bg-[#FFD9E4] text-[#8F1F47]'
                      : 'bg-[#C9BEFF] text-[#24274A]';

              return (
                <div key={appointment.id} className="rounded-xl border border-[#C9BEFF] bg-white/80 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-[#191D3A]">
                        {new Date(appointment.appointment_date).toLocaleString()}
                      </p>
                      <p className="text-sm pw-subtext mt-1">
                        Vet: {vet?.name || 'Veterinarian'}
                        {vet?.clinic ? ` | ${vet.clinic}` : ''}
                      </p>
                      <p className="text-sm pw-subtext">
                        Pet: {pet?.name || 'Pet'}
                        {appointment.appointment_type ? ` | Type: ${appointment.appointment_type}` : ''}
                      </p>
                    </div>
                    <span className={`self-start rounded-full px-3 py-1 text-sm font-semibold ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <AppointmentMessageThread
                    appointmentId={appointment.id}
                    currentUserId={userId}
                    canMessage={appointment.status === 'confirmed' || appointment.status === 'completed'}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

