// services/incomeStatement.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '@/constants/config';
import { IncomeStatementResult } from '@/types/incomeStatement';

const API_BASE_URL = Config.API_BASE_URL;

class IncomeStatementService {
  /**
   * Obtenir les headers d'authentification
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Générer le compte de résultat pour un entrepreneur
   */
  async generateIncomeStatement(
    entrepreneurId: string,
    startDate?: string,
    endDate?: string
  ): Promise<IncomeStatementResult> {
    try {
      const headers = await this.getAuthHeaders();
      
      // Construire l'URL avec les paramètres optionnels
      let url = `${API_BASE_URL}/finances/entrepreneurs/${entrepreneurId}/income-statement/`;
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('start_date', startDate);
      }
      if (endDate) {
        params.append('end_date', endDate);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }
      
      const data: IncomeStatementResult = await response.json();
      return data;
      
    } catch (error) {
      console.error('Erreur lors de la génération du compte de résultat:', error);
      throw error;
    }
  }
}

export const incomeStatementService = new IncomeStatementService();

