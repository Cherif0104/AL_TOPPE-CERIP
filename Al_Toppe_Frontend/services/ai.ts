// services/ai.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '@/constants/config';
import {
  FinancialAnalysisResult,
  RecommendationsResult,
  BusinessPlanResult,
  RecurringExpensesResult,
} from '@/types/ai';

const API_BASE_URL = Config.API_BASE_URL;

class AIService {
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
   * 1️⃣ ANALYSE FINANCIÈRE
   * Analyser la santé financière d'un entrepreneur
   * 
   * @param entrepreneurId - ID de l'entrepreneur
   * @param periodDays - Période d'analyse en jours (défaut: 30)
   * @returns Résultat de l'analyse avec score santé, insights, recommandations
   * 
   * @example
   * const result = await aiService.analyzeFinancialHealth('uuid', 30);
   * console.log(result.health_score); // 75
   */
  async analyzeFinancialHealth(
    entrepreneurId: string,
    periodDays: number = 30
  ): Promise<FinancialAnalysisResult> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/ai/financial/analyze/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entrepreneur_id: entrepreneurId,
          period_days: periodDays,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
        
        // Si c'est une erreur 429, propager le message complet
        if (response.status === 429) {
          throw new Error(`429: ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
      }

      const data: FinancialAnalysisResult = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Erreur analyse financière:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * 2️⃣ RECOMMANDATIONS IA
   * Générer des recommandations personnalisées
   * 
   * @param entrepreneurId - ID de l'entrepreneur
   * @param analysisId - ID de l'analyse source
   * @param numRecommendations - Nombre de recommandations (défaut: 5)
   * @returns Liste de recommandations
   * 
   * @example
   * const result = await aiService.generateRecommendations('uuid', 'analysis-uuid');
   * console.log(result.count); // 5
   */
  async generateRecommendations(
    entrepreneurId: string,
    analysisId: string,
    numRecommendations: number = 5
  ): Promise<RecommendationsResult> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/ai/recommendations/generate/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entrepreneur_id: entrepreneurId,
          analysis_id: analysisId,
          num_recommendations: numRecommendations,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: RecommendationsResult = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Erreur génération recommandations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * 3️⃣ BUSINESS PLAN IA
   * Générer un business plan complet avec IA
   * 
   * @param data - Données du business plan
   * @returns Plan d'affaires généré
   * 
   * @example
   * const result = await aiService.generateBusinessPlan({
   *   entrepreneur_id: 'uuid',
   *   activity_id: 'uuid',
   *   sector: 'commerce',
   *   answers: { ... }
   * });
   */
  async generateBusinessPlan(data: {
    entrepreneur_id: string;
    activity_id: string;
    sector: string;
    answers: Record<string, any>;
    language?: string;
  }): Promise<BusinessPlanResult> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/ai/business-plan/generate/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...data,
          language: data.language || 'french',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: BusinessPlanResult = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erreur génération business plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * 4️⃣ DÉPENSES RÉCURRENTES
   * Détecter les dépenses récurrentes et créer des rappels
   * 
   * @param entrepreneurId - ID de l'entrepreneur
   * @param lookbackDays - Période d'analyse en jours (défaut: 90)
   * @returns Dépenses récurrentes détectées
   * 
   * @example
   * const result = await aiService.detectRecurringExpenses('uuid');
   * console.log(result.recurring_expenses); // [{ category: 'loyer', ... }]
   */
  async detectRecurringExpenses(
    entrepreneurId: string,
    lookbackDays: number = 90
  ): Promise<RecurringExpensesResult> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/ai/recurring-expenses/detect/`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entrepreneur_id: entrepreneurId,
          lookback_days: lookbackDays,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
        
        // Si c'est une erreur 429, propager le message complet
        if (response.status === 429) {
          throw new Error(`429: ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
      }

      const data: RecurringExpensesResult = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Erreur détection dépenses récurrentes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }
}

// Export singleton
export default new AIService();





