import { apiClient } from './client';

/**
 * Care Circle API Service
 */
export const careCircleApi = {
  /**
   * Get all Care Circles where the authenticated user is an active member
   */
  async getUserCareCircles() {
    const response = await apiClient('/api/care-circles', {
      method: 'GET',
    });
    return response.data;
  },

  /**
   * Get details of a specific Care Circle including care recipient & member list
   */
  async getCareCircleDetails(circleId) {
    const response = await apiClient(`/api/care-circles/${circleId}`, {
      method: 'GET',
    });
    return response.data;
  },

  /**
   * Create a new Care Circle and Care Recipient (Creator becomes MAIN_CARETAKER)
   */
  async createCareCircle({ name, recipient }) {
    const response = await apiClient('/api/care-circles', {
      method: 'POST',
      body: JSON.stringify({ name, recipient }),
    });
    return response.data;
  },
};
