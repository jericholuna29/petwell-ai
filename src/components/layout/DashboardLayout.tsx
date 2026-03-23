"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

type UserRole = 'pet_owner' | 'vet' | null;

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (sessionError || !userId) {
        setRole('pet_owner');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      setRole((profileData?.role as UserRole) || 'pet_owner');
    };

    void loadRole();
  }, []);

  const desktopLinks =
    role === 'vet'
      ? [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/appointments', label: 'Appointment Schedule' },
          { href: '/profile', label: 'Profile' },
        ]
      : [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/consultation', label: 'Consultation' },
          { href: '/appointments', label: 'Appointments' },
          { href: '/profile', label: 'Profile' },
        ];

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message || 'Failed to log out');
      setIsLoggingOut(false);
      return;
    }

    toast.success('Logged out successfully');
    router.push('/auth/login');
    router.refresh();
    setIsLoggingOut(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFDBFD] via-[#C9BEFF]/70 to-[#8494FF]/25">
      {/* Navigation */}
      <nav className="sticky top-0 z-20 bg-white/75 backdrop-blur-xl shadow-sm border-b border-[#C9BEFF]">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Image
                src="/Petwellai.svg"
                alt="Petwell AI logo"
                width={56}
                height={56}
                className="h-12 w-12 md:h-14 md:w-14"
                priority
              />
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8494FF] to-[#6367FF]">
                Petwell AI
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm md:text-base">
              {desktopLinks.map((link) => (
                <Link key={link.href} href={link.href} className="pw-nav-link">
                  {link.label}
                </Link>
              ))}
              <button
                className="pw-nav-link disabled:opacity-60"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>

            <button
              type="button"
              className="md:hidden rounded-xl border border-[#C9BEFF] bg-white/75 px-3 py-2 text-sm font-semibold text-[#24274A] transition-colors duration-200 hover:bg-[#FFDBFD]"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle dashboard navigation"
            >
              {mobileMenuOpen ? 'Close' : 'Menu'}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="mt-3 md:hidden rounded-2xl border border-[#C9BEFF] bg-white/80 p-3 shadow-sm">
              <div className="grid grid-cols-2 gap-2 text-sm font-medium">
                {desktopLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="pw-mobile-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <button
                className="mt-2 w-full rounded-lg bg-gradient-to-r from-[#8494FF] to-[#6367FF] px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:brightness-105 hover:shadow-[0_10px_20px_rgba(99,103,255,0.24)] disabled:opacity-60"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
