import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  documentTitle,
  isDeleting = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/50 backdrop-blur-xs">
      <Card
        variant="lowest"
        padding="none"
        className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-error/30 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-error-container/30 text-error flex items-center justify-center mx-auto">
            <Icon name="delete_forever" size={32} />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-serif text-xl font-bold text-on-surface">
              Delete Document?
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Are you sure you want to delete <strong className="text-on-surface">"{documentTitle}"</strong>? This will permanently remove the record from the Care Circle vault.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-2.5">
            <Button
              type="button"
              variant="surface"
              size="md"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="error"
              size="md"
              icon={isDeleting ? 'sync' : 'delete'}
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 font-bold text-xs shadow-sm bg-error text-on-error hover:bg-error/90"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
