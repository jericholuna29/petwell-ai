'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface AppointmentMessageRow {
  id: string;
  appointment_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface SenderRow {
  id: string;
  full_name: string | null;
  email: string;
}

interface AppointmentMessageThreadProps {
  appointmentId: string;
  currentUserId: string | null;
  canMessage: boolean;
}

export default function AppointmentMessageThread({
  appointmentId,
  currentUserId,
  canMessage,
}: AppointmentMessageThreadProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<AppointmentMessageRow[]>([]);
  const [sendersById, setSendersById] = useState<Record<string, SenderRow>>({});

  const loadMessages = async () => {
    if (!appointmentId) {
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('appointment_messages')
      .select('id, appointment_id, sender_id, message, created_at')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error(error.message || 'Failed to load appointment messages');
      setMessages([]);
      setSendersById({});
      setLoading(false);
      return;
    }

    const rows = (data || []) as AppointmentMessageRow[];
    setMessages(rows);

    if (currentUserId) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', currentUserId)
        .eq('appointment_id', appointmentId)
        .eq('is_read', false);
    }

    const senderIds = Array.from(new Set(rows.map((row) => row.sender_id)));
    if (!senderIds.length) {
      setSendersById({});
      setLoading(false);
      return;
    }

    const { data: senderData, error: senderError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', senderIds);

    if (senderError) {
      toast.error(senderError.message || 'Failed to load message sender details');
      setSendersById({});
      setLoading(false);
      return;
    }

    const senderMap: Record<string, SenderRow> = {};
    ((senderData || []) as SenderRow[]).forEach((sender) => {
      senderMap[sender.id] = sender;
    });

    setSendersById(senderMap);
    setLoading(false);
  };

  useEffect(() => {
    void loadMessages();
  }, [appointmentId, currentUserId]);

  const canSend = useMemo(() => {
    return Boolean(currentUserId && canMessage && messageInput.trim().length > 0);
  }, [currentUserId, canMessage, messageInput]);

  const handleSendMessage = async () => {
    const text = messageInput.trim();

    if (!currentUserId) {
      toast.error('Please sign in to send messages');
      return;
    }

    if (!canMessage) {
      toast.error('Messaging is available after appointment approval');
      return;
    }

    if (!text) {
      return;
    }

    setSending(true);

    const { error } = await supabase.from('appointment_messages').insert([
      {
        appointment_id: appointmentId,
        sender_id: currentUserId,
        message: text,
      },
    ]);

    if (error) {
      toast.error(error.message || 'Failed to send message');
      setSending(false);
      return;
    }

    setMessageInput('');
    await loadMessages();
    setSending(false);
  };

  return (
    <div className="mt-4 rounded-xl border border-[#C9BEFF] bg-white/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-[#191D3A]">Appointment Messages</h4>
        <button
          type="button"
          className="text-xs font-semibold text-[#6367FF] hover:underline"
          onClick={() => void loadMessages()}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm pw-subtext">Loading messages...</p>
      ) : messages.length === 0 ? (
        <p className="text-sm pw-subtext">No messages yet.</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {messages.map((item) => {
            const isMine = currentUserId === item.sender_id;
            const sender = sendersById[item.sender_id];
            const senderName = sender?.full_name?.trim() || sender?.email || 'User';

            return (
              <div
                key={item.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    isMine
                      ? 'bg-[#8494FF] text-white'
                      : 'bg-[#FFDBFD] text-[#24274A]'
                  }`}
                >
                  <p className="mb-1 text-xs font-semibold opacity-90">{senderName}</p>
                  <p>{item.message}</p>
                  <p className="mt-1 text-[11px] opacity-80">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 space-y-2">
        <textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          className="w-full rounded-lg border border-[#C9BEFF] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8494FF]/60"
          rows={3}
          placeholder={canMessage ? 'Type your message...' : 'Messaging unlocks after vet approval'}
          disabled={!canMessage}
        />
        <Button
          size="sm"
          variant="primary"
          onClick={handleSendMessage}
          loading={sending}
          disabled={!canSend}
        >
          Send Message
        </Button>
      </div>
    </div>
  );
}