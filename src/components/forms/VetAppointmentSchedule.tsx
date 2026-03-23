'use client';

import { useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface AppointmentRow {
  id: string;
  pet_owner_id: string;
  pet_id: string;
  appointment_date: string;
  appointment_type: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
}

interface PetRow {
  id: string;
  name: string;
  species: string;
}

interface OwnerRow {
  id: string;
  full_name: string | null;
  email: string;
}

export default function VetAppointmentSchedule() {
  const [loading, setLoading] = useState(true);
  const [vetId, setVetId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [petsById, setPetsById] = useState<Record<string, PetRow>>({});
  const [ownersById, setOwnersById] = useState<Record<string, OwnerRow>>({});

  useEffect(() => {
    const loadSchedule = async () => {
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        toast.error('Please sign in to view your appointment schedule');
        setLoading(false);
        return;
      }

      setVetId(authData.user.id);

      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('id, pet_owner_id, pet_id, appointment_date, appointment_type, status, notes')
        .eq('vet_id', authData.user.id)
        .order('appointment_date', { ascending: true });

      if (appointmentError) {
        toast.error(appointmentError.message || 'Failed to load appointment schedule');
        setAppointments([]);
        setLoading(false);
        return;
      }

      const rows = (appointmentData || []) as AppointmentRow[];
      setAppointments(rows);

      if (!rows.length) {
        setPetsById({});
        setOwnersById({});
        setLoading(false);
        return;
      }

      const petIds = Array.from(new Set(rows.map((item) => item.pet_id)));
      const ownerIds = Array.from(new Set(rows.map((item) => item.pet_owner_id)));

      const [{ data: petData, error: petError }, { data: ownerData, error: ownerError }] =
        await Promise.all([
          supabase.from('pets').select('id, name, species').in('id', petIds),
          supabase.from('profiles').select('id, full_name, email').in('id', ownerIds),
        ]);

      if (petError) {
        toast.error(petError.message || 'Failed to load pet details');
      }

      if (ownerError) {
        toast.error(ownerError.message || 'Failed to load pet owner details');
      }

      const petsMap: Record<string, PetRow> = {};
      ((petData || []) as PetRow[]).forEach((pet) => {
        petsMap[pet.id] = pet;
      });

      const ownersMap: Record<string, OwnerRow> = {};
      ((ownerData || []) as OwnerRow[]).forEach((owner) => {
        ownersMap[owner.id] = owner;
      });

      setPetsById(petsMap);
      setOwnersById(ownersMap);
      setLoading(false);
    };

    void loadSchedule();
  }, []);

  const handleStatusUpdate = async (
    appointmentId: string,
    nextStatus: 'confirmed' | 'cancelled'
  ) => {
    if (!vetId) {
      toast.error('Unable to verify veterinarian account');
      return;
    }

    setUpdatingId(appointmentId);

    const { error } = await supabase
      .from('appointments')
      .update({ status: nextStatus })
      .eq('id', appointmentId)
      .eq('vet_id', vetId);

    if (error) {
      toast.error(error.message || 'Failed to update appointment status');
      setUpdatingId(null);
      return;
    }

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId
          ? { ...appointment, status: nextStatus }
          : appointment
      )
    );

    toast.success(
      nextStatus === 'confirmed'
        ? 'Appointment approved successfully'
        : 'Appointment declined successfully'
    );
    setUpdatingId(null);
  };

  const groupedAppointments = useMemo(() => {
    return appointments.reduce<Record<string, AppointmentRow[]>>((acc, appointment) => {
      const key = new Date(appointment.appointment_date).toLocaleDateString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(appointment);
      return acc;
    }, {});
  }, [appointments]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <Card>
        <h2 className="text-3xl font-bold text-[#191D3A] mb-2">Appointment Schedule</h2>
        <p className="pw-subtext">
          Appointments booked by pet owners for your veterinary clinic.
        </p>
      </Card>

      <Card>
        {loading ? (
          <p className="pw-subtext">Loading appointment schedule...</p>
        ) : appointments.length === 0 ? (
          <p className="pw-subtext">No appointments yet.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAppointments).map(([dateLabel, dayAppointments]) => (
              <div key={dateLabel} className="space-y-3">
                <h3 className="text-lg font-bold text-[#191D3A]">{dateLabel}</h3>
                {dayAppointments.map((appointment) => {
                  const pet = petsById[appointment.pet_id];
                  const owner = ownersById[appointment.pet_owner_id];

                  return (
                    <div
                      key={appointment.id}
                      className="rounded-xl border border-[#C9BEFF] bg-gradient-to-br from-[#FFDBFD]/55 to-white/80 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-[#191D3A]">
                            {new Date(appointment.appointment_date).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' • '}
                            {pet?.name || 'Pet'}
                          </p>
                          <p className="text-sm pw-subtext mt-1">
                            Owner: {owner?.full_name?.trim() || owner?.email || 'Unknown'}
                          </p>
                          <p className="text-sm pw-subtext">
                            Type: {appointment.appointment_type || 'consultation'}
                            {pet?.species ? ` | Species: ${pet.species}` : ''}
                          </p>
                          {appointment.notes && (
                            <p className="text-sm text-[#32375D] mt-2">Notes: {appointment.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-start gap-2">
                          <span className="self-start rounded-full bg-[#C9BEFF] px-3 py-1 text-sm font-semibold text-[#24274A]">
                            {appointment.status}
                          </span>
                          {appointment.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                loading={updatingId === appointment.id}
                                onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={updatingId === appointment.id}
                                onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                              >
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
