'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface NotificationRow {
  id: string;
  recipient_id: string;
  appointment_id: string | null;
  notification_type: 'new_message' | 'appointment_request' | 'appointment_update';
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsCenter() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const loadNotifications = async (recipientId?: string) => {
    const targetUserId = recipientId || userId;
    if (!targetUserId) {
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('notifications')
      .select('id, recipient_id, appointment_id, notification_type, title, body, is_read, created_at')
      .eq('recipient_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      toast.error(error.message || 'Failed to load notifications');
      setNotifications([]);
      setLoading(false);
      return;
    }

    setNotifications((data || []) as NotificationRow[]);
    setLoading(false);
  };

  useEffect(() => {
    const initialize = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        toast.error('Please sign in to view notifications');
        setLoading(false);
        return;
      }

      setUserId(authData.user.id);
      await loadNotifications(authData.user.id);
    };

    void initialize();
  }, []);

  const markOneAsRead = async (notificationId: string) => {
    if (!userId) {
      return;
    }

    setUpdating(true);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('recipient_id', userId);

    if (error) {
      toast.error(error.message || 'Failed to update notification');
      setUpdating(false);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      )
    );
    setUpdating(false);
  };

  const markAllAsRead = async () => {
    if (!userId) {
      return;
    }

    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (!unreadIds.length) {
      return;
    }

    setUpdating(true);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .in('id', unreadIds);

    if (error) {
      toast.error(error.message || 'Failed to mark all notifications as read');
      setUpdating(false);
      return;
    }

    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    setUpdating(false);
    toast.success('All notifications marked as read');
  };

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const getNotificationTarget = (item: NotificationRow): string => {
    if (item.notification_type === 'new_message') {
      return '/messages';
    }

    return '/appointments';
  };

  const openNotification = async (item: NotificationRow) => {
    if (!item.is_read) {
      await markOneAsRead(item.id);
    }

    router.push(getNotificationTarget(item));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-[#191D3A]">Notifications</h2>
            <p className="pw-subtext mt-1">Stay updated with new appointment messages.</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={updating || unreadCount === 0}
            onClick={markAllAsRead}
          >
            Mark All Read ({unreadCount})
          </Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <p className="pw-subtext">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="pw-subtext">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${
                  item.is_read
                    ? 'border-[#D8D4F6] bg-white/70'
                    : 'border-[#8494FF] bg-gradient-to-br from-[#FFDBFD] to-white'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#191D3A]">{item.title}</p>
                    <p className="text-sm text-[#32375D] mt-1">{item.body}</p>
                    <p className="text-xs pw-subtext mt-2">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!item.is_read && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={updating}
                      onClick={() => void markOneAsRead(item.id)}
                    >
                      Mark Read
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={updating}
                    onClick={() => void openNotification(item)}
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}