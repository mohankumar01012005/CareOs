import React, { forwardRef } from 'react';
import { Icon } from './Icon';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon,
    iconRight,
    id,
    type = 'text',
    className = '',
    required = false,
    disabled = false,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-on-surface-variant flex items-center gap-1"
        >
          {label}
          {required && <span className="text-error font-bold">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-outline pointer-events-none flex items-center">
            <Icon name={icon} size={18} />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          className={`w-full h-11 px-3.5 ${icon ? 'pl-10' : ''} ${
            iconRight ? 'pr-10' : ''
          } bg-surface-container-lowest text-on-surface text-sm rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-surface-container-low disabled:cursor-not-allowed placeholder:text-outline-variant ${
            error
              ? 'border-error focus:border-error focus:ring-error/20 text-error'
              : 'border-outline-variant focus:border-primary focus:ring-primary/20'
          } ${className}`}
          {...props}
        />

        {iconRight && (
          <div className="absolute right-3 text-outline flex items-center">
            {typeof iconRight === 'string' ? <Icon name={iconRight} size={18} /> : iconRight}
          </div>
        )}
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
