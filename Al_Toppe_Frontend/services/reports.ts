import { request, buildQuery } from './http';

export type ReportType = 'financial' | 'operational' | 'performance' | 'compliance' | 'custom';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type ScheduleStatus = 'active' | 'paused' | 'cancelled';
export type DeliveryMethod = 'email' | 'sms' | 'whatsapp' | 'push' | 'download';
export type DistributionStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface Report {
  id: string;
  title: string;
  description?: string;
  report_type: ReportType;
  format: ReportFormat;
  target_user: string;
  activity?: string;
  period_start?: string;
  period_end?: string;
  data?: Record<string, any>;
  template_config?: Record<string, any>;
  is_generated: boolean;
  file_path?: string;
  file_size?: number;
  generated_at?: string;
  generation_duration?: number;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  is_system: boolean;
  template_config: Record<string, any>;
  sections: Record<string, any>[];
  charts_config: Record<string, any>[];
  default_format: ReportFormat;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportSchedule {
  id: string;
  name: string;
  description?: string;
  template: string;
  target_user: string;
  frequency: ScheduleFrequency;
  start_date: string;
  end_date?: string;
  generation_time: string;
  auto_send: boolean;
  recipients: string[];
  status: ScheduleStatus;
  is_active: boolean;
  last_generated?: string;
  next_generation?: string;
  total_generated: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

export interface ReportDistribution {
  id: string;
  report: string;
  recipient: string;
  delivery_method: DeliveryMethod;
  status: DistributionStatus;
  attempts: number;
  max_attempts: number;
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  can_retry: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportStatistics {
  total_reports: number;
  generated_reports: number;
  pending_reports: number;
  overdue_reports: number;
  total_templates: number;
  active_schedules: number;
  successful_distributions: number;
  failed_distributions: number;
}

export interface TemplateUsage {
  template_id: string;
  template_name: string;
  usage_count: number;
  last_used?: string;
  success_rate: number;
}

export interface SchedulePerformance {
  schedule_id: string;
  schedule_name: string;
  total_generated: number;
  successful_generations: number;
  failed_generations: number;
  success_rate: number;
  average_generation_time: number;
}

export interface ReportCreate {
  title: string;
  description?: string;
  report_type: ReportType;
  format: ReportFormat;
  target_user: string;
  activity?: string;
  period_start?: string;
  period_end?: string;
  data?: Record<string, any>;
  template_config?: Record<string, any>;
}

export interface TemplateCreate {
  name: string;
  description?: string;
  category: string;
  template_config?: Record<string, any>;
  sections?: Record<string, any>[];
  charts_config?: Record<string, any>[];
  default_format?: ReportFormat;
  is_active?: boolean;
}

export interface ScheduleCreate {
  name: string;
  description?: string;
  template: string;
  target_user: string;
  frequency: ScheduleFrequency;
  start_date: string;
  end_date?: string;
  generation_time: string;
  auto_send?: boolean;
  recipients?: string[];
  status?: ScheduleStatus;
}

export interface DistributionCreate {
  report: string;
  recipient: string;
  delivery_method: DeliveryMethod;
  max_attempts?: number;
}

export const ReportsService = {
  // Rapports
  async listReports(params?: Record<string, any>) {
    return request(`/reports/${buildQuery(params)}`);
  },

  async getReport(reportId: string) {
    return request(`/reports/${reportId}/`);
  },

  async createReport(data: ReportCreate) {
    return request(`/reports/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateReport(reportId: string, data: Partial<Report>) {
    return request(`/reports/${reportId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteReport(reportId: string) {
    return request(`/reports/${reportId}/`, {
      method: 'DELETE',
    });
  },

  async generateReport(reportId: string) {
    return request(`/reports/${reportId}/generate/`, {
      method: 'POST',
    });
  },

  async downloadReport(reportId: string) {
    return request(`/reports/${reportId}/download/`);
  },

  // Templates de rapports
  async listTemplates(params?: Record<string, any>) {
    return request(`/reports/templates/${buildQuery(params)}`);
  },

  async getTemplate(templateId: string) {
    return request(`/reports/templates/${templateId}/`);
  },

  async createTemplate(data: TemplateCreate) {
    return request(`/reports/templates/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateTemplate(templateId: string, data: Partial<ReportTemplate>) {
    return request(`/reports/templates/${templateId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteTemplate(templateId: string) {
    return request(`/reports/templates/${templateId}/`, {
      method: 'DELETE',
    });
  },

  // Planifications de rapports
  async listSchedules(params?: Record<string, any>) {
    return request(`/reports/schedules/${buildQuery(params)}`);
  },

  async getSchedule(scheduleId: string) {
    return request(`/reports/schedules/${scheduleId}/`);
  },

  async createSchedule(data: ScheduleCreate) {
    return request(`/reports/schedules/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateSchedule(scheduleId: string, data: Partial<ReportSchedule>) {
    return request(`/reports/schedules/${scheduleId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteSchedule(scheduleId: string) {
    return request(`/reports/schedules/${scheduleId}/`, {
      method: 'DELETE',
    });
  },

  async activateSchedule(scheduleId: string) {
    return request(`/reports/schedules/${scheduleId}/activate/`, {
      method: 'POST',
    });
  },

  async deactivateSchedule(scheduleId: string) {
    return request(`/reports/schedules/${scheduleId}/deactivate/`, {
      method: 'POST',
    });
  },

  // Distributions de rapports
  async listDistributions(params?: Record<string, any>) {
    return request(`/reports/distributions/${buildQuery(params)}`);
  },

  async getDistribution(distributionId: string) {
    return request(`/reports/distributions/${distributionId}/`);
  },

  async createDistribution(data: DistributionCreate) {
    return request(`/reports/distributions/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateDistribution(distributionId: string, data: Partial<ReportDistribution>) {
    return request(`/reports/distributions/${distributionId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteDistribution(distributionId: string) {
    return request(`/reports/distributions/${distributionId}/`, {
      method: 'DELETE',
    });
  },

  async retryDistribution(distributionId: string) {
    return request(`/reports/distributions/${distributionId}/retry/`, {
      method: 'POST',
    });
  },

  async markDistributionDelivered(distributionId: string) {
    return request(`/reports/distributions/${distributionId}/mark_delivered/`, {
      method: 'POST',
    });
  },
};






