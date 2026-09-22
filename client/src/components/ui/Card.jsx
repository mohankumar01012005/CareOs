import React from 'react';

const VARIANTS = {
  lowest: 'bg-surface-container-lowest border border-outline-variant/40 shadow-[0_1px_4px_rgba(0,0,0,0.03)]',
  low: 'bg-surface-container-low border border-outline-variant/30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]',
  container: 'bg-surface-container border border-outline-variant/40',
  high: 'bg-surface-container-high border border-outline-variant/50',
};

const PADDINGS = {
  none: 'p-0',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function Card({
  children,
  variant = 'lowest',
  padding = 'md',
  className = '',
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.lowest;
  const paddingClass = PADDINGS[padding] || PADDINGS.md;

  return (
    <div
      className={`rounded-2xl transition-all duration-200 ${variantClass} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
