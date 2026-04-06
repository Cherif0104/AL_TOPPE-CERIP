import { request, buildQuery } from './http';


type UUID = string;

export interface  UserProfile {
  id: UUID;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone: string;
  email: string | null;
  role : string;
  role_display?: string;
  is_verified: boolean;
  created_at: string;
  language?: string;
  is_active?: boolean;

  entrepreneur?: Entrepreneur;
}

export interface Activity {
  id: UUID;
  title: string;
  description?: string;
  legal_form?: string;
  legal_form_display?: string;
  sector: string;
  sector_display?: string;
  status?: string;
  status_display?: string;
  tax_regime?: string;
  creation_date?: string; // ISO date string
  created_at?: string;
  updated_at?: string;

  // other fields...
}

export interface Entrepreneur {
  id: UUID;
  phone?: string;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  birth_date?: string; // ISO date string
  age?: number;
  civility?: string;
  civility_display?: string;
  cni_number?: string;
  address?: string;
  locations?: any[]; // or a more specific type if known
  is_active?: boolean;
  language?: string;
  first_name: string;
  last_name: string;  
  full_name?: string;
  whatsapp?: string;
  // Nested objects
  activities?: Activity[];

}



// Types pour les plans d'affaires
interface FinancialProjections {
  year_1_revenue: number;
  year_1_expenses: number;
  year_1_profit: number;
  break_even_month?: number;
}

export interface BusinessPlan {
  id: string;
  title: string;
  activity_title: string;
  status: string;
  status_display: string;
  created_at: string;
  updated_at: string;
  financial_projections?: FinancialProjections;
  entrepreneur_name: string;
  template_name: string;
  summary: string;
  progress?: number;
}

export interface BusinessPlansResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BusinessPlan[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  sector?: string;
}

// Types pour les templates guidés
export interface GuidedQuestion {
  id: string;
  label: string;
  type: 'textarea' | 'select' | 'multiselect' | 'number';
  required: boolean;
  options?: string[];
  help?: string;
}

export interface GuidedTemplate {
  name: string;
  description: string;
  sections: {
    market_analysis: { questions: GuidedQuestion[] };
    offer: { questions: GuidedQuestion[] };
    business_model: { questions: GuidedQuestion[] };
    financial_projections: { questions: GuidedQuestion[] };
    implementation_plan: { questions: GuidedQuestion[] };
  };
}

// Types pour le workflow de validation
export interface WorkflowStep {
  name: string;
  label: string;
  required_role: string;
  required: boolean;
}

export interface WorkflowStatus {
  business_plan_id: string;
  workflow_type: string;
  workflow_steps: WorkflowStep[];
  completed_steps: string[];
  next_step: WorkflowStep | null;
  is_complete: boolean;
  can_validate: boolean;
  validations: any[];
}

export interface ValidationData {
  validation_type: string;
  is_approved: boolean;
  comments?: string;
  score?: number;
  workflow_type?: string;
}

export const BusinessPlanService = {

  async list( params?: Record<string, any>) {
    return request(`/business-plans/${buildQuery(params)}`);
  },
  

  // update profile
  async updateEntrepreneurPlans(id: string, data: Partial<BusinessPlan>) {
    try {
      const updatedData = await request(`/business-plans/${id}/`, {
        method: 'PATCH',
        body: data,
      });
      return updatedData as BusinessPlan;
    } catch (error) {
      console.error('Error updating plan:', error);
      throw error;
    }
  },

  async businessPlansDetails(id: string, params?: Record<string, any>) {
    try {
      if (!id) {
        throw new Error('plan ID is required to fetch activities.');
      }  
    return request(`/business-plans/${id}/${buildQuery(params)}`);
    }
    catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  },
  async entrepreneurPlans(entrepreneurId: string, params?: Record<string, any>) {
    try {
      if (!entrepreneurId) {
        throw new Error('Entrepreneur ID is required to fetch activities.');
      }  
    return request(`/business-plans/entrepreneurs/${entrepreneurId}/${buildQuery(params)}`);
    }
    catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  },

  async createBusinessPlan(data: { 
    title: string; 
    template?: string; 
    entrepreneur: string; 
    activity?: string; 
    status?: string;
    use_ai?: boolean;
    sector?: string;
    market_analysis?: any;
    offer?: any;
    business_model?: any;
    financial_projections?: any;
    implementation_plan?: any;
    language?: string;
  }) {
    return request('/business-plans/', {
      method: 'POST',
      body: data,
    });
  },

  // ============================================================================
  // TEMPLATES GUIDÉS
  // ============================================================================

  /**
   * Récupère les questions guidées pour un secteur
   */
  async getGuidedQuestions(sector: string): Promise<GuidedTemplate> {
    try {
      if (!sector) {
        throw new Error('Secteur requis');
      }
      return request(`/business-plans/guided/${sector}/questions/`) as Promise<GuidedTemplate>;
    } catch (error) {
      console.error('Error fetching guided questions:', error);
      throw error;
    }
  },

  /**
   * Génère un plan d'affaires depuis les réponses au questionnaire
   */
  async generateFromGuided(data: {
    sector: string;
    title: string;
    entrepreneur_id: string;
    activity_id: string;
    answers: Record<string, any>;
  }) {
    try {
      if (!data.sector || !data.title || !data.entrepreneur_id || !data.activity_id) {
        throw new Error('Tous les champs sont requis');
      }
      return request('/business-plans/guided/generate/', {
        method: 'POST',
        body: data,
      });
    } catch (error) {
      console.error('Error generating guided plan:', error);
      throw error;
    }
  },

  // ============================================================================
  // EXPORT PDF
  // ============================================================================

  /**
   * Exporte un plan en PDF (retourne l'URL ou les données du PDF)
   */
  async exportPdf(planId: string) {
    try {
      if (!planId) {
        throw new Error('ID du plan requis');
      }
      return request(`/business-plans/${planId}/export/pdf/`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw error;
    }
  },

  /**
   * Récupère le résumé exécutif d'un plan
   */
  async getSummary(planId: string) {
    try {
      if (!planId) {
        throw new Error('ID du plan requis');
      }
      return request(`/business-plans/${planId}/export/summary/`);
    } catch (error) {
      console.error('Error fetching summary:', error);
      throw error;
    }
  },

  // ============================================================================
  // WORKFLOW DE VALIDATION
  // ============================================================================

  /**
   * Récupère le statut du workflow de validation
   */
  async getWorkflowStatus(planId: string, workflowType: string = 'basic'): Promise<WorkflowStatus> {
    try {
      if (!planId) {
        throw new Error('ID du plan requis');
      }
      return request(`/business-plans/${planId}/workflow/status/?workflow_type=${workflowType}`) as Promise<WorkflowStatus>;
    } catch (error) {
      console.error('Error fetching workflow status:', error);
      throw error;
    }
  },

  /**
   * Valide une étape du workflow
   */
  async validateWorkflow(planId: string, validationData: ValidationData) {
    try {
      if (!planId) {
        throw new Error('ID du plan requis');
      }
      if (!validationData.validation_type) {
        throw new Error('Type de validation requis');
      }
      return request(`/business-plans/${planId}/workflow/validate/`, {
        method: 'POST',
        body: validationData,
      });
    } catch (error) {
      console.error('Error validating workflow:', error);
      throw error;
    }
  },

    

};



