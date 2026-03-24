'use client';

import { useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
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

export default function VetDashboard() {
  const [loading, setLoading] = useState(true);
  const [vetId, setVetId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [petsById, setPetsById] = useState<Record<string, PetRow>>({});
  const [ownersById, setOwnersById] = useState<Record<string, OwnerRow>>({});

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        toast.error('Please sign in to view veterinarian dashboard');
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
        toast.error(appointmentError.message || 'Failed to load appointment dashboard');
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

    void loadDashboard();
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

    const { data: updatedRow, error } = await supabase
      .from('appointments')
      .update({ status: nextStatus })
      .eq('id', appointmentId)
      .select('id, status')
      .maybeSingle();

    if (error) {
      const errorParts = [error.message, error.details, error.hint, error.code].filter(Boolean);
      toast.error(errorParts.join(' | ') || 'Failed to update appointment status');
      setUpdatingId(null);
      return;
    }

    if (!updatedRow) {
      toast.error('Appointment not found or you are not allowed to update it.');
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

    toast.success(nextStatus === 'confirmed' ? 'Appointment approved' : 'Appointment declined');
    setUpdatingId(null);
  };

  const todayLabel = new Date().toLocaleDateString();

  const stats = useMemo(() => {
    const pending = appointments.filter((item) => item.status === 'pending').length;
    const confirmed = appointments.filter((item) => item.status === 'confirmed').length;
    const todayCount = appointments.filter(
      (item) => new Date(item.appointment_date).toLocaleDateString() === todayLabel
    ).length;
    const uniquePatients = new Set(appointments.map((item) => item.pet_id)).size;

    return { pending, confirmed, todayCount, uniquePatients };
  }, [appointments, todayLabel]);

  const pendingAppointments = useMemo(
    () => appointments.filter((item) => item.status === 'pending').slice(0, 5),
    [appointments]
  );

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter(
          (item) =>
            item.status !== 'cancelled' &&
            new Date(item.appointment_date).toLocaleDateString() === todayLabel
        )
        .slice(0, 6),
    [appointments, todayLabel]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="pw-heading text-3xl mb-2">
          Veterinarian Dashboard
        </h2>
        <p className="pw-subtext">Manage clinic appointment requests and schedule approvals</p>
      </div>

      {loading && (
        <Card>
          <p className="pw-subtext">Loading clinic dashboard...</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#FFDBFD] to-[#C9BEFF]">
          <h3 className="text-sm font-medium pw-subtext">Today's Appointments</h3>
          <p className="pw-stat-number mt-2">{stats.todayCount}</p>
        </Card>
        <Card className="bg-gradient-to-br from-[#C9BEFF] to-[#8494FF]/35">
          <h3 className="text-sm font-medium pw-subtext">Pending Requests</h3>
          <p className="pw-stat-number mt-2">{stats.pending}</p>
        </Card>
        <Card className="bg-gradient-to-br from-[#FFDBFD] to-[#C9BEFF]">
          <h3 className="text-sm font-medium pw-subtext">Active Patients</h3>
          <p className="pw-stat-number mt-2">{stats.uniquePatients}</p>
        </Card>
        <Card className="bg-gradient-to-br from-[#FFDBFD] to-[#8494FF]/35">
          <h3 className="text-sm font-medium pw-subtext">Approved Appointments</h3>
          <p className="pw-stat-number mt-2">{stats.confirmed}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className="text-xl font-bold text-[#191D3A]">Pending Approval Requests</h3>
          <Link href="/appointments" className="text-sm font-semibold text-[#6367FF] hover:underline">
            View Full Schedule
          </Link>
        </div>

        {pendingAppointments.length === 0 ? (
          <p className="pw-subtext">No pending requests.</p>
        ) : (
          <div className="space-y-4">
            {pendingAppointments.map((appointment) => {
              const pet = petsById[appointment.pet_id];
              const owner = ownersById[appointment.pet_owner_id];

              return (
                <div key={appointment.id} className="rounded-xl border border-[#C9BEFF] bg-white/80 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-[#191D3A]">
                        {new Date(appointment.appointment_date).toLocaleString()}
                      </p>
                      <p className="text-sm pw-subtext mt-1">
                        Pet: {pet?.name || 'Pet'}
                        {pet?.species ? ` (${pet.species})` : ''}
                      </p>
                      <p className="text-sm pw-subtext">
                        Owner: {owner?.full_name?.trim() || owner?.email || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={updatingId === appointment.id}
                        onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={updatingId === appointment.id}
                        onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-xl font-bold text-[#191D3A] mb-4">Today's Schedule</h3>
        {todayAppointments.length === 0 ? (
          <p className="pw-subtext">No appointments scheduled for today.</p>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((appointment) => {
              const pet = petsById[appointment.pet_id];
              const owner = ownersById[appointment.pet_owner_id];

              return (
                <div key={appointment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-semibold text-[#191D3A]">
                      {new Date(appointment.appointment_date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-sm pw-subtext">
                      {pet?.name || 'Pet'} ({owner?.full_name?.trim() || owner?.email || 'Owner'})
                    </p>
                  </div>
                  <span className="rounded-full bg-[#C9BEFF] px-3 py-1 text-sm font-semibold text-[#24274A]">
                    {appointment.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

