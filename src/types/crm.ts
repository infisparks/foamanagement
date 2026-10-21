export type UserRole = 'admin' | 'team';

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  designation: string;
  avatar_url?: string;
  password?: string;
  created_at: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  industry?: string;
  notes?: string;
  status: 'active' | 'completed' | 'paused';
  onboarded_by?: string;
  created_at: string;
  updated_at?: string;
  is_deleted?: boolean;
  // Computed fields
  total_tasks?: number;
  completed_tasks?: number;
  pending_tasks?: number;
  delayed_tasks?: number;
}

export interface Task {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  created_by?: string;
  deadline: string;
  status: 'pending' | 'completed';
  completed_at?: string | null;
  is_delayed?: boolean;
  delay_days?: number;
  created_at: string;
  updated_at?: string;
  is_deleted?: boolean;
  // Joined fields
  client?: Client;
  assignee?: Profile;
  creator?: Profile;
  comments_count?: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  is_deleted?: boolean;
  user?: Profile;
}

export interface WhatsAppLog {
  id: string;
  recipient_phone: string;
  recipient_name?: string;
  event_type: string;
  message: string;
  status: 'sent' | 'failed';
  response_data?: any;
  created_at: string;
}
