import { apiClient } from './client';

/**
 * Invitations API Service
 */
export const invitationsApi = {
  /**
   * Create a new invitation for a Care Circle (Main Caretaker only)
   */
  async createInvitation(circleId, { email, role }) {
    const response = await apiClient(`/api/care-circles/${circleId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
    return response.data; // { invitation: {...}, token: string, expiresAt: string }
  },

  /**
   * Get all invitations for a Care Circle (Main Caretaker only)
   */
  async getCircleInvitations(circleId) {
    const response = await apiClient(`/api/care-circles/${circleId}/invitations`, {
      method: 'GET',
    });
    return response.data; // array of invitations
  },

  /**
   * Revoke an active pending invitation (Main Caretaker only)
   */
  async revokeInvitation(circleId, invitationId) {
    const response = await apiClient(`/api/care-circles/${circleId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
    return response.data;
  },

  /**
   * Verify an invitation token and fetch safe metadata (Public)
   */
  async verifyInvitation(token) {
    const response = await apiClient(`/api/invitations/${token}`, {
      method: 'GET',
    });
    return response.data; // { valid: true, circleName, email, role, inviterName, expiresAt }
  },

  /**
   * Accept an invitation as an authenticated user
   */
  async acceptInvitation(token) {
    const response = await apiClient(`/api/invitations/${token}/accept`, {
      method: 'POST',
    });
    return response.data; // { membership: {...}, role, careCircleId }
  },

  /**
   * Accept an invitation and register a new user in one atomic step (Public)
   */
  async acceptAndRegister(token, { name, password, phone, profilePhoto }) {
    const response = await apiClient(`/api/invitations/${token}/accept-and-register`, {
      method: 'POST',
      body: JSON.stringify({ name, password, phone, profilePhoto }),
    });
    return response.data; // { user: {...}, membership: {...}, role, careCircleId, tokens: {...} }
  },
};
