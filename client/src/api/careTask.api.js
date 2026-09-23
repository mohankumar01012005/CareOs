import { apiClient } from './client';

/**
 * Care Task API Service
 */
export const careTaskApi = {
  /**
   * List all care tasks for a care circle with optional tab, date, filters, and search
   */
  async getCircleTasks(circleId, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await apiClient(`/api/care-circles/${circleId}/tasks${queryString}`, {
      method: 'GET',
    });
    return response.data; // { tasks: [...] }
  },

  /**
   * Get single task by ID
   */
  async getTaskById(circleId, taskId) {
    const response = await apiClient(`/api/care-circles/${circleId}/tasks/${taskId}`, {
      method: 'GET',
    });
    return response.data; // { task: { ... } }
  },

  /**
   * Create a new care task
   */
  async createTask(circleId, taskData) {
    const response = await apiClient(`/api/care-circles/${circleId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    return response.data; // { task: { ... } }
  },

  /**
   * Update task details
   */
  async updateTask(circleId, taskId, updates) {
    const response = await apiClient(`/api/care-circles/${circleId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response.data; // { task: { ... } }
  },

  /**
   * Update task status (and optional completionNotes)
   */
  async updateTaskStatus(circleId, taskId, { status, completionNotes }) {
    const response = await apiClient(`/api/care-circles/${circleId}/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, completionNotes }),
    });
    return response.data; // { task: { ... } }
  },

  /**
   * Delete a task
   */
  async deleteTask(circleId, taskId) {
    const response = await apiClient(`/api/care-circles/${circleId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    return response.data;
  },

  /**
   * Get today's task timeline & aggregate summary
   */
  async getTodayTaskSummary(circleId, date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const response = await apiClient(`/api/care-circles/${circleId}/tasks/summary/today${query}`, {
      method: 'GET',
    });
    return response.data; // { date, summary, timeline }
  },

  /**
   * Get caregiver workload distribution telemetry
   */
  async getCaregiverWorkload(circleId) {
    const response = await apiClient(`/api/care-circles/${circleId}/tasks/workload`, {
      method: 'GET',
    });
    return response.data; // { totalActiveTasks, unassignedCount, workload }
  },
};
