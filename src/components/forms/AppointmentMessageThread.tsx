'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Delete this message?')) {
      return;
    }

    try {
      const { error } = await supabase.from('appointment_messages').delete().eq('id', messageId);

      if (error) {
        throw error;
      }

      toast.success('Message deleted');
      await loadMessages();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete message');
    }
  };

  const getAvatarInitials = (sender: SenderRow | undefined) => {
    if (!sender) return '?';
    const name = sender.full_name || sender.email;
    return name
      ?.split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 px-2 py-4 lg:px-4">
        {loading ? (
          <p className="text-center text-sm pw-subtext">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-center pw-subtext">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((item) => {
              const isMine = currentUserId === item.sender_id;
              const sender = sendersById[item.sender_id];

              return (
                <div key={item.id} className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'} group`}>
                  {/* Avatar - only for incoming messages */}
                  {!isMine && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8494FF] to-[#6367FF] text-xs font-bold text-white">
                      {getAvatarInitials(sender)}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm break-words ${
                      isMine ? 'bg-[#6367FF] text-white' : 'bg-[#E8E8E8] text-[#191D3A]'
                    }`}
                  >
                    <p className="leading-relaxed">{item.message}</p>
                    <p
                      className={`mt-1 text-xs ${
                        isMine ? 'text-white/70' : 'text-[#24274A]/60'
                      }`}
                    >
                      {formatMessageTime(item.created_at)}
                    </p>
                  </div>

                  {/* Delete button - only for outgoing messages */}
                  {isMine && (
                    <button
                      onClick={() => handleDeleteMessage(item.id)}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-red-500 hover:text-red-700 transition-opacity text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input Area */}
      <div className="border-t border-[#E2DDFF] bg-white/90 backdrop-blur-sm px-2 py-3 lg:px-4">
        {!canMessage && (
          <p className="mb-3 text-center text-xs pw-subtext">
            Messaging unlocks after vet approves the appointment
          </p>
        )}

        <div className="flex items-end gap-2">
          {/* Text Input */}
          <div className="flex-1">
            <textarea
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && canSend) {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
              className="w-full rounded-full border border-[#D7D0FF] bg-white px-4 py-2 text-sm placeholder-[#8494FF] outline-none transition focus:border-[#8494FF] focus:ring-2 focus:ring-[#8494FF]/20 resize-none"
              rows={1}
              placeholder={canMessage ? 'Message...' : 'Locked'}
              disabled={!canMessage}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!canSend}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
              canSend ? 'bg-[#6367FF] text-white hover:bg-[#5558DD]' : 'bg-[#E8E8E8] text-[#8494FF]'
            }`}
            title="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}