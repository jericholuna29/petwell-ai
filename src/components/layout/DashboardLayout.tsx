"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

type UserRole = 'pet_owner' | 'vet' | null;

interface NavItem {
  href: string;
  label: string;
  badgeCount?: number;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (sessionError || !userId) {
        setRole('pet_owner');
        return;
      }

      setUserId(userId);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      setRole((profileData?.role as UserRole) || 'pet_owner');
    };

    void loadRole();
  }, []);

  useEffect(() => {
    const loadUnreadNotifications = async () => {
      if (!userId) {
        setUnreadNotifications(0);
        return;
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) {
        return;
      }

      setUnreadNotifications(count || 0);
    };

    void loadUnreadNotifications();

    if (!userId) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadUnreadNotifications();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [userId]);

  const navLinks: NavItem[] =
    role === 'vet'
      ? [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/appointments', label: 'Appointment Schedule' },
          { href: '/messages', label: 'Messages' },
          {
            href: '/notifications',
            label: 'Notifications',
            badgeCount: unreadNotifications,
          },
          { href: '/profile', label: 'Profile' },
        ]
      : [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/consultation', label: 'Consultation' },
          { href: '/appointments', label: 'Appointments' },
          { href: '/messages', label: 'Messages' },
          {
            href: '/notifications',
            label: 'Notifications',
            badgeCount: unreadNotifications,
          },
          { href: '/profile', label: 'Profile' },
        ];

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

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
      <nav className="sticky top-0 z-30 border-b border-[#C9BEFF]/70 bg-white/78 shadow-[0_8px_30px_rgba(99,103,255,0.08)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image
                src="/Petwellai.svg"
                alt="Petwell AI logo"
                width={56}
                height={56}
                className="h-12 w-12 md:h-14 md:w-14"
                priority
              />
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#8494FF] to-[#6367FF]">
                  Petwell AI
                </h1>
                <p className="hidden md:block text-xs font-semibold uppercase tracking-[0.16em] text-[#5E6288]">
                  Care Platform
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 rounded-2xl border border-[#C9BEFF]/80 bg-white/65 px-2 py-2 text-sm md:text-base">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                    isActiveLink(link.href)
                      ? 'bg-gradient-to-r from-[#8494FF] to-[#6367FF] text-white shadow-[0_8px_18px_rgba(99,103,255,0.28)]'
                      : 'text-[#24274A]/80 hover:bg-[#FFDBFD] hover:text-[#6367FF]'
                  }`}
                >
                  {link.label}
                  {Boolean(link.badgeCount) && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      isActiveLink(link.href)
                        ? 'bg-white/25 text-white'
                        : 'bg-[#6367FF] text-white'
                    }`}>
                      {link.badgeCount}
                    </span>
                  )}
                </Link>
              ))}
              <button
                className="ml-1 rounded-xl border border-[#C9BEFF] bg-white px-3 py-2 text-sm font-semibold text-[#24274A] transition-all duration-200 hover:border-[#8494FF] hover:text-[#6367FF] disabled:opacity-60"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>

            <button
              type="button"
              className="relative md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#C9BEFF] bg-white/85 text-[#24274A] transition-all duration-200 hover:bg-[#FFDBFD]"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close dashboard navigation' : 'Open dashboard navigation'}
            >
              <span className="sr-only">{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-[#6367FF] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
              <span className="flex h-4 w-5 flex-col justify-between">
                <span
                  className={`h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${
                    mobileMenuOpen ? 'translate-y-[7px] rotate-45' : ''
                  }`}
                />
                <span
                  className={`h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${
                    mobileMenuOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${
                    mobileMenuOpen ? '-translate-y-[7px] -rotate-45' : ''
                  }`}
                />
              </span>
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="mt-3 md:hidden rounded-2xl border border-[#C9BEFF] bg-white p-3 shadow-[0_14px_30px_rgba(99,103,255,0.16)]">
              <div className="mb-2 px-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6367FF]">Menu</p>
                <p className="text-xs text-[#5E6288]">Quick navigation</p>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#E2DDFF] bg-[#FCFBFF]">
                {navLinks.map((link, index) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center justify-between px-3 py-3 text-sm font-semibold transition-colors duration-200 ${
                      isActiveLink(link.href)
                        ? 'bg-[#E7E2FF] text-[#3F45A2]'
                        : 'text-[#24274A] hover:bg-[#F4F1FF]'
                    } ${index !== navLinks.length - 1 ? 'border-b border-[#ECE9FF]' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>{link.label}</span>
                    <span className="flex items-center gap-2">
                      {Boolean(link.badgeCount) && (
                        <span className="rounded-full bg-[#6367FF] px-2 py-0.5 text-[10px] font-bold text-white">
                          {link.badgeCount}
                        </span>
                      )}
                      <span className="text-xs text-[#8C8FB8]">&gt;</span>
                    </span>
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
