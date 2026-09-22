import { useContext } from 'react';
import { CareCircleContext } from '../context/CareCircleContext';

export function useCareCircle() {
  const context = useContext(CareCircleContext);
  if (!context) {
    throw new Error('useCareCircle must be used within a CareCircleProvider');
  }
  return context;
}
