import React, { forwardRef } from 'react';
import { Icon } from './Icon';

export const Select = forwardRef(function Select(
  {
    label,
    options = [],
    error,
    helperText,
    id,
    className = '',
    required = false,
    disabled = false,
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-on-surface-variant flex items-center gap-1"
        >
          {label}
          {required && <span className="text-error font-bold">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          className={`w-full h-11 pl-3.5 pr-10 bg-surface-container-lowest text-on-surface text-sm rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-surface-container-low disabled:cursor-not-allowed appearance-none ${
            error
              ? 'border-error focus:border-error focus:ring-error/20'
              : 'border-outline-variant focus:border-primary focus:ring-primary/20'
          } ${className}`}
          {...props}
        >
          {children
            ? children
            : options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
        </select>

        <div className="absolute right-3 pointer-events-none text-outline flex items-center">
          <Icon name="unfold_more" size={18} />
        </div>
      </div>

      {error && (
        <p className="text-xs text-error flex items-center gap-1 mt-0.5">
          <Icon name="error" size={14} />
          <span>{error}</span>
        </p>
      )}

      {helperText && !error && (
        <p className="text-xs text-on-surface-variant/80 mt-0.5">{helperText}</p>
      )}
    </div>
  );
});
