import { apiClient } from './client';

/**
 * Medication API Service
 */
export const medicationApi = {
  /**
   * List all medications for a care circle with optional status and search filter
   */
  async getCircleMedications(circleId, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await apiClient(`/api/care-circles/${circleId}/medications${queryString}`, {
      method: 'GET',
    });
    return response.data; // { medications: [...] }
  },

  /**
   * Get single medication dossier by ID (with telemetry & recent doses)
   */
  async getMedicationById(circleId, medicationId) {
    const response = await apiClient(`/api/care-circles/${circleId}/medications/${medicationId}`, {
      method: 'GET',
    });
    return response.data; // { medication: {...}, recentDoses: [...], telemetry: {...} }
  },

  /**
   * Create a new medication
   */
  async createMedication(circleId, medicationData) {
    const response = await apiClient(`/api/care-circles/${circleId}/medications`, {
      method: 'POST',
      body: JSON.stringify(medicationData),
    });
    return response.data; // { medication: {...} }
  },

  /**
   * Update medication configuration
   */
  async updateMedication(circleId, medicationId, updates) {
    const response = await apiClient(`/api/care-circles/${circleId}/medications/${medicationId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response.data; // { medication: {...} }
  },

  /**
   * Discontinue a medication
   */
  async discontinueMedication(circleId, medicationId) {
    const response = await apiClient(`/api/care-circles/${circleId}/medications/${medicationId}`, {
      method: 'DELETE',
    });
    return response.data; // { medication: {...} }
  },

  /**
   * Record a dose administration (TAKEN / SKIPPED / MISSED)
   */
  async recordDose(circleId, medicationId, doseData) {
    const response = await apiClient(`/api/care-circles/${circleId}/medications/${medicationId}/doses`, {
      method: 'POST',
      body: JSON.stringify(doseData),
    });
    return response.data; // { doseLog: {...}, stockRemaining: number }
  },

  /**
   * Get today's daily timeline schedule & summary
   */
  async getTodaySchedule(circleId, date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const response = await apiClient(`/api/care-circles/${circleId}/medications/schedule/today${query}`, {
      method: 'GET',
    });
    return response.data; // { date, summary, timeline: { morning, afternoon, evening, night, as_needed } }
  },

  /**
   * Get 7-day adherence statistics & streak
   */
  async getAdherenceStats(circleId) {
    const response = await apiClient(`/api/care-circles/${circleId}/medications/adherence/stats`, {
      method: 'GET',
    });
    return response.data; // { averageAdherenceRate, streakDays, history: [...] }
  },

  /**
   * Get circle-wide dose administration logs history
   */
  async getCircleDosesHistory(circleId, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await apiClient(`/api/care-circles/${circleId}/medications/doses/history${queryString}`, {
      method: 'GET',
    });
    return response.data; // { doses: [...], total, count }
  },

  /**
   * Get historical dose logs for a specific medication
   */
  async getMedicationDoses(circleId, medicationId, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await apiClient(`/api/care-circles/${circleId}/medications/${medicationId}/doses${queryString}`, {
      method: 'GET',
    });
    return response.data; // { doses: [...], total, count }
  },

  /**
   * Update notes or reason on a logged dose
   */
  async updateDoseLog(circleId, doseLogId, data) {
    const response = await apiClient(`/api/care-circles/${circleId}/medications/doses/${doseLogId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data; // { doseLog: {...} }
  },

  /**
   * Refill medication inventory stock
   */
  async refillStock(circleId, medicationId, refillData) {
    const response = await apiClient(`/api/care-circles/${circleId}/medications/${medicationId}/refill`, {
      method: 'PATCH',
      body: JSON.stringify(refillData),
    });
    return response.data; // { medicationId, stock: {...} }
  },
};
