import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCareCircle } from '../hooks/useCareCircle';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function CircleRequiredRoute({ children }) {
  const { hasCircles, isLoadingCircles } = useCareCircle();

  if (isLoadingCircles) {
    return <LoadingSpinner fullPage text="Loading your care circle..." />;
  }

  if (!hasCircles) {
    return <Navigate to="/onboarding/create-circle" replace />;
  }

  return children;
}
