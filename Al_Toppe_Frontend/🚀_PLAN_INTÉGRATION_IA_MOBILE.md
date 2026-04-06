# 🚀 PLAN D'INTÉGRATION IA - MOBILE AL-TOPPE

## 📋 **PLAN D'EXÉCUTION**

### **Phase 1️⃣ : Service IA (30 min)** ⏰
- Créer `services/ai.ts`
- Créer `types/ai.ts`
- Tester les 4 endpoints

### **Phase 2️⃣ : Écran Analytics (1h)** ⏰
- Modifier `app/(tabs)/analytics.tsx`
- Créer composant `FinancialHealthCard`
- Créer composant `RecommendationsList`

### **Phase 3️⃣ : Écran Business Plans (1h)** ⏰
- Modifier `app/(tabs)/business_plans.tsx`
- Créer modal `AIBusinessPlanModal`
- Afficher plan généré

### **Phase 4️⃣ : Écran Finances (45 min)** ⏰
- Modifier `app/(tabs)/finances.tsx`
- Créer composant `RecurringExpensesList`
- Gérer alertes

### **Phase 5️⃣ : Dashboard (30 min)** ⏰
- Modifier `app/(tabs)/index.tsx`
- Créer widget `HealthScoreWidget`
- Afficher alertes récentes

**TEMPS TOTAL : ~4h**

---

## 📁 **FICHIERS À CRÉER/MODIFIER**

### **Nouveaux fichiers (3)**
1. ✅ `services/ai.ts` - Service API IA
2. ✅ `types/ai.ts` - Types TypeScript
3. ✅ `components/ai/FinancialHealthCard.tsx` - Composant santé financière

### **Fichiers à modifier (5)**
1. ⚠️ `app/(tabs)/analytics.tsx` - Ajouter analyse IA
2. ⚠️ `app/(tabs)/business_plans.tsx` - Ajouter génération IA
3. ⚠️ `app/(tabs)/finances.tsx` - Ajouter dépenses récurrentes
4. ⚠️ `app/(tabs)/index.tsx` - Ajouter widget santé
5. ⚠️ `constants/config.ts` - Ajouter endpoints IA (optionnel)

---

## 🎯 **PHASE 1 : SERVICE IA**

### **1.1 Créer `types/ai.ts`**

```typescript
// types/ai.ts
export interface FinancialInsight {
  type: 'positive' | 'warning' | 'critical';
  title: string;
  description: string;
  impact: string;
}

export interface FinancialRecommendation {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'financial' | 'operational' | 'strategic';
  title: string;
  description: string;
  expected_benefit: string;
}

export interface FinancialIndicators {
  revenue_trend: 'growing' | 'stable' | 'declining';
  expense_control: 'good' | 'moderate' | 'poor';
  profitability: 'profitable' | 'breakeven' | 'loss';
  cash_flow_health: 'healthy' | 'concerning' | 'critical';
}

export interface FinancialAnalysisResult {
  success: boolean;
  analysis_id?: string;
  health_score?: number;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  insights?: FinancialInsight[];
  recommendations?: FinancialRecommendation[];
  financial_indicators?: FinancialIndicators;
  metrics?: {
    total_income: number;
    total_expense: number;
    balance: number;
    profit_margin: number;
  };
  processing_time_ms?: number;
  error?: string;
}

export interface AIRecommendation {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  description: string;
  expected_impact: string;
}

export interface RecommendationsResult {
  success: boolean;
  count?: number;
  recommendations?: AIRecommendation[];
  processing_time_ms?: number;
  error?: string;
}

export interface BusinessPlanFinancialProjection {
  year_1: { revenue: number; expenses: number; profit: number };
  year_2: { revenue: number; expenses: number; profit: number };
  year_3: { revenue: number; expenses: number; profit: number };
  break_even_months: number;
  initial_investment: number;
}

export interface BusinessPlanResult {
  success: boolean;
  plan?: {
    summary: string;
    market_analysis: any;
    offer: any;
    business_model: any;
    financial_projections: BusinessPlanFinancialProjection;
    implementation_plan: any;
  };
  processing_time_ms?: number;
  ai_system?: string;
  error?: string;
}

export interface RecurringExpense {
  category: string;
  is_recurring: boolean;
  frequency: 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'yearly' | 'irregular';
  average_amount: number;
  confidence: number;
  pattern_description: string;
  next_expected_date: string;
  reminder_message: string;
  recommendations: string[];
}

export interface RecurringExpensesResult {
  success: boolean;
  recurring_expenses?: RecurringExpense[];
  total_monthly_estimate?: number;
  alerts_created?: number;
  processing_time_ms?: number;
  error?: string;
}
```

### **1.2 Créer `services/ai.ts`**

```typescript
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: FinancialAnalysisResult = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur analyse financière:', error);
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: RecommendationsResult = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur génération recommandations:', error);
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: BusinessPlanResult = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur génération business plan:', error);
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
        headers,
        body: JSON.stringify({
          entrepreneur_id: entrepreneurId,
          lookback_days: lookbackDays,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: RecurringExpensesResult = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur détection dépenses récurrentes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }
}

// Export singleton
export default new AIService();
```

---

## 🎯 **PHASE 2 : ÉCRAN ANALYTICS**

### **2.1 Créer `components/ai/FinancialHealthCard.tsx`**

```typescript
// components/ai/FinancialHealthCard.tsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FinancialAnalysisResult } from '@/types/ai';

interface Props {
  analysis: FinancialAnalysisResult | null;
  loading: boolean;
}

export default function FinancialHealthCard({ analysis, loading }: Props) {
  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Analyse en cours...</Text>
      </View>
    );
  }

  if (!analysis || !analysis.success) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.error;
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle size={24} color={Colors.success} />;
      case 'medium':
        return <AlertCircle size={24} color={Colors.warning} />;
      case 'high':
      case 'critical':
        return <AlertCircle size={24} color={Colors.error} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.card}>
      {/* Score de santé */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Score de Santé</Text>
        <Text style={[styles.scoreValue, { color: getScoreColor(analysis.health_score || 0) }]}>
          {analysis.health_score}/100
        </Text>
      </View>

      {/* Niveau de risque */}
      <View style={styles.riskContainer}>
        {getRiskIcon(analysis.risk_level || 'medium')}
        <Text style={styles.riskText}>
          Risque: {analysis.risk_level === 'low' ? 'Faible' : 
                   analysis.risk_level === 'medium' ? 'Moyen' : 
                   analysis.risk_level === 'high' ? 'Élevé' : 'Critique'}
        </Text>
      </View>

      {/* Métriques */}
      {analysis.metrics && (
        <View style={styles.metricsContainer}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Revenus</Text>
            <Text style={styles.metricValue}>
              {analysis.metrics.total_income.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Dépenses</Text>
            <Text style={styles.metricValue}>
              {analysis.metrics.total_expense.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Solde</Text>
            <Text style={[styles.metricValue, { color: analysis.metrics.balance >= 0 ? Colors.success : Colors.error }]}>
              {analysis.metrics.balance.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Marge</Text>
            <Text style={styles.metricValue}>
              {analysis.metrics.profit_margin.toFixed(1)}%
            </Text>
          </View>
        </View>
      )}

      {/* Insights */}
      {analysis.insights && analysis.insights.length > 0 && (
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>💡 Insights</Text>
          {analysis.insights.map((insight, index) => (
            <View key={index} style={styles.insightRow}>
              <View style={[styles.insightDot, { 
                backgroundColor: insight.type === 'positive' ? Colors.success : 
                                insight.type === 'warning' ? Colors.warning : Colors.error 
              }]} />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    marginTop: 12,
    textAlign: 'center',
    color: Colors.gray600,
    fontSize: 14,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 16,
    color: Colors.gray600,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  riskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.gray100,
    borderRadius: 12,
  },
  riskText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray800,
  },
  metricsContainer: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.gray600,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray900,
  },
  insightsContainer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.gray900,
  },
  insightRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray900,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 13,
    color: Colors.gray600,
    lineHeight: 18,
  },
});
```

### **2.2 Modifier `app/(tabs)/analytics.tsx`**

Ajouter ce bouton et cette section en haut du composant :

```typescript
// Dans analytics.tsx, après les imports
import aiService from '@/services/ai';
import { FinancialAnalysisResult } from '@/types/ai';
import FinancialHealthCard from '@/components/ai/FinancialHealthCard';

// Dans le composant, ajouter ces états
const [aiAnalysis, setAiAnalysis] = useState<FinancialAnalysisResult | null>(null);
const [analyzingFinancialHealth, setAnalyzingFinancialHealth] = useState(false);

// Ajouter cette fonction
const handleAnalyzeFinancialHealth = async () => {
  if (!entrepreneur?.id) return;
  
  setAnalyzingFinancialHealth(true);
  try {
    const result = await aiService.analyzeFinancialHealth(entrepreneur.id, 30);
    setAiAnalysis(result);
    
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Analyse terminée',
        text2: `Score: ${result.health_score}/100`,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: result.error || 'Impossible d\'analyser',
      });
    }
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Erreur',
      text2: 'Une erreur est survenue',
    });
  } finally {
    setAnalyzingFinancialHealth(false);
  }
};

// Dans le JSX, ajouter avant les graphiques
<TouchableOpacity
  style={styles.analyzeButton}
  onPress={handleAnalyzeFinancialHealth}
  disabled={analyzingFinancialHealth}
>
  <Text style={styles.analyzeButtonText}>
    {analyzingFinancialHealth ? 'Analyse en cours...' : '🤖 Analyser ma santé financière'}
  </Text>
</TouchableOpacity>

<FinancialHealthCard analysis={aiAnalysis} loading={analyzingFinancialHealth} />

// Ajouter ce style
analyzeButton: {
  backgroundColor: Colors.primary,
  padding: 16,
  borderRadius: 12,
  alignItems: 'center',
  marginBottom: 16,
},
analyzeButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
```

---

## 📊 **RÉSUMÉ TECHNIQUE**

### **Endpoints API**
| Service | Endpoint | Méthode | Body |
|---------|----------|---------|------|
| Analyse Financière | `/ai/financial/analyze/` | POST | `{entrepreneur_id, period_days}` |
| Recommandations | `/ai/recommendations/generate/` | POST | `{entrepreneur_id, analysis_id, num_recommendations}` |
| Business Plan | `/ai/business-plan/generate/` | POST | `{entrepreneur_id, activity_id, sector, answers}` |
| Dépenses Récurrentes | `/ai/recurring-expenses/detect/` | POST | `{entrepreneur_id, lookback_days}` |

### **Coûts estimés**
- Analyse: **$0.00075** (~0.5 FCFA)
- Recommandations: **$0.00099** (~0.6 FCFA)
- Business Plan: **$0.00135** (~0.8 FCFA)
- Dépenses Récurrentes: **$0.00099** (~0.6 FCFA)

**Total: ~2.5 FCFA par utilisation complète**

---

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║       🚀 PRÊT POUR IMPLÉMENTATION !                              ║
║                                                                  ║
║       Suivez les phases 1 à 5 pour intégration complète          ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

**AL-TOPPE Mobile - IA Ready ! 🇸🇳**





