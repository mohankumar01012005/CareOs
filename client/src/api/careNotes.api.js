import { apiClient } from './client';

/**
 * Care Notes & Shift Handover API Service
 */
export const careNotesApi = {
  /**
   * List all care notes in a Care Circle with optional filters & pagination
   */
  async getCircleNotes(circleId, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await apiClient(`/api/care-circles/${circleId}/notes${queryString}`, {
      method: 'GET',
    });
    return response.data; // { notes: [...], count, total }
  },

  /**
   * Get single note dossier by ID
   */
  async getNoteById(circleId, noteId) {
    const response = await apiClient(`/api/care-circles/${circleId}/notes/${noteId}`, {
      method: 'GET',
    });
    return response.data; // { note: { ... } }
  },

  /**
   * Create a new care note or shift handover
   */
  async createNote(circleId, noteData) {
    const response = await apiClient(`/api/care-circles/${circleId}/notes`, {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
    return response.data; // { note: { ... } }
  },

  /**
   * Update a care note
   */
  async updateNote(circleId, noteId, updates) {
    const response = await apiClient(`/api/care-circles/${circleId}/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response.data; // { note: { ... } }
  },

  /**
   * Toggle pin status for a note (Caretakers & Doctors)
   */
  async togglePinNote(circleId, noteId, isPinned) {
    const response = await apiClient(`/api/care-circles/${circleId}/notes/${noteId}/pin`, {
      method: 'PATCH',
      body: JSON.stringify({ isPinned }),
    });
    return response.data; // { note: { ... } }
  },

  /**
   * Acknowledge reading a handover note (Incoming caregiver / circle member)
   */
  async acknowledgeNote(circleId, noteId) {
    const response = await apiClient(`/api/care-circles/${circleId}/notes/${noteId}/acknowledge`, {
      method: 'POST',
    });
    return response.data; // { note: { ... } }
  },

  /**
   * Delete a care note
   */
  async deleteNote(circleId, noteId) {
    const response = await apiClient(`/api/care-circles/${circleId}/notes/${noteId}`, {
      method: 'DELETE',
    });
    return response.data; // { noteId }
  },

  /**
   * Get the latest shift handover note for quick dashboard / handover display
   */
  async getLatestHandover(circleId) {
    const response = await apiClient(`/api/care-circles/${circleId}/notes/recent/handover`, {
      method: 'GET',
    });
    return response.data; // { note: { ... } | null }
  },

  /**
   * Get aggregated daily care notes summary & alerts telemetry
   */
  async getDailyNotesSummary(circleId, date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const response = await apiClient(`/api/care-circles/${circleId}/notes/summary/daily${query}`, {
      method: 'GET',
    });
    return response.data; // { date, summary: { totalNotesCount, urgentNotesCount, handoverCount, vitalsLoggedCount, latestVitals } }
  },
};
