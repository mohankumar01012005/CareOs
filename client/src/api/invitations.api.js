import { apiClient } from './client';

/**
 * Invitations API Service
 */
export const invitationsApi = {
  /**
   * Verify an invitation token and fetch circle metadata
   */
  async verifyInvitation(token) {
    const response = await apiClient(`/api/invitations/${token}`, {
      method: 'GET',
    });
    return response.data;
  },

  /**
   * Accept an invitation as an authenticated user
   */
  async acceptInvitation(token) {
    const response = await apiClient(`/api/invitations/${token}/accept`, {
      method: 'POST',
    });
    return response.data;
  },

  /**
   * Accept an invitation and register a new user in one step
   */
  async acceptAndRegister(token, { name, password, phone }) {
    const response = await apiClient(`/api/invitations/${token}/accept-and-register`, {
      method: 'POST',
      body: JSON.stringify({ name, password, phone }),
    });
    return response.data;
  },
};
