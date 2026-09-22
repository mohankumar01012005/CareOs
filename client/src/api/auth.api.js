import { apiClient } from './client';

/**
 * Authentication API Service
 */
export const authApi = {
  /**
   * Log in user with email and password
   */
  async login(email, password) {
    const response = await apiClient('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return response.data;
  },

  /**
   * Register a new Main Caretaker
   */
  async register({ name, email, password, phone }) {
    const response = await apiClient('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    });
    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    const response = await apiClient('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    return response.data;
  },

  /**
   * Invalidate session / Log out
   */
  async logout(refreshToken) {
    return apiClient('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  /**
   * Get authenticated user profile
   */
  async getMe() {
    const response = await apiClient('/api/auth/me', {
      method: 'GET',
    });
    return response.data;
  },
};
