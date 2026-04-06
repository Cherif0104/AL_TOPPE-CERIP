import { request, buildQuery } from './http';

export type FundingType = 'grant' | 'loan' | 'equity' | 'microcredit' | 'subsidy';
export type ProgramStatus = 'draft' | 'active' | 'paused' | 'closed' | 'completed';
export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'funded';

export interface Bailleur {
  id: string;
  user: string;
  organization_name: string;
  organization_type: string;
  contact_person: string;
  contact_position: string;
  website?: string;
  sectors_supported: string[];
  regions_covered: string[];
  funding_capacity: number;
  is_active: boolean;
  total_funding_provided: number;
  entrepreneurs_supported: number;
  active_programs_count: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

export interface FundingProgram {
  id: string;
  bailleur: string;
  bailleur_name: string;
  program_name: string;
  description: string;
  funding_type: FundingType;
  min_amount: number;
  max_amount: number;
  start_date: string;
  end_date: string;
  application_deadline: string;
  target_sectors: string[];
  target_regions: string[];
  eligibility_criteria: string[];
  required_documents: string[];
  status: ProgramStatus;
  total_applications: number;
  approved_applications: number;
  total_funding_allocated: number;
  is_active: boolean;
  is_accepting_applications: boolean;
  approval_rate: number;
  remaining_budget: number;
  created_at: string;
  updated_at: string;
}

export interface FundingApplication {
  id: string;
  entrepreneur: string;
  entrepreneur_name: string;
  activity: string;
  program: string;
  program_name: string;
  bailleur_name: string;
  requested_amount: number;
  status: ApplicationStatus;
  submitted_at?: string;
  review_date?: string;
  approved_amount?: number;
  rejection_reason?: string;
  business_plan?: string;
  project_description: string;
  expected_impact: string;
  implementation_timeline: string;
  supporting_documents: string[];
  evaluation_score?: number;
  evaluation_notes?: string;
  is_approved: boolean;
  is_rejected: boolean;
  approval_rate: number;
  created_at: string;
  updated_at: string;
}

export interface BailleurImpact {
  bailleur_id: string;
  total_programs: number;
  active_programs: number;
  total_applications: number;
  approved_applications: number;
  total_funding_provided: number;
  entrepreneurs_supported: number;
  approval_rate: number;
  average_funding_amount: number;
}

export interface ProgramStatistics {
  program_id: string;
  total_applications: number;
  approved_applications: number;
  rejected_applications: number;
  pending_applications: number;
  total_funding_allocated: number;
  approval_rate: number;
  average_processing_time: number;
}

export interface BailleurCreate {
  user: string;
  organization_name: string;
  organization_type: string;
  contact_person: string;
  contact_position: string;
  website?: string;
  sectors_supported?: string[];
  regions_covered?: string[];
  funding_capacity?: number;
  is_active?: boolean;
}

export interface ProgramCreate {
  bailleur: string;
  program_name: string;
  description: string;
  funding_type: FundingType;
  min_amount: number;
  max_amount: number;
  start_date: string;
  end_date: string;
  application_deadline: string;
  target_sectors?: string[];
  target_regions?: string[];
  eligibility_criteria?: string[];
  required_documents?: string[];
  status?: ProgramStatus;
}

export interface ApplicationCreate {
  entrepreneur: string;
  activity: string;
  program: string;
  requested_amount: number;
  project_description: string;
  expected_impact: string;
  implementation_timeline: string;
  supporting_documents?: string[];
}

export const BailleursService = {
  // Bailleurs
  async listBailleurs(params?: Record<string, any>) {
    return request(`/bailleurs/${buildQuery(params)}`);
  },

  async getBailleur(bailleurId: string) {
    return request(`/bailleurs/${bailleurId}/`);
  },

  async createBailleur(data: BailleurCreate) {
    return request(`/bailleurs/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateBailleur(bailleurId: string, data: Partial<Bailleur>) {
    return request(`/bailleurs/${bailleurId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteBailleur(bailleurId: string) {
    return request(`/bailleurs/${bailleurId}/`, {
      method: 'DELETE',
    });
  },

  async getBailleurPrograms(bailleurId: string) {
    return request(`/bailleurs/${bailleurId}/programs/`);
  },

  async getBailleurImpact(bailleurId: string): Promise<BailleurImpact> {
    return request(`/bailleurs/${bailleurId}/impact/`);
  },

  // Programmes de financement
  async listPrograms(params?: Record<string, any>) {
    return request(`/bailleurs/programs/${buildQuery(params)}`);
  },

  async getProgram(programId: string) {
    return request(`/bailleurs/programs/${programId}/`);
  },

  async createProgram(data: ProgramCreate) {
    return request(`/bailleurs/programs/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateProgram(programId: string, data: Partial<FundingProgram>) {
    return request(`/bailleurs/programs/${programId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteProgram(programId: string) {
    return request(`/bailleurs/programs/${programId}/`, {
      method: 'DELETE',
    });
  },

  async getProgramApplications(programId: string) {
    return request(`/bailleurs/programs/${programId}/applications/`);
  },

  async getProgramStatistics(programId: string): Promise<ProgramStatistics> {
    return request(`/bailleurs/programs/${programId}/statistics/`);
  },

  // Candidatures
  async listApplications(params?: Record<string, any>) {
    return request(`/bailleurs/applications/${buildQuery(params)}`);
  },

  async getApplication(applicationId: string) {
    return request(`/bailleurs/applications/${applicationId}/`);
  },

  async createApplication(data: ApplicationCreate) {
    return request(`/bailleurs/applications/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateApplication(applicationId: string, data: Partial<FundingApplication>) {
    return request(`/bailleurs/applications/${applicationId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteApplication(applicationId: string) {
    return request(`/bailleurs/applications/${applicationId}/`, {
      method: 'DELETE',
    });
  },

  async submitApplication(applicationId: string) {
    return request(`/bailleurs/applications/${applicationId}/submit/`, {
      method: 'POST',
    });
  },

  async approveApplication(applicationId: string, approvedAmount?: number, evaluationNotes?: string) {
    return request(`/bailleurs/applications/${applicationId}/approve/`, {
      method: 'POST',
      body: { approved_amount: approvedAmount, evaluation_notes: evaluationNotes },
    });
  },

  async rejectApplication(applicationId: string, rejectionReason?: string, evaluationNotes?: string) {
    return request(`/bailleurs/applications/${applicationId}/reject/`, {
      method: 'POST',
      body: { rejection_reason: rejectionReason, evaluation_notes: evaluationNotes },
    });
  },

  async applicationAction(applicationId: string, action: 'submit' | 'approve' | 'reject', approvedAmount?: number, rejectionReason?: string, evaluationNotes?: string) {
    return request(`/bailleurs/applications/${applicationId}/action/`, {
      method: 'POST',
      body: { 
        action, 
        approved_amount: approvedAmount, 
        rejection_reason: rejectionReason, 
        evaluation_notes: evaluationNotes 
      },
    });
  },
};






