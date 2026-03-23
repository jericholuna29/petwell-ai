'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import AppointmentMessageThread from '@/components/forms/AppointmentMessageThread';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface AppointmentRow {
  id: string;
  pet_owner_id: string;
  pet_id: string;
  appointment_date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface PetRow {
  id: string;
  name: string;
}

interface OwnerRow {
  id: string;
  full_name: string | null;
  email: string;
}

interface MessageRow {
  id: string;
  appointment_id: string;
}

type UserRole = 'pet_owner' | 'vet' | null;

export default function VetMessagesInbox() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);
  const [vetId, setVetId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [petsById, setPetsById] = useState<Record<string, PetRow>>({});
  const [ownersById, setOwnersById] = useState<Record<string, OwnerRow>>({});
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadInbox = async () => {
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        toast.error('Please sign in to view messages');
        setLoading(false);
        return;
      }

      setVetId(authData.user.id);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        toast.error(profileError.message || 'Failed to verify account role');
        setLoading(false);
        return;
      }

      const currentRole = (profileData?.role as UserRole) || 'pet_owner';
      setRole(currentRole);

      if (currentRole !== 'vet') {
        setLoading(false);
        return;
      }

      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('id, pet_owner_id, pet_id, appointment_date, status')
        .eq('vet_id', authData.user.id)
        .in('status', ['confirmed', 'completed'])
        .order('appointment_date', { ascending: false });

      if (appointmentError) {
        toast.error(appointmentError.message || 'Failed to load message inbox');
        setLoading(false);
        return;
      }

      const rows = (appointmentData || []) as AppointmentRow[];
      setAppointments(rows);

      if (!rows.length) {
        setPetsById({});
        setOwnersById({});
        setMessageCounts({});
        setLoading(false);
        return;
      }

      const petIds = Array.from(new Set(rows.map((item) => item.pet_id)));
      const ownerIds = Array.from(new Set(rows.map((item) => item.pet_owner_id)));
      const appointmentIds = rows.map((item) => item.id);

      const [
        { data: petData, error: petError },
        { data: ownerData, error: ownerError },
        { data: messageData, error: messageError },
      ] = await Promise.all([
        supabase.from('pets').select('id, name').in('id', petIds),
        supabase.from('profiles').select('id, full_name, email').in('id', ownerIds),
        supabase.from('appointment_messages').select('id, appointment_id').in('appointment_id', appointmentIds),
      ]);

      if (petError) {
        toast.error(petError.message || 'Failed to load pet details');
      }

      if (ownerError) {
        toast.error(ownerError.message || 'Failed to load pet owner details');
      }

      if (messageError) {
        toast.error(messageError.message || 'Failed to load message counters');
      }

      const petsMap: Record<string, PetRow> = {};
      ((petData || []) as PetRow[]).forEach((pet) => {
        petsMap[pet.id] = pet;
      });

      const ownersMap: Record<string, OwnerRow> = {};
      ((ownerData || []) as OwnerRow[]).forEach((owner) => {
        ownersMap[owner.id] = owner;
      });

      const counts: Record<string, number> = {};
      ((messageData || []) as MessageRow[]).forEach((message) => {
        counts[message.appointment_id] = (counts[message.appointment_id] || 0) + 1;
      });

      setPetsById(petsMap);
      setOwnersById(ownersMap);
      setMessageCounts(counts);
      setLoading(false);
    };

    void loadInbox();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <Card>
          <p className="pw-subtext">Loading messages...</p>
        </Card>
      </div>
    );
  }

  if (role !== 'vet') {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <Card>
          <h2 className="text-2xl font-bold text-[#191D3A] mb-2">Messages</h2>
          <p className="pw-subtext">This page is available for veterinarian accounts only.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <Card>
        <h2 className="text-3xl font-bold text-[#191D3A] mb-2">Vet Messages</h2>
        <p className="pw-subtext">
          View and respond to appointment messages from pet owners.
        </p>
      </Card>

      <Card>
        {appointments.length === 0 ? (
          <p className="pw-subtext">No approved appointments available for messaging yet.</p>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const pet = petsById[appointment.pet_id];
              const owner = ownersById[appointment.pet_owner_id];
              const totalMessages = messageCounts[appointment.id] || 0;

              return (
                <div key={appointment.id} className="rounded-xl border border-[#C9BEFF] bg-white/80 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-[#191D3A]">
                        Pet Owner: {owner?.full_name?.trim() || owner?.email || 'Owner'}
                      </p>
                      <p className="text-sm pw-subtext mt-1">
                        Pet: {pet?.name || 'Pet'} | Appointment: {new Date(appointment.appointment_date).toLocaleString()}
                      </p>
                    </div>
                    <span className="self-start rounded-full bg-[#C9BEFF] px-3 py-1 text-xs font-semibold text-[#24274A]">
                      Messages: {totalMessages}
                    </span>
                  </div>

                  <AppointmentMessageThread
                    appointmentId={appointment.id}
                    currentUserId={vetId}
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