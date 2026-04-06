import { request, buildQuery } from './http';

export type CoachSpecialization = 'business_development' | 'financial_management' | 'marketing' | 'operations' | 'legal_compliance' | 'digital_transformation' | 'sustainability' | 'general';
export type AssignmentStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'evaluation_completed';
export type SessionType = 'initial' | 'follow_up' | 'review' | 'training' | 'consultation';

export interface Coach {
  id: string;
  user: string;
  organization?: string;
  specialization: CoachSpecialization;
  years_experience?: number;
  bio?: string;
  skills: string[];
  certifications: string[];
  is_certified: boolean;
  is_active: boolean;
  coach_name: string;
  email: string;
  phone: string;
  max_entrepreneurs: number;
  availability_schedule: Record<string, any>;
  preferred_contact_method: 'phone' | 'whatsapp' | 'email';
  success_rate?: number;
  average_rating?: number;
  current_entrepreneurs_count: number;
  available_slots: number;
  is_available: boolean;
  total_sessions: number;
  completed_sessions: number;
  created_at: string;
  updated_at: string;
}

export interface CoachAssignment {
  id: string;
  coach: string;
  entrepreneur: string;
  status: AssignmentStatus;
  start_date: string;
  end_date?: string;
  objectives?: string;
  progress_notes?: string;
  initial_assessment?: string;
  final_assessment?: string;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoachingSession {
  id: string;
  assignment: string;
  coach: string;
  entrepreneur: string;
  session_type: SessionType;
  status: SessionStatus;
  scheduled_date: string;
  duration_minutes: number;
  actual_start_time?: string;
  actual_end_time?: string;
  agenda?: string;
  notes?: string;
  action_items: string[];
  entrepreneur_rating?: number;
  coach_rating?: number;
  feedback?: string;
  is_overdue: boolean;
  actual_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface CoachPerformance {
  coach_id: string;
  total_entrepreneurs: number;
  active_assignments: number;
  total_sessions: number;
  completed_sessions: number;
  success_rate: number;
  average_rating: number;
  satisfaction_score: number;
}

export interface CoachCreate {
  user: string;
  organization?: string;
  specialization: CoachSpecialization;
  years_experience?: number;
  bio?: string;
  skills?: string[];
  certifications?: string[];
  is_certified?: boolean;
  is_active?: boolean;
  max_entrepreneurs?: number;
  availability_schedule?: Record<string, any>;
  preferred_contact_method?: 'phone' | 'whatsapp' | 'email';
}

export interface AssignmentCreate {
  coach: string;
  entrepreneur: string;
  start_date: string;
  end_date?: string;
  objectives?: string;
}

export interface SessionCreate {
  assignment: string;
  session_type: SessionType;
  scheduled_date: string;
  duration_minutes: number;
  agenda?: string;
}

export const CoachingService = {
  // Coaches
  async listCoaches(params?: Record<string, any>) {
    return request(`/coaching/${buildQuery(params)}`);
  },

  async getCoach(coachId: string) {
    return request(`/coaching/${coachId}/`);
  },

  async createCoach(data: CoachCreate) {
    return request(`/coaching/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateCoach(coachId: string, data: Partial<Coach>) {
    return request(`/coaching/${coachId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteCoach(coachId: string) {
    return request(`/coaching/${coachId}/`, {
      method: 'DELETE',
    });
  },

  async getCoachPerformance(coachId: string): Promise<CoachPerformance> {
    return request(`/coaching/${coachId}/performance/`);
  },

  async getCoachEntrepreneurs(coachId: string) {
    return request(`/coaching/${coachId}/entrepreneurs/`);
  },

  // Assignations
  async listAssignments(params?: Record<string, any>) {
    return request(`/coaching/assignments/${buildQuery(params)}`);
  },

  async getAssignment(assignmentId: string) {
    return request(`/coaching/assignments/${assignmentId}/`);
  },

  async createAssignment(data: AssignmentCreate) {
    return request(`/coaching/assignments/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateAssignment(assignmentId: string, data: Partial<CoachAssignment>) {
    return request(`/coaching/assignments/${assignmentId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteAssignment(assignmentId: string) {
    return request(`/coaching/assignments/${assignmentId}/`, {
      method: 'DELETE',
    });
  },

  async completeAssignment(assignmentId: string) {
    return request(`/coaching/assignments/${assignmentId}/complete/`, {
      method: 'POST',
    });
  },

  // Sessions de coaching
  async listSessions(params?: Record<string, any>) {
    return request(`/coaching/sessions/${buildQuery(params)}`);
  },

  async getSession(sessionId: string) {
    return request(`/coaching/sessions/${sessionId}/`);
  },

  async createSession(data: SessionCreate) {
    return request(`/coaching/sessions/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateSession(sessionId: string, data: Partial<CoachingSession>) {
    return request(`/coaching/sessions/${sessionId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteSession(sessionId: string) {
    return request(`/coaching/sessions/${sessionId}/`, {
      method: 'DELETE',
    });
  },

  async startSession(sessionId: string) {
    return request(`/coaching/sessions/${sessionId}/start/`, {
      method: 'POST',
    });
  },

  async completeSession(sessionId: string, notes?: string, coachRating?: number, feedback?: string) {
    return request(`/coaching/sessions/${sessionId}/evaluation-completed-by-entrepreneur/`, {
      method: 'POST',
      body: { feedback, coach_rating: coachRating },
    });
  },

  async sessionAction(sessionId: string, action: 'start' | 'complete' | 'cancel', notes?: string, entrepreneurRating?: number, feedback?: string) {
    return request(`/coaching/sessions/${sessionId}/action/`, {
      method: 'POST',
      body: { action, notes, entrepreneur_rating: entrepreneurRating, feedback },
    });
  },
};






