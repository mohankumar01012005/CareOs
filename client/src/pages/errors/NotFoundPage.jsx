import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card variant="lowest" padding="lg" className="max-w-md w-full text-center shadow-lg">
        <div className="w-16 h-16 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto mb-4">
          <Icon name="search_off" size={32} />
        </div>
        <h1 className="font-serif text-3xl font-bold text-on-surface">
          Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-2 leading-relaxed">
          The page you are looking for does not exist or may have been moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            icon="home"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="surface"
            size="md"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </div>
      </Card>
    </div>
  );
}
