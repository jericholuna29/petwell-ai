'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Pet {
  id: string;
  name: string;
  species: string;
  age: number | null;
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
}

interface ConsultationHistoryEntry {
  id: string;
  created_at: string;
  pet_name: string;
  pet_type: 'dog' | 'cat';
  pet_age: number;
  symptoms: string;
  severity: 'low' | 'medium' | 'high';
}

export default function PetOwnerDashboard() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [consultationHistory, setConsultationHistory] = useState<ConsultationHistoryEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);

        // Get current user
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          toast.error('Not authenticated');
          setLoading(false);
          return;
        }

        const userId = authData.user.id;

        // Fetch user's pets
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('id, name, species, age')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false });

        if (!petsError) {
          setPets(petsData || []);
        }

        // Fetch user's consultations
        const { data: consultationsData, error: consultationsError } = await supabase
          .from('ai_consultations')
          .select('id, created_at, pet_name, pet_type, pet_age, symptoms, severity')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!consultationsError) {
          setConsultationHistory(consultationsData || []);
        }

        // Fetch user's upcoming appointments
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select('id, appointment_date, status')
          .eq('pet_owner_id', userId)
          .gte('appointment_date', new Date().toISOString())
          .order('appointment_date', { ascending: true })
          .limit(5);

        if (!appointmentsError) {
          setAppointments(appointmentsData || []);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    void loadUserData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="pw-heading text-3xl mb-2">
          Welcome Back
        </h2>
        <p className="pw-subtext">Manage your pets and consultations</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#FFDBFD] to-[#C9BEFF]">
          <h3 className="text-sm font-medium pw-subtext">My Pets</h3>
          <p className="pw-stat-number mt-2">{pets.length}</p>
          <p className="pw-subtext text-sm mt-1">Active pets</p>
        </Card>
        <Card className="bg-gradient-to-br from-[#C9BEFF] to-[#8494FF]/35">
          <h3 className="text-sm font-medium pw-subtext">Consultations</h3>
          <p className="pw-stat-number mt-2">{consultationHistory.length}</p>
          <p className="pw-subtext text-sm mt-1">Total consultations</p>
        </Card>
        <Card className="bg-gradient-to-br from-[#FFDBFD] to-[#8494FF]/35">
          <h3 className="text-sm font-medium pw-subtext">Appointments</h3>
          <p className="pw-stat-number mt-2">{appointments.length}</p>
          <p className="pw-subtext text-sm mt-1">Upcoming</p>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <h3 className="text-xl font-bold text-[#191D3A] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/consultation">
            <Button variant="primary" className="w-full">
              New Consultation
            </Button>
          </Link>
          <Link href="/pets/add">
            <Button variant="secondary" className="w-full">
              My Pet
            </Button>
          </Link>
          <Link href="/appointments">
            <Button variant="secondary" className="w-full">
              View Appointments
            </Button>
          </Link>
        </div>
      </Card>

      {/* Recent Consultations */}
      <Card>
        <h3 className="text-xl font-bold text-[#191D3A] mb-4">Recent Consultations</h3>
        {consultationHistory.length === 0 ? (
          <p className="pw-subtext">No consultations recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {consultationHistory.map((entry) => (
              <Link
                key={entry.id}
                href={`/profile?section=recent-consultations&consultationId=${encodeURIComponent(entry.id)}`}
                className="block border-b pb-4 last:border-0"
              >
                <div className="flex justify-between items-start rounded-lg px-1 py-1 transition hover:bg-[#FFDBFD]/35">
                  <div>
                    <p className="font-semibold text-[#191D3A]">
                      {entry.pet_name} - {entry.symptoms}
                    </p>
                    <p className="text-sm pw-subtext">{new Date(entry.created_at).toLocaleString()}</p>
                    <p className="mt-1 text-xs font-semibold text-[#6367FF]">Open in Profile Recent Consultations</p>
                  </div>
                  <span className="px-3 py-1 bg-[#C9BEFF] text-[#24274A] rounded-full text-sm font-semibold">
                    {entry.severity.charAt(0).toUpperCase() + entry.severity.slice(1)} Risk
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

