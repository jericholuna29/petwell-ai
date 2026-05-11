'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChatDots, Person, Envelope, Bell, Calendar, House } from 'react-bootstrap-icons';
import { supabase } from '@/lib/supabase';

type UserRole = 'pet_owner' | 'vet' | null;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const loadCounts = async (currentUserId: string) => {
    // Load all unread notifications
    const { count: notifCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', currentUserId)
      .eq('is_read', false);

    const totalUnread = notifCount || 0;

    // Count unread message notifications separately
    const { count: msgNotifCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', currentUserId)
      .eq('is_read', false)
      .eq('notification_type', 'new_message');

    setUnreadNotifications(totalUnread - (msgNotifCount || 0));
    setUnreadMessages(msgNotifCount || 0);
  };

  useEffect(() => {
    const loadRole = async () => {
      setMounted(false);
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData.session?.user?.id;

      if (!currentUserId) {
        setRole('pet_owner');
        setUserId(null);
        setMounted(true);
        return;
      }

      setUserId(currentUserId);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUserId)
        .single();

      const userRole = (profileData?.role as UserRole) || 'pet_owner';
      setRole(userRole);
      await loadCounts(currentUserId);
      setMounted(true);
    };

    void loadRole();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void loadRole();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Set up real-time subscriptions for notifications and messages
  useEffect(() => {
    if (!userId) return;

    // Subscribe to notifications changes
    const notificationsChannel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          void (async () => {
            await loadCounts(userId);
          })();
        }
      )
      .subscribe();

    // Subscribe to messages changes
    const messagesChannel = supabase
      .channel(`messages_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointment_messages',
        },
        () => {
          void (async () => {
            await loadCounts(userId);
          })();
        }
      )
      .subscribe();

    return () => {
      notificationsChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, [userId, role]);

  // Pet owner navigation items
  const petOwnerNavItems = [
    {
      label: 'Profile',
      href: '/profile',
      icon: Person,
      color: '#8494FF',
      badge: false,
    },
    {
      label: 'Messages',
      href: '/messages',
      icon: Envelope,
      color: '#A8B5FF',
      badge: unreadMessages > 0,
    },
    {
      label: 'Consultation',
      href: '/consultation',
      icon: ChatDots,
      color: '#6367FF',
      badge: false,
    },
    {
      label: 'Notifications',
      href: '/notifications',
      icon: Bell,
      color: '#C9BEFF',
      badge: unreadNotifications > 0,
    },
    {
      label: 'Appointments',
      href: '/appointments',
      icon: Calendar,
      color: '#FFDBFD',
      badge: false,
    },
  ];

  // Vet navigation items
  const vetNavItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: House,
      color: '#8494FF',
      badge: false,
    },
    {
      label: 'Appointments',
      href: '/appointments',
      icon: Calendar,
      color: '#A8B5FF',
      badge: false,
    },
    {
      label: 'Messages',
      href: '/messages',
      icon: Envelope,
      color: '#6367FF',
      badge: unreadMessages > 0,
    },
    {
      label: 'Notifications',
      href: '/notifications',
      icon: Bell,
      color: '#C9BEFF',
      badge: unreadNotifications > 0,
    },
    {
      label: 'Profile',
      href: '/profile',
      icon: Person,
      color: '#FFDBFD',
      badge: false,
    },
  ];

  const navItems = role === 'vet' ? vetNavItems : petOwnerNavItems;

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  if (!mounted) return null;

  return (
    <>
      {/* Bottom spacing for mobile */}
      <div className="md:hidden h-20" />

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50">
        {/* Clean white background with subtle shadow */}
        <div className="absolute inset-0 bg-white border-t border-gray-200" />
        
        <div className="absolute inset-0 shadow-lg shadow-black/5" />

        {/* Navigation items */}
        <div className="relative flex justify-around items-center h-20 px-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center h-full flex-1 transition-all duration-200"
              >
                {/* Icon container */}
                <div className="relative flex items-center justify-center w-10 h-10 mb-1">
                  <IconComponent
                    size={24}
                    className={`transition-colors duration-200 ${
                      active
                        ? 'text-[#6367FF]'
                        : 'text-gray-400'
                    }`}
                  />

                  {/* Notification badge - show if there are unread items */}
                  {item.badge && (
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full" />
                  )}
                </div>


              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
