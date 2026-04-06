import { request, buildQuery } from './http';

export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  type?: string;
  type_display?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  total_amount?: number | string;
  created_at?: string;
  updated_at?: string;
}

export const CategoryService = {

  async list(params?: Record<string, any>): Promise<CategoryItem[]> {
    const data = await request(`/finances/categories/${buildQuery(params)}`);
    // Some endpoints return {results: []}, others return [] directly
    const results = Array.isArray(data) ? data : (data?.results ?? []);
    return results as CategoryItem[];
  },

  async create(data: CategoryItem) {
    return request(`/finances/categories/`, {
      method: 'POST',
      body: data,
    });
  },

  async update(id: string, data: CategoryItem) {
    return request(`/finances/categories/${id}/`, {
      method: 'PUT',
      body: data,
    });
  },

  async delete(id: string) {
    return request(`/finances/categories/${id}/`, {
      method: 'DELETE',
    });
  },

  async get(id: string) {
    return request(`/finances/categories/${id}/`);
  },

};


