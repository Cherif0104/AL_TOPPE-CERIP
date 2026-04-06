import { request, buildQuery } from './http';

export interface Activity {
  id: string;
  title: string;
  sector: string;
  sector_display?: string;
  description?: string;
  creation_date: string;
  legal_form?: string;
  legal_form_display?: string;
  tax_regime?: string;
  status?: string;
  status_display?: string;
  frequency?: string;
  frequency_display?: string;
  frequency_day?: number;
  age_days?: number;
  total_revenue?: number;
  total_expenses?: number;
  profit?: number;
  location?: {
    id: string;
    address: string;
    region: string;
    city: string;
    lat?: number;
    lng?: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ActivityCreateData {
  title: string;
  sector: string;
  description?: string;
  creation_date: string;
  legal_form?: string;
  tax_regime?: string;
  frequency?: string;
  frequency_day?: number;
  location?: string; // ID de la localisation
}

export interface ActivityUpdateData {
  title?: string;
  sector?: string;
  description?: string;
  legal_form?: string;
  tax_regime?: string;
  status?: string;
  frequency?: string;
  frequency_day?: number;
}

export const ActivityService = {
  // Lister les activités d'un entrepreneur
  async listByEntrepreneur(entrepreneurId: string, params?: Record<string, any>) {
    try {
      return await request(`/entrepreneurs/${entrepreneurId}/activities/${buildQuery(params)}`);
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  },

  // Obtenir une activité par ID
  async getById(entrepreneurId: string, activityId: string) {
    try {
      return await request(`/entrepreneurs/${entrepreneurId}/activities/${activityId}/`);
    } catch (error) {
      console.error('Error fetching activity:', error);
      throw error;
    }
  },

  // Créer une nouvelle activité
  async create(entrepreneurId: string, activityData: ActivityCreateData) {
    try {
      return await request(`/entrepreneurs/${entrepreneurId}/activities/`, {
        method: 'POST',
        body: activityData,
      });
    } catch (error: any) {
      if (error.data) {
        const errorMessages = [];
        
        if (error.data.title) {
          errorMessages.push(error.data.title);
        }
        if (error.data.sector) {
          errorMessages.push(error.data.sector);
        }
        if (error.data.creation_date) {
          errorMessages.push(error.data.creation_date);
        }
        if (error.data.non_field_errors) {
          errorMessages.push(...error.data.non_field_errors);
        }

        if (errorMessages.length > 0) {
          throw new Error(errorMessages.join('\n'));
        }
      }
      
      throw error;
    }
  },

  // Mettre à jour une activité
  async update(entrepreneurId: string, activityId: string, activityData: ActivityUpdateData) {
    try {
      return await request(`/entrepreneurs/${entrepreneurId}/activities/${activityId}/`, {
        method: 'PUT',
        body: activityData,
      });
    } catch (error: any) {
      if (error.data) {
        const errorMessages = [];
        
        if (error.data.title) {
          errorMessages.push(error.data.title);
        }
        if (error.data.sector) {
          errorMessages.push(error.data.sector);
        }
        if (error.data.non_field_errors) {
          errorMessages.push(...error.data.non_field_errors);
        }

        if (errorMessages.length > 0) {
          throw new Error(errorMessages.join('\n'));
        }
      }
      
      throw error;
    }
  },

  // Supprimer une activité
  async delete(entrepreneurId: string, activityId: string) {
    try {
      return await request(`/entrepreneurs/${entrepreneurId}/activities/${activityId}/`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  },

  // Obtenir les statistiques d'une activité
  async getStats(entrepreneurId: string, activityId: string) {
    try {
      return await request(`/entrepreneurs/${entrepreneurId}/activities/${activityId}/stats/`);
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      throw error;
    }
  }
};


