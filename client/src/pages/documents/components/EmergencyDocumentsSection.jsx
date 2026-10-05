import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import { DocumentCard } from './DocumentCard';

export function EmergencyDocumentsSection({
  documents = [],
  isLoading = false,
  currentUser,
  userRole,
  onView,
  onEdit,
  onDelete,
  onAddDocument,
}) {
  return (
    <div className="space-y-6">
      {/* Emergency Alert Spotlight Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-error-container/40 via-surface-container-low to-primary-container/20 p-5 sm:p-6 border border-error/30 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 max-w-2xl">
            <div className="w-11 h-11 rounded-2xl bg-error text-on-error flex items-center justify-center shrink-0 shadow-sm">
              <Icon name="emergency" size={24} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-error">
                  Emergency Quick Access
                </span>
                <span className="w-2 h-2 rounded-full bg-error inline-block animate-pulse" />
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-on-surface">
                Crisis Records & Emergency Directives
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Critical documents flagged for instant accessibility during medical emergencies, ER visits, and caregiver transitions.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            icon="add"
            onClick={onAddDocument}
            className="font-bold shadow-sm self-start sm:self-center shrink-0"
          >
            Add Emergency Doc
          </Button>
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
      {!isLoading && documents.length === 0 && (
        <Card variant="lowest" padding="lg" className="border border-dashed border-outline-variant/50 text-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-error-container/20 text-error flex items-center justify-center mx-auto mb-3">
            <Icon name="emergency_share" size={32} />
          </div>
          <h3 className="font-serif text-lg font-bold text-on-surface">
            No Emergency Documents Found
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto mt-1.5 leading-relaxed">
            Flag essential insurance policies, DNR orders, advance directives, hospital IDs, and allergy cards as "Emergency Accessible" so any caregiver or doctor can access them instantly in a crisis.
          </p>
          <div className="mt-5">
            <Button
              variant="primary"
              size="md"
              icon="add"
              onClick={onAddDocument}
              className="font-bold text-xs sm:text-sm"
            >
              Upload Emergency Document
            </Button>
          </div>
        </Card>
      )}

      {/* Documents Grid */}
      {!isLoading && documents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {documents.map((doc) => (
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
      )}
    </div>
  );
}
