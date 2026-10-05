import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import { DocumentCard } from './DocumentCard';

export function ExpiringDocumentsSection({
  expiringData,
  isLoading = false,
  currentUser,
  userRole,
  onView,
  onEdit,
  onDelete,
  onAddDocument,
}) {
  const expiringDocuments = expiringData?.expiringDocuments || [];
  const expiredDocuments = expiringData?.expiredDocuments || [];
  const expiringCount = expiringData?.expiringCount || 0;
  const expiredCount = expiringData?.expiredCount || 0;
  const windowDays = expiringData?.windowDays || 30;

  const totalAlerts = expiringCount + expiredCount;

  return (
    <div className="space-y-6">
      {/* Expiry Header Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-5 sm:p-6 border border-outline-variant/30 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 max-w-2xl">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              totalAlerts > 0
                ? 'bg-warning text-on-warning'
                : 'bg-primary text-on-primary'
            }`}>
              <Icon name="event_repeat" size={24} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Document Expiry & Renewal Telemetry
                </span>
                {totalAlerts > 0 && (
                  <span className="w-2 h-2 rounded-full bg-warning inline-block animate-pulse" />
                )}
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-on-surface">
                Upcoming Document Renewals
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Track prescriptions, medical IDs, and insurance policies requiring renewal within the next {windowDays} days.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-highest border border-outline-variant/30 text-xs font-bold">
              <span className="text-warning">● {expiringCount} Expiring</span>
              <span className="text-outline-variant">•</span>
              <span className="text-error">● {expiredCount} Expired</span>
            </div>

            <Button
              variant="primary"
              size="md"
              icon="add"
              onClick={onAddDocument}
              className="font-bold shadow-sm self-start sm:self-center shrink-0"
            >
              Add Document
            </Button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} variant="lowest" padding="md" className="border border-outline-variant/30 animate-pulse space-y-3">
              <div className="h-5 w-32 bg-surface-container-high rounded" />
              <div className="h-6 w-48 bg-surface-container-high rounded" />
              <div className="h-12 w-full bg-surface-container-high rounded" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && totalAlerts === 0 && (
        <Card variant="lowest" padding="lg" className="border border-dashed border-outline-variant/50 text-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-success-container/30 text-success flex items-center justify-center mx-auto mb-3">
            <Icon name="verified" size={32} />
          </div>
          <h3 className="font-serif text-lg font-bold text-on-surface">
            No Documents Are Expiring Soon
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto mt-1.5 leading-relaxed">
            All documents with expiry dates in this Care Circle are up to date and valid beyond {windowDays} days.
          </p>
        </Card>
      )}

      {/* Expiring Soon Section */}
      {!isLoading && expiringDocuments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-warning font-bold text-sm">
            <Icon name="warning" size={18} />
            <span>Expiring within {windowDays} Days ({expiringCount})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {expiringDocuments.map((doc) => (
              <DocumentCard
                key={doc._id || doc.id}
                document={doc}
                currentUser={currentUser}
                userRole={userRole}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Expired Documents Section */}
      {!isLoading && expiredDocuments.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-outline-variant/30">
          <div className="flex items-center gap-2 text-error font-bold text-sm">
            <Icon name="error" size={18} />
            <span>Already Expired ({expiredCount})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {expiredDocuments.map((doc) => (
              <DocumentCard
                key={doc._id || doc.id}
                document={doc}
                currentUser={currentUser}
                userRole={userRole}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
