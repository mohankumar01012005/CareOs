import React from 'react';

/**
 * Material Symbols Outlined Icon Wrapper
 */
export function Icon({
  name,
  className = '',
  size = 20,
  fill = false,
  ...props
}) {
  return (
    <span
      className={`material-symbols-outlined ${fill ? 'fill' : ''} ${className}`}
      style={{ fontSize: `${size}px`, width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}
