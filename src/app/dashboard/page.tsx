'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PetOwnerDashboard from '@/components/forms/PetOwnerDashboard';
import VetDashboard from '@/components/forms/VetDashboard';
import Card from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';

type UserRole = 'pet_owner' | 'vet' | null;

export default function DashboardPage() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (sessionError || !userId) {
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      setRole((profileData?.role as UserRole) || 'pet_owner');
      setLoading(false);
    };

    void loadRole();
  }, []);

  return (
    <DashboardLayout>
      {loading ? (
        <Card>
          <p className="pw-subtext">Loading dashboard...</p>
        </Card>
      ) : role === 'vet' ? (
        <VetDashboard />
      ) : (
        <PetOwnerDashboard />
      )}
    </DashboardLayout>
  );
}
