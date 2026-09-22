import React from 'react';
import { Icon } from './Icon';

const VARIANTS = {
  primary: 'bg-primary-container text-on-primary-container',
  'primary-dim': 'bg-primary-fixed text-on-primary-fixed',
  secondary: 'bg-secondary-fixed text-on-secondary-fixed',
  tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed',
  doctor: 'bg-teal-100 text-teal-900 border border-teal-200',
  aide: 'bg-amber-100 text-amber-900 border border-amber-200',
  warning: 'bg-warning-container text-on-warning-container',
  error: 'bg-error-container text-on-error-container',
  neutral: 'bg-surface-container text-on-surface-variant',
  outline: 'border border-outline-variant text-on-surface-variant bg-transparent',
};

const SIZES = {
  sm: 'px-2 py-0.5 text-xs font-semibold rounded-full',
  md: 'px-2.5 py-1 text-xs font-bold rounded-lg',
  lg: 'px-3 py-1.5 text-sm font-bold rounded-xl',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  icon,
  className = '',
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.neutral;
  const sizeClass = SIZES[size] || SIZES.sm;

  return (
    <span
      className={`inline-flex items-center gap-1 leading-none tracking-wide select-none ${variantClass} ${sizeClass} ${className}`}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 12 : 14} />}
      <span>{children}</span>
    </span>
  );
}
