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

// types/auth.ts
export interface EntrepreneurSignupData {
  first_name: string;
  last_name: string;
  civility: string;
  cni_number: string;
  address: string;
  whatsapp: string;
  birth_date: string;
  phone: string;
  email: string;
  password: string;
  password_confirm: string;
  primary_address: string;
  primary_region: string;
  primary_city: string;
  primary_lat?: string;
  primary_lng?: string;
}

export interface ApiError {
  status: number;
  data: any;
  message: string;
}

export const EntrepreneurService = {
  async profile() {
    try {
      const data = await request('/auth/profile/');
      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);   
      throw error;
    }
  },

  async registerEntrepreneur(userData: EntrepreneurSignupData) {
    try {
      const response = await request('/entrepreneurs/', {
        method: 'POST',
        body: userData,
      });
      return response;
    } catch (error: any) {
      if (error.data) {
        const errorMessages = [];
        
        if (error.data.phone) {
          errorMessages.push(error.data.phone);
        }
        if (error.data.email) {
          errorMessages.push(error.data.email);
        }
        if (error.data.cni_number) {
          errorMessages.push(error.data.cni_number);
        }
        if (error.data.password_confirm) {
          errorMessages.push(error.data.password_confirm);
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

  // update profile
  async updateUserProfile(data: Partial<UserProfile>) {
    try {
      const updatedData = await request('/auth/profile/', {
        method: 'PUT',
        body: data,
      });
      return updatedData as UserProfile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  async activities(entrepreneurId: string, params?: Record<string, UserProfile | string | number>) {
    try {
      if (!entrepreneurId) {
        throw new Error('Entrepreneur ID is required to fetch activities.');
      } 

      return request(`/entrepreneurs/${entrepreneurId}/activities/${buildQuery(params)}`);
    }
    catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  }
    

};



