import { request, buildQuery } from './http';

export type MetricType = 'financial' | 'operational' | 'customer' | 'growth' | 'efficiency';
export type CalculationType = 'sum' | 'average' | 'count' | 'percentage' | 'ratio';
export type DashboardType = 'entrepreneur' | 'coach' | 'bailleur' | 'admin' | 'system';
export type ReportType = 'financial' | 'operational' | 'performance' | 'trend' | 'custom';
export type TrendType = 'increasing' | 'decreasing' | 'stable' | 'fluctuating';

export interface KPIMetric {
  id: string;
  name: string;
  description?: string;
  metric_type: MetricType;
  calculation_type: CalculationType;
  target_value?: number;
  unit?: string;
  formula?: string;
  warning_threshold?: number;
  critical_threshold?: number;
  is_active: boolean;
  is_system: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface KPIMeasurement {
  id: string;
  kpi: string;
  kpi_name: string;
  entrepreneur: string;
  entrepreneur_name: string;
  activity: string;
  activity_name: string;
  value: number;
  period_start: string;
  period_end: string;
  measurement_date: string;
  data_source?: string;
  notes?: string;
  created_at: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  dashboard_type: DashboardType;
  owner: string;
  owner_name: string;
  layout_config: Record<string, any>;
  widgets: Record<string, any>[];
  refresh_interval: number;
  is_public: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsReport {
  id: string;
  title: string;
  description?: string;
  report_type: ReportType;
  target_audience: string;
  data_config: Record<string, any>;
  visualizations: Record<string, any>[];
  insights: string[];
  period_start: string;
  period_end: string;
  is_generated: boolean;
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TrendAnalysis {
  id: string;
  kpi: string;
  kpi_name: string;
  entrepreneur: string;
  entrepreneur_name: string;
  trend_type: TrendType;
  trend_strength: number;
  data_points: number[];
  trend_line: number[];
  forecast_values: number[];
  confidence_interval: number[];
  analysis_date: string;
  period_analyzed: string;
  created_at: string;
}

export interface KPICalculation {
  kpi_id: string;
  entrepreneur_id?: string;
  activity_id?: string;
  period_start: string;
  period_end: string;
  calculated_value: number;
  target_value?: number;
  status: string;
  trend?: string;
}

export interface DashboardData {
  dashboard_id: string;
  widgets_data: Record<string, any>;
  last_updated: string;
  refresh_interval: number;
}

export interface ReportGeneration {
  report_id: string;
  generation_status: string;
  file_path?: string;
  file_size?: number;
  generation_duration?: number;
  error_message?: string;
}

export interface KPIMetricCreate {
  name: string;
  description?: string;
  metric_type: MetricType;
  calculation_type: CalculationType;
  target_value?: number;
  unit?: string;
  formula?: string;
  warning_threshold?: number;
  critical_threshold?: number;
  is_active?: boolean;
}

export interface KPIMeasurementCreate {
  kpi: string;
  entrepreneur: string;
  activity: string;
  value: number;
  period_start: string;
  period_end: string;
  data_source?: string;
  notes?: string;
}

export interface DashboardCreate {
  name: string;
  description?: string;
  dashboard_type: DashboardType;
  owner: string;
  layout_config?: Record<string, any>;
  widgets?: Record<string, any>[];
  refresh_interval?: number;
  is_public?: boolean;
  is_default?: boolean;
}

export interface AnalyticsReportCreate {
  title: string;
  description?: string;
  report_type: ReportType;
  target_audience: string;
  data_config?: Record<string, any>;
  visualizations?: Record<string, any>[];
  insights?: string[];
  period_start: string;
  period_end: string;
}

export const AnalyticsService = {
  // Métriques KPI
  async listKPIMetrics(params?: Record<string, any>) {
    return request(`/analytics/kpis/${buildQuery(params)}`);
  },

  async getKPIMetric(kpiId: string) {
    return request(`/analytics/kpis/${kpiId}/`);
  },

  async createKPIMetric(data: KPIMetricCreate) {
    return request(`/analytics/kpis/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateKPIMetric(kpiId: string, data: Partial<KPIMetric>) {
    return request(`/analytics/kpis/${kpiId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteKPIMetric(kpiId: string) {
    return request(`/analytics/kpis/${kpiId}/`, {
      method: 'DELETE',
    });
  },

  async calculateKPI(kpiId: string, entrepreneurId?: string, activityId?: string, periodStart?: string, periodEnd?: string): Promise<KPICalculation> {
    const params: Record<string, any> = {};
    if (entrepreneurId) params.entrepreneur_id = entrepreneurId;
    if (activityId) params.activity_id = activityId;
    if (periodStart) params.period_start = periodStart;
    if (periodEnd) params.period_end = periodEnd;
    
    return request(`/analytics/kpis/${kpiId}/calculate/${buildQuery(params)}`);
  },

  // Mesures KPI
  async listKPIMeasurements(params?: Record<string, any>) {
    return request(`/analytics/measurements/${buildQuery(params)}`);
  },

  async getKPIMeasurement(measurementId: string) {
    return request(`/analytics/measurements/${measurementId}/`);
  },

  async createKPIMeasurement(data: KPIMeasurementCreate) {
    return request(`/analytics/measurements/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateKPIMeasurement(measurementId: string, data: Partial<KPIMeasurement>) {
    return request(`/analytics/measurements/${measurementId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteKPIMeasurement(measurementId: string) {
    return request(`/analytics/measurements/${measurementId}/`, {
      method: 'DELETE',
    });
  },

  // Tableaux de bord
  async listDashboards(params?: Record<string, any>) {
    return request(`/analytics/dashboards/${buildQuery(params)}`);
  },

  async getDashboard(dashboardId: string) {
    return request(`/analytics/dashboards/${dashboardId}/`);
  },

  async createDashboard(data: DashboardCreate) {
    return request(`/analytics/dashboards/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateDashboard(dashboardId: string, data: Partial<Dashboard>) {
    return request(`/analytics/dashboards/${dashboardId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteDashboard(dashboardId: string) {
    return request(`/analytics/dashboards/${dashboardId}/`, {
      method: 'DELETE',
    });
  },

  async getDashboardData(dashboardId: string): Promise<DashboardData> {
    return request(`/analytics/dashboards/${dashboardId}/data/`);
  },

  // Rapports d'analyse
  async listReports(params?: Record<string, any>) {
    return request(`/analytics/reports/${buildQuery(params)}`);
  },

  async getReport(reportId: string) {
    return request(`/analytics/reports/${reportId}/`);
  },

  async createReport(data: AnalyticsReportCreate) {
    return request(`/analytics/reports/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateReport(reportId: string, data: Partial<AnalyticsReport>) {
    return request(`/analytics/reports/${reportId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteReport(reportId: string) {
    return request(`/analytics/reports/${reportId}/`, {
      method: 'DELETE',
    });
  },

  async generateReport(reportId: string): Promise<ReportGeneration> {
    return request(`/analytics/reports/${reportId}/generate/`, {
      method: 'POST',
    });
  },

  // Analyses de tendances
  async listTrendAnalyses(params?: Record<string, any>) {
    return request(`/analytics/trends/${buildQuery(params)}`);
  },

  async getTrendAnalysis(trendId: string) {
    return request(`/analytics/trends/${trendId}/`);
  },

  async createTrendAnalysis(data: Partial<TrendAnalysis>) {
    return request(`/analytics/trends/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateTrendAnalysis(trendId: string, data: Partial<TrendAnalysis>) {
    return request(`/analytics/trends/${trendId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteTrendAnalysis(trendId: string) {
    return request(`/analytics/trends/${trendId}/`, {
      method: 'DELETE',
    });
  },
};






