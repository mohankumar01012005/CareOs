import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCareCircle } from '../hooks/useCareCircle';

export function RoleGuard({ allowedRoles = [], children, fallback = null }) {
  const { activeRole } = useCareCircle();

  if (!activeRole || !allowedRoles.includes(activeRole)) {
    if (fallback) return fallback;
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
