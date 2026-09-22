import React from 'react';
import { Icon } from './Icon';
import { Button } from './Button';

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  actionIcon = 'add',
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl bg-surface-container-low/60 border border-dashed border-outline-variant/60 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center mb-4">
        <Icon name={icon} size={28} />
      </div>

      <h4 className="font-serif text-lg sm:text-xl text-on-surface font-semibold">
        {title}
      </h4>

      {description && (
        <p className="text-xs sm:text-sm text-on-surface-variant max-w-sm mt-1.5 leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <div className="mt-5">
          <Button
            variant="primary"
            size="sm"
            icon={actionIcon}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
