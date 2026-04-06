import { request, buildQuery } from './http';

export type TransactionType = 'income' | 'expense';

export interface TransactionPayload {
  entrepreneur: string;
  activity: string;
  title: string;
  description?: string;
  type: TransactionType;
  amount: number;
  category?: string;
  date: string;
  frequency?: string;
  payment_status?: string;
  payment_method?: string;
  reference?: string;
  // Nouveaux champs optionnels pour le compte de résultat
  invoice_number?: string;
  client_supplier?: string;
  has_invoice?: boolean;
}

export const FinanceService = {
  async list(entrepreneurId: string, params?: Record<string, any>) {
    return request(`/finances/entrepreneurs/${entrepreneurId}/cashflow/${buildQuery(params)}`);
  },
  
  async create(entrepreneurId: string, data: TransactionPayload) {
    return request(`/finances/entrepreneurs/${entrepreneurId}/cashflow/`, {
      method: 'POST',
      body: data,
    });
  },
  async update(entrepreneurId: string, transactionId: string, data: TransactionPayload) {
    return request(`/finances/entrepreneurs/${entrepreneurId}/cashflow/${transactionId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async delete(entrepreneurId: string, transactionId: string) {
    return request(`/finances/entrepreneurs/${entrepreneurId}/cashflow/${transactionId}/`, {
      method: 'DELETE',
    });
  },


  async dashboard(entrepreneurId: string) {
    return request(`/finances/entrepreneurs/${entrepreneurId}/dashboard/`);
  },

  async analysis(entrepreneurId: string, params?: { period?: string }) {
    return request(`/finances/entrepreneurs/${entrepreneurId}/cashflow/analysis/${buildQuery(params)}`);
  },

  async categorySummary(entrepreneurId: string) {
    return request(`/finances/entrepreneurs/${entrepreneurId}/categories/summary/`);
  },
};


