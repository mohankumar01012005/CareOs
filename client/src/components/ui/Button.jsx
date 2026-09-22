import React from 'react';
import { Icon } from './Icon';

const VARIANTS = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-hover active:scale-[0.98] shadow-sm',
  'primary-container':
    'bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary active:scale-[0.98]',
  secondary:
    'bg-secondary text-on-secondary hover:opacity-90 active:scale-[0.98]',
  outline:
    'border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-low active:bg-surface-container',
  ghost:
    'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
  danger:
    'bg-error-container text-on-error-container hover:bg-error hover:text-on-error active:scale-[0.98]',
  surface:
    'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface active:bg-surface-container-highest',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 font-medium rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 font-semibold rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 font-semibold rounded-xl',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  iconRight,
  className = '',
  type = 'button',
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        <>
          {icon && <Icon name={icon} size={iconSize} />}
          {children}
          {iconRight && <Icon name={iconRight} size={iconSize} />}
        </>
      )}
    </button>
  );
}
