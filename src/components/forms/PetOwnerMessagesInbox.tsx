'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import AppointmentMessageThread from '@/components/forms/AppointmentMessageThread';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Search, Trash2, ArrowLeft } from 'lucide-react';

interface AppointmentRow {
  id: string;
  vet_id: string;
  pet_id: string;
  appointment_date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface VetRow {
  id: string;
  full_name: string | null;
  email: string;
}

interface PetRow {
  id: string;
  name: string;
}

interface MessageRow {
  id: string;
  appointment_id: string;
  message: string;
  created_at: string;
  sender_id: string;
}

type FilterTab = 'all' | 'unread' | 'confirmed' | 'completed';

export default function PetOwnerMessagesInbox() {
  const searchParams = useSearchParams();
  const selectedVetId = searchParams.get('vetId');

  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [vetsById, setVetsById] = useState<Record<string, VetRow>>({});
  const [petsById, setPetsById] = useState<Record<string, PetRow>>({});
  const [messagesByAppointment, setMessagesByAppointment] = useState<Record<string, MessageRow[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(selectedVetId);

  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Filter by tab
    if (filterTab === 'unread') {
      // Show only conversations with unread messages
      filtered = filtered.filter((app) => (messagesByAppointment[app.id]?.length || 0) > 0);
    } else if (filterTab === 'confirmed') {
      filtered = filtered.filter((app) => app.status === 'confirmed');
    } else if (filterTab === 'completed') {
      filtered = filtered.filter((app) => app.status === 'completed');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((app) => {
        const vet = vetsById[app.vet_id];
        const pet = petsById[app.pet_id];
        const vetName = (vet?.full_name || vet?.email || '').toLowerCase();
        const petName = (pet?.name || '').toLowerCase();
        return vetName.includes(query) || petName.includes(query);
      });
    }

    // Sort by most recent first
    return [...filtered].sort((a, b) => {
      const aMessages = messagesByAppointment[a.id] || [];
      const bMessages = messagesByAppointment[b.id] || [];
      const aTime = aMessages.length > 0 ? new Date(aMessages[0].created_at).getTime() : new Date(a.appointment_date).getTime();
      const bTime = bMessages.length > 0 ? new Date(bMessages[0].created_at).getTime() : new Date(b.appointment_date).getTime();
      return bTime - aTime;
    });
  }, [appointments, messagesByAppointment, searchQuery, filterTab, vetsById, petsById]);

  useEffect(() => {
    const loadInbox = async () => {
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        toast.error('Please sign in to view messages');
        setLoading(false);
        return;
      }

      setOwnerId(authData.user.id);

      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('id, vet_id, pet_id, appointment_date, status')
        .eq('pet_owner_id', authData.user.id)
        .in('status', ['confirmed', 'completed'])
        .order('appointment_date', { ascending: false });

      if (appointmentError) {
        toast.error(appointmentError.message || 'Failed to load message inbox');
        setLoading(false);
        return;
      }

      const rows = (appointmentData || []) as AppointmentRow[];
      setAppointments(rows);

      if (!rows.length) {
        setVetsById({});
        setPetsById({});
        setMessagesByAppointment({});
        setLoading(false);
        return;
      }

      const vetIds = Array.from(new Set(rows.map((item) => item.vet_id)));
      const petIds = Array.from(new Set(rows.map((item) => item.pet_id)));
      const appointmentIds = rows.map((item) => item.id);

      const [
        { data: vetData, error: vetError },
        { data: petData, error: petError },
        { data: messageData, error: messageError },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').in('id', vetIds),
        supabase.from('pets').select('id, name').in('id', petIds),
        supabase
          .from('appointment_messages')
          .select('id, appointment_id, message, created_at, sender_id')
          .in('appointment_id', appointmentIds)
          .order('created_at', { ascending: false }),
      ]);

      if (vetError) {
        toast.error(vetError.message || 'Failed to load veterinarian details');
      }

      if (petError) {
        toast.error(petError.message || 'Failed to load pet details');
      }

      if (messageError) {
        toast.error(messageError.message || 'Failed to load messages');
      }

      const vetsMap: Record<string, VetRow> = {};
      ((vetData || []) as VetRow[]).forEach((vet) => {
        vetsMap[vet.id] = vet;
      });

      const petsMap: Record<string, PetRow> = {};
      ((petData || []) as PetRow[]).forEach((pet) => {
        petsMap[pet.id] = pet;
      });

      const messageMap: Record<string, MessageRow[]> = {};
      ((messageData || []) as MessageRow[]).forEach((message) => {
        if (!messageMap[message.appointment_id]) {
          messageMap[message.appointment_id] = [];
        }
        messageMap[message.appointment_id].push(message);
      });

      setVetsById(vetsMap);
      setPetsById(petsMap);
      setMessagesByAppointment(messageMap);
      setLoading(false);
    };

    void loadInbox();
  }, []);

  const handleDeleteConversation = async (appointmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);

      if (error) {
        throw error;
      }

      toast.success('Conversation deleted');
      setAppointments((current) => current.filter((appointment) => appointment.id !== appointmentId));
      if (selectedConversation === appointmentId) {
        setSelectedConversation(null);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete conversation');
    }
  };

  const getAvatarInitials = (vet: VetRow | undefined | null) => {
    if (!vet) return '?';
    const name = vet.full_name || vet.email;
    return name
      ?.split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  const getLastMessagePreview = (appointmentId: string) => {
    const messages = messagesByAppointment[appointmentId] || [];
    if (messages.length === 0) return 'No messages yet';
    const lastMessage = messages[0];
    return lastMessage.message.length > 40 ? lastMessage.message.slice(0, 40) + '...' : lastMessage.message;
  };

  const getMessageTime = (appointmentId: string) => {
    const messages = messagesByAppointment[appointmentId] || [];
    if (messages.length === 0) return '';
    const time = new Date(messages[0].created_at);
    const now = new Date();
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return time.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Card>
          <p className="pw-subtext">Loading messages...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-[#191D3A]">Messages</h1>
        <p className="pw-subtext">Connect with your veterinarian and manage all your conversations.</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3 h-5 w-5 text-[#8494FF]" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-[#D7D0FF] bg-white pl-10 pr-4 py-3 outline-none transition focus:border-[#8494FF] focus:ring-2 focus:ring-[#8494FF]/20"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'unread', 'confirmed', 'completed'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              filterTab === tab
                ? 'bg-[#6367FF] text-white'
                : 'border border-[#D7D0FF] bg-white text-[#191D3A] hover:border-[#8494FF]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card className="max-h-[600px] space-y-2 overflow-y-auto">
            {filteredAppointments.length === 0 ? (
              <div className="space-y-3 text-center py-8">
                <p className="pw-subtext">No conversations found.</p>
                <Link href="/appointments" className="inline-block text-sm font-semibold text-[#6367FF] hover:underline">
                  Book an appointment
                </Link>
              </div>
            ) : (
              filteredAppointments.map((appointment) => {
                const vet = vetsById[appointment.vet_id];
                const isSelected = selectedConversation === appointment.id;
                const messageCount = messagesByAppointment[appointment.id]?.length || 0;

                return (
                  <button
                    key={appointment.id}
                    onClick={() => setSelectedConversation(appointment.id)}
                    className={`w-full rounded-2xl border-2 p-3 text-left transition ${
                      isSelected
                        ? 'border-[#8494FF] bg-[#EDE9FF]'
                        : 'border-transparent bg-white/70 hover:bg-white'
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8494FF] to-[#6367FF] text-sm font-bold text-white">
                        {getAvatarInitials(vet)}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-[#191D3A]">
                            {vet?.full_name?.trim() || vet?.email || 'Veterinarian'}
                          </p>
                          <span className="flex-shrink-0 text-xs text-[#5E6288]">{getMessageTime(appointment.id)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-[#5E6288]">
                          {petsById[appointment.pet_id]?.name || 'Pet'} • {getLastMessagePreview(appointment.id)}
                        </p>
                        {messageCount > 0 && (
                          <div className="mt-2 inline-flex rounded-full bg-[#6367FF] px-2 py-1 text-xs font-semibold text-white">
                            {messageCount} {messageCount === 1 ? 'message' : 'messages'}
                          </div>
                        )}
                      </div>

                      {/* Unread Indicator */}
                      {messageCount > 0 && (
                        <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-[#6367FF]" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </Card>
        </div>

        {/* Chat Thread */}
        <div className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            (() => {
              const appointment = appointments.find((app) => app.id === selectedConversation);
              const vet = appointment ? vetsById[appointment.vet_id] : null;
              const pet = appointment ? petsById[appointment.pet_id] : null;

              return (
                <Card className="flex flex-col h-[600px] p-0 overflow-hidden">
                  {/* Chat Header */}
                  <div className="flex items-center justify-between border-b border-[#E2DDFF] px-6 py-4">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => setSelectedConversation(null)}
                        className="rounded-lg p-2 text-[#8494FF] hover:bg-[#EDE9FF] transition lg:hidden"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#8494FF] to-[#6367FF] text-xs font-bold text-white">
                        {getAvatarInitials(vet)}
                      </div>
                      <div>
                        <p className="font-semibold text-[#191D3A]">
                          {vet?.full_name?.trim() || vet?.email || 'Veterinarian'}
                        </p>
                        <p className="text-xs text-[#5E6288]">
                          {pet?.name || 'Pet'} • {appointment ? new Date(appointment.appointment_date).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(selectedConversation, e)}
                      className="rounded-lg p-2 text-[#C9BEFF] hover:bg-[#FFDBFD] hover:text-red-500 transition"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Message Thread */}
                  {appointment && (
                    <div className="flex-1 overflow-hidden">
                      <AppointmentMessageThread
                        appointmentId={appointment.id}
                        currentUserId={ownerId}
                        canMessage={appointment.status === 'confirmed' || appointment.status === 'completed'}
                      />
                    </div>
                  )}
                </Card>
              );
            })()
          ) : (
            <Card className="flex items-center justify-center py-16">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#191D3A]">No conversation selected</p>
                <p className="mt-2 pw-subtext">Select a conversation from the list to start chatting.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}