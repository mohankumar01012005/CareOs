import { STORAGE_KEYS } from '../constants/storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * In-flight refresh promise to prevent duplicate refresh requests
 */
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Format error message from API response data
 */
function extractErrorMessage(data, status) {
  if (!data) {
    if (status === 502 || status === 503 || status === 504) {
      return 'Unable to connect to CareOS server. Please make sure the server is running.';
    }
    return `Request failed with status ${status}`;
  }

  // If backend returned structured express-validator errors array
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const errorMessages = data.errors
      .map((err) => (typeof err === 'string' ? err : err.message || err.msg))
      .filter(Boolean);

    if (errorMessages.length > 0) {
      return errorMessages.join('. ');
    }
  }

  return data.message || `Request failed with status ${status}`;
}

/**
 * Centralized API request wrapper
 */
export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Attach access token if present
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    let response;
    try {
      response = await fetch(url, config);
    } catch (networkErr) {
      const error = new Error('Unable to connect to CareOS server. Please make sure the server is running.');
      error.isNetworkError = true;
      error.originalError = networkErr;
      throw error;
    }

    // Handle 401 Unauthorized (Expired or Invalid Access Token)
    if (
      response.status === 401 &&
      !options._retry &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/refresh')
    ) {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;

          try {
            const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            const refreshData = await refreshRes.json();

            if (refreshRes.ok && refreshData.success && refreshData.data?.tokens) {
              const newAccessToken = refreshData.data.tokens.accessToken;
              const newRefreshToken = refreshData.data.tokens.refreshToken;

              localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
              localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

              isRefreshing = false;
              onRefreshed(newAccessToken);
            } else {
              // Refresh failed - session revoked or invalid
              isRefreshing = false;
              localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
              localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
              localStorage.removeItem(STORAGE_KEYS.USER);
              window.dispatchEvent(new CustomEvent('careos:auth_expired'));
              throw new Error(refreshData.message || 'Session expired. Please log in again.');
            }
          } catch (refreshErr) {
            isRefreshing = false;
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
            window.dispatchEvent(new CustomEvent('careos:auth_expired'));
            throw refreshErr;
          }
        }

        // Wait for token refresh to complete then retry
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(async (newToken) => {
            try {
              const retryConfig = {
                ...options,
                _retry: true,
                headers: {
                  ...headers,
                  Authorization: `Bearer ${newToken}`,
                },
              };
              const retryRes = await fetch(url, retryConfig);
              const retryData = await retryRes.json();
              if (!retryRes.ok) {
                const message = extractErrorMessage(retryData, retryRes.status);
                const err = new Error(message);
                err.status = retryRes.status;
                err.code = retryData?.code;
                err.errors = retryData?.errors;
                return reject(err);
              }
              resolve(retryData);
            } catch (err) {
              reject(err);
            }
          });
        });
      }
    }

    // Safely parse response body
    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      const textBody = await response.text();
      // Detect proxy connection errors from Vite/gateway
      if (
        textBody.includes('ECONNREFUSED') ||
        textBody.includes('proxy error') ||
        response.status >= 502
      ) {
        const error = new Error('Unable to connect to CareOS server. Please make sure the server is running.');
        error.status = response.status;
        error.isNetworkError = true;
        throw error;
      }
    }

    if (!response.ok) {
      const message = extractErrorMessage(data, response.status);
      const error = new Error(message);
      error.status = response.status;
      error.code = data?.code;
      error.errors = data?.errors;
      throw error;
    }

    return data;
  } catch (error) {
    if (
      error.name === 'TypeError' ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError')
    ) {
      error.message = 'Unable to connect to CareOS server. Please make sure the server is running.';
    }
    throw error;
  }
}
