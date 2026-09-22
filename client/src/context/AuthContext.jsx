import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.api';
import { STORAGE_KEYS } from '../constants/storage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null
  );
  const [refreshToken, setRefreshToken] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Save session tokens & user to storage and state
   */
  const setSession = useCallback((tokens, userData) => {
    if (tokens?.accessToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      setAccessToken(tokens.accessToken);
    }
    if (tokens?.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      setRefreshToken(tokens.refreshToken);
    }
    if (userData) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      setUser(userData);
    }
  }, []);

  /**
   * Clear session state and storage
   */
  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_CIRCLE_ID);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  /**
   * Verify authenticated session on application mount
   */
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe();
        if (isMounted && response?.user) {
          setUser(response.user);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
        }
      } catch (err) {
        console.warn('Session verification failed on mount:', err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initializeAuth();

    // Listen for global auth expired events triggered by API client
    const handleAuthExpired = () => {
      clearSession();
    };
    window.addEventListener('careos:auth_expired', handleAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('careos:auth_expired', handleAuthExpired);
    };
  }, [clearSession]);

  /**
   * Login action
   */
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const data = await authApi.login(email, password);
      setSession(data.tokens, data.user);
      return data.user;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  /**
   * Register action (Main Caretaker)
   */
  const register = async (formData) => {
    setAuthError(null);
    try {
      const data = await authApi.register(formData);
      setSession(data.tokens, data.user);
      return data.user;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    }
  };

  /**
   * Logout action
   */
  const logout = async () => {
    try {
      const token = refreshToken || localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (token) {
        await authApi.logout(token).catch(() => {});
      }
    } finally {
      clearSession();
    }
  };

  /**
   * Refresh current user profile
   */
  const refreshUser = async () => {
    try {
      const response = await authApi.getMe();
      if (response?.user) {
        setUser(response.user);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
      }
      return response?.user;
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: !!accessToken && !!user,
    isLoading,
    authError,
    setAuthError,
    login,
    register,
    logout,
    refreshUser,
    setSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
