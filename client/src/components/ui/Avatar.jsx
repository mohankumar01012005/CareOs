import React from 'react';

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm font-semibold',
  lg: 'w-12 h-12 text-base font-bold',
  xl: 'w-16 h-16 text-lg font-bold',
};

const STATUS_COLORS = {
  online: 'bg-tertiary-container',
  stable: 'bg-tertiary-container',
  warning: 'bg-secondary-container',
  critical: 'bg-error',
};

function getInitials(name = '') {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  name = 'User',
  size = 'md',
  status,
  className = '',
}) {
  const sizeClass = SIZES[size] || SIZES.md;
  const initials = getInitials(name);

  return (
    <div className={`relative inline-flex shrink-0 ${sizeClass} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover ring-2 ring-surface-container-lowest shadow-sm"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-primary-container text-on-primary-container ring-2 ring-surface-container-lowest shadow-sm flex items-center justify-center font-bold select-none">
          {initials}
        </div>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-surface-container-lowest ${
            STATUS_COLORS[status] || 'bg-tertiary-container'
          }`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
}
