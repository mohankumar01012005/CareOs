import { apiClient } from './client';

/**
 * Care Documents & Emergency Vault API Service
 */
export const careDocumentsApi = {
  /**
   * List all documents in a Care Circle with role-based filtering, categories, search & pagination
   * @param {string} circleId
   * @param {object} params - { category, privacyLevel, search, tags, isEmergencyAccessible, page, limit }
   */
  async getCircleDocuments(circleId, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await apiClient(`/api/care-circles/${circleId}/documents${queryString}`, {
      method: 'GET',
    });
    return response.data; // { documents: [...], count, total }
  },

  /**
   * Get emergency quick-access documents (accessible to all circle members during emergency)
   * @param {string} circleId
   */
  async getEmergencyDocuments(circleId) {
    const response = await apiClient(`/api/care-circles/${circleId}/documents/emergency`, {
      method: 'GET',
    });
    return response.data; // { documents: [...], count }
  },

  /**
   * Get expiring and expired documents telemetry
   * @param {string} circleId
   * @param {number} days - Lookup window in days (default: 30)
   */
  async getExpiringDocuments(circleId, days = 30) {
    const query = days ? `?days=${encodeURIComponent(days)}` : '';
    const response = await apiClient(`/api/care-circles/${circleId}/documents/expiring${query}`, {
      method: 'GET',
    });
    return response.data; // { windowDays, expiringCount, expiredCount, expiringDocuments: [...], expiredDocuments: [...] }
  },

  /**
   * Get single document by ID with role-based privacy enforcement and automatic VIEW audit logging
   * @param {string} circleId
   * @param {string} docId
   */
  async getDocumentById(circleId, docId) {
    const response = await apiClient(`/api/care-circles/${circleId}/documents/${docId}`, {
      method: 'GET',
    });
    return response.data; // { document: { ... } }
  },

  /**
   * Upload an encrypted binary document file directly to S3 vault
   * @param {string} circleId
   * @param {FormData} formData
   */
  async uploadDocumentFile(circleId, formData) {
    const response = await apiClient(`/api/care-circles/${circleId}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    return response.data; // { document: { ... } }
  },

  /**
   * Create a document reference in the vault (URL / external storage path)
   * @param {string} circleId
   * @param {object} documentData
   */
  async createDocument(circleId, documentData) {
    const response = await apiClient(`/api/care-circles/${circleId}/documents`, {
      method: 'POST',
      body: JSON.stringify(documentData),
    });
    return response.data; // { document: { ... } }
  },

  /**
   * Authorize and obtain a short-lived presigned GET download/preview URL
   * @param {string} circleId
   * @param {string} docId
   * @param {boolean} isInline - If true, requests inline disposition for preview
   */
  async getDocumentDownloadUrl(circleId, docId, isInline = false) {
    const query = isInline ? '?inline=true' : '';
    const response = await apiClient(`/api/care-circles/${circleId}/documents/${docId}/download${query}`, {
      method: 'GET',
    });
    return response.data; // { downloadUrl, expiresInSeconds, expiresAt, storageProvider, fileName, contentType }
  },

  /**
   * Update document metadata
   * @param {string} circleId
   * @param {string} docId
   * @param {object} updates
   */
  async updateDocument(circleId, docId, updates) {
    const response = await apiClient(`/api/care-circles/${circleId}/documents/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response.data; // { document: { ... } }
  },

  /**
   * Delete a document and its underlying S3 object from the vault
   * @param {string} circleId
   * @param {string} docId
   */
  async deleteDocument(circleId, docId) {
    const response = await apiClient(`/api/care-circles/${circleId}/documents/${docId}`, {
      method: 'DELETE',
    });
    return response.data; // { documentId }
  },

  /**
   * Get immutable access audit trail for a document (Caretakers only, or uploader for PERSONAL)
   * @param {string} circleId
   * @param {string} docId
   */
  async getDocumentAuditLogs(circleId, docId) {
    const response = await apiClient(`/api/care-circles/${circleId}/documents/${docId}/audit-logs`, {
      method: 'GET',
    });
    return response.data; // { documentId, title, auditLogs: [...] }
  },
};
