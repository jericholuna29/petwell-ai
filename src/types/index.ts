export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'pet_owner' | 'vet';
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  age?: number;
  breed?: string;
  weight?: number;
  medical_history?: string;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: string;
  pet_id: string;
  owner_id: string;
  symptoms: string;
  ai_response: AIResponse;
  risk_level: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface AIResponse {
  possible_illnesses: string[];
  tips: string[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface Appointment {
  id: string;
  consultation_id: string;
  pet_owner_id: string;
  vet_id: string;
  appointment_date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface AppointmentMessage {
  id: string;
  appointment_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  recipient_id: string;
  appointment_id?: string;
  message_id?: string;
  notification_type: 'new_message' | 'appointment_request' | 'appointment_update';
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface VetProfile extends User {
  specializations?: string[];
  experience_years?: number;
  consultation_fee?: number;
  availability?: string;
}

export interface PetOwnerProfile extends User {
  address?: string;
  city?: string;
  country?: string;
}
