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





