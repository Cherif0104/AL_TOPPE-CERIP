import { request, buildQuery } from './http';

export type ProductionCycleStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'delayed';
export type ProductionTaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

export interface ProductionCycle {
  id: string;
  activity: string;
  title: string;
  duration_days: number;
  start_date: string;
  expected_end_date: string;
  actual_end_date?: string;
  status: ProductionCycleStatus;
  target_quantity?: number;
  actual_quantity?: number;
  is_delayed: boolean;
  progress_percentage: number;
  completion_rate: number;
  total_tasks: number;
  completed_tasks: number;
  tasks_progress: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionTask {
  id: string;
  production_cycle: string;
  name: string;
  sequence_order: number;
  status: ProductionTaskStatus;
  planned_duration_days: number;
  actual_duration_days?: number;
  depends_on?: string;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  description?: string;
  notes?: string;
  is_delayed: boolean;
  can_start: boolean;
  dependent_tasks_count: number;
  blocking_tasks_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionCycleCreate {
  activity: string;
  title: string;
  duration_days: number;
  start_date: string;
  expected_end_date: string;
  target_quantity?: number;
  status?: ProductionCycleStatus;
}

export interface ProductionTaskCreate {
  production_cycle: string;
  name: string;
  sequence_order: number;
  planned_duration_days: number;
  depends_on?: string;
  planned_start_date: string;
  planned_end_date: string;
  description?: string;
}

export interface ProductionProgress {
  cycle_id: string;
  progress_percentage: number;
  completion_rate: number;
  total_tasks: number;
  completed_tasks: number;
  delayed_tasks: number;
  is_delayed: boolean;
  estimated_completion?: string;
}

export const ProductionService = {
  // Cycles de production
  async listCycles(entrepreneurId: string, params?: Record<string, any>) {
    return request(`/production/cycles/${buildQuery({ entrepreneur_id: entrepreneurId, ...params })}`);
  },

  async getCycle(cycleId: string) {
    return request(`/production/cycles/${cycleId}/`);
  },

  async createCycle(data: ProductionCycleCreate) {
    return request(`/production/cycles/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateCycle(cycleId: string, data: Partial<ProductionCycle>) {
    return request(`/production/cycles/${cycleId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteCycle(cycleId: string) {
    return request(`/production/cycles/${cycleId}/`, {
      method: 'DELETE',
    });
  },

  async getCycleProgress(cycleId: string): Promise<ProductionProgress> {
    return request(`/production/cycles/${cycleId}/progress/`);
  },

  async getCycleTasks(cycleId: string) {
    return request(`/production/cycles/${cycleId}/tasks/`);
  },

  // Tâches de production
  async listTasks(cycleId?: string, params?: Record<string, any>) {
    const queryParams = cycleId ? { cycle_id: cycleId, ...params } : params;
    return request(`/production/tasks/${buildQuery(queryParams)}`);
  },

  async getTask(taskId: string) {
    return request(`/production/tasks/${taskId}/`);
  },

  async createTask(data: ProductionTaskCreate) {
    return request(`/production/tasks/`, {
      method: 'POST',
      body: data,
    });
  },

  async updateTask(taskId: string, data: Partial<ProductionTask>) {
    return request(`/production/tasks/${taskId}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteTask(taskId: string) {
    return request(`/production/tasks/${taskId}/`, {
      method: 'DELETE',
    });
  },

  async startTask(taskId: string) {
    return request(`/production/tasks/${taskId}/start/`, {
      method: 'POST',
    });
  },

  async completeTask(taskId: string) {
    return request(`/production/tasks/${taskId}/complete/`, {
      method: 'POST',
    });
  },

  async taskAction(taskId: string, action: 'start' | 'complete' | 'pause' | 'cancel', notes?: string) {
    return request(`/production/tasks/${taskId}/action/`, {
      method: 'POST',
      body: { action, notes },
    });
  },
};






