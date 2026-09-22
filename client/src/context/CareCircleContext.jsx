import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { careCircleApi } from '../api/careCircle.api';
import { STORAGE_KEYS } from '../constants/storage';
import {
  isMainCaretaker,
  isDoctor,
  canManageCircle,
  canInviteMembers,
  canManageMedications,
  canSetClinicalBaselines,
  canManageTasks,
  canViewDocuments,
  canUploadDocuments,
} from '../constants/roles';

export const CareCircleContext = createContext(null);

export function CareCircleProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [memberships, setMemberships] = useState([]);
  const [activeCircleId, setActiveCircleId] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.ACTIVE_CIRCLE_ID) || null
  );
  const [isLoadingCircles, setIsLoadingCircles] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all care circles for authenticated user
   */
  const loadCircles = useCallback(async () => {
    if (!isAuthenticated) {
      setMemberships([]);
      setActiveCircleId(null);
      return [];
    }

    setIsLoadingCircles(true);
    setError(null);
    try {
      const data = await careCircleApi.getUserCareCircles();
      const userMemberships = Array.isArray(data) ? data : [];
      setMemberships(userMemberships);

      if (userMemberships.length > 0) {
        const savedId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CIRCLE_ID);
        const matchingSaved = userMemberships.find(
          (m) => (m.careCircle?._id || m.careCircle?.id || m.careCircle) === savedId
        );

        if (matchingSaved) {
          const matchedCircleId = matchingSaved.careCircle?._id || matchingSaved.careCircle?.id || matchingSaved.careCircle;
          setActiveCircleId(matchedCircleId);
        } else {
          const firstCircleId =
            userMemberships[0].careCircle?._id ||
            userMemberships[0].careCircle?.id ||
            userMemberships[0].careCircle;
          setActiveCircleId(firstCircleId);
          localStorage.setItem(STORAGE_KEYS.ACTIVE_CIRCLE_ID, firstCircleId);
        }
      } else {
        setActiveCircleId(null);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_CIRCLE_ID);
      }

      return userMemberships;
    } catch (err) {
      console.error('Failed to load user care circles:', err);
      setError(err.message || 'Failed to load care circles');
      return [];
    } finally {
      setIsLoadingCircles(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCircles();
  }, [loadCircles]);

  /**
   * Select active circle
   */
  const selectCircle = useCallback((circleId) => {
    setActiveCircleId(circleId);
    if (circleId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CIRCLE_ID, circleId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CIRCLE_ID);
    }
  }, []);

  /**
   * Create a new care circle & recipient
   */
  const createCircle = async ({ name, recipient }) => {
    setError(null);
    try {
      const result = await careCircleApi.createCareCircle({ name, recipient });
      await loadCircles();
      if (result?.careCircle?.id || result?.careCircle?._id) {
        const newId = result.careCircle.id || result.careCircle._id;
        selectCircle(newId);
      }
      return result;
    } catch (err) {
      setError(err.message || 'Failed to create care circle');
      throw err;
    }
  };

  /**
   * Active membership, circle, recipient, and role derivation
   */
  const activeMembership = useMemo(() => {
    if (!activeCircleId || memberships.length === 0) return null;
    return (
      memberships.find(
        (m) => (m.careCircle?._id || m.careCircle?.id || m.careCircle) === activeCircleId
      ) || null
    );
  }, [activeCircleId, memberships]);

  const activeCircle = useMemo(() => {
    if (!activeMembership) return null;
    return typeof activeMembership.careCircle === 'object'
      ? activeMembership.careCircle
      : null;
  }, [activeMembership]);

  const activeRecipient = useMemo(() => {
    if (!activeCircle) return null;
    return typeof activeCircle.careRecipient === 'object'
      ? activeCircle.careRecipient
      : null;
  }, [activeCircle]);

  const activeRole = useMemo(() => {
    return activeMembership?.role || null;
  }, [activeMembership]);

  /**
   * Computed role capability checks for the active circle
   */
  const permissions = useMemo(() => {
    const role = activeRole;
    return {
      role,
      isMainCaretaker: isMainCaretaker(role),
      isDoctor: isDoctor(role),
      canManageCircle: canManageCircle(role),
      canInviteMembers: canInviteMembers(role),
      canManageMedications: canManageMedications(role),
      canSetClinicalBaselines: canSetClinicalBaselines(role),
      canManageTasks: canManageTasks(role),
      canViewDocuments: canViewDocuments(role),
      canUploadDocuments: canUploadDocuments(role),
      canLogNotes: true,
      canLogVitals: true,
    };
  }, [activeRole]);

  const value = {
    memberships,
    activeCircleId,
    activeCircle,
    activeRecipient,
    activeRole,
    permissions,
    hasCircles: memberships.length > 0,
    isLoadingCircles,
    error,
    selectCircle,
    refreshCircles: loadCircles,
    createCircle,
  };

  return <CareCircleContext.Provider value={value}>{children}</CareCircleContext.Provider>;
}
