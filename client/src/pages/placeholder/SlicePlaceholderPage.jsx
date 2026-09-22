import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useCareCircle } from '../../hooks/useCareCircle';

export function SlicePlaceholderPage({
  title,
  description,
  icon = 'construction',
  sliceNumber,
}) {
  const navigate = useNavigate();
  const { activeRecipient } = useCareCircle();

  const recipientName = activeRecipient?.fullName || 'Care Recipient';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
            <Icon name={icon} size={24} />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">
              {title}
            </h1>
            <p className="text-xs text-on-surface-variant">
              Care coordination for {recipientName}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon="arrow_back"
          onClick={() => navigate('/dashboard')}
        >
          Dashboard
        </Button>
      </div>

      <Card variant="lowest" padding="lg" className="text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto mb-4">
          <Icon name={icon} size={30} />
        </div>
        <h2 className="font-serif text-xl font-bold text-on-surface">
          {title} Module
        </h2>
        <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto mt-2 leading-relaxed">
          {description ||
            'The frontend foundation is ready. This module will be wired to the completed CareOS backend engine in the next vertical slice.'}
        </p>

        {sliceNumber && (
          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-xs font-semibold text-on-surface-variant border border-outline-variant/30">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Target: Frontend Slice {sliceNumber}</span>
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
