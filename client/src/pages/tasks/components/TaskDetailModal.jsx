import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import {
  TASK_STATUS,
  TASK_STATUS_LABELS,
  TASK_STATUS_BADGE_VARIANTS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_BADGE_VARIANTS,
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_ICONS,
  TASK_TIME_SLOT_LABELS,
  TASK_TIME_SLOT_ICONS,
} from '../../../constants/roles';

export function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onUpdateStatus,
  onEdit,
  onDelete,
  canManage = false,
  isCreator = false,
}) {
  const [completionNotes, setCompletionNotes] = useState('');
  const [showCompletionInput, setShowCompletionInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!task) return null;

  const isCompleted = task.status === TASK_STATUS.COMPLETED;
  const isCancelled = task.status === TASK_STATUS.CANCELLED;

  const categoryLabel = TASK_CATEGORY_LABELS[task.category] || task.category || 'General';
  const categoryIcon = TASK_CATEGORY_ICONS[task.category] || 'task_alt';

  const priorityLabel = TASK_PRIORITY_LABELS[task.priority] || task.priority || 'Medium';
  const priorityVariant = TASK_PRIORITY_BADGE_VARIANTS[task.priority] || 'neutral';

  const statusLabel = TASK_STATUS_LABELS[task.status] || task.status;
  const statusVariant = TASK_STATUS_BADGE_VARIANTS[task.status] || 'neutral';

  const timeSlotLabel = TASK_TIME_SLOT_LABELS[task.timeSlot] || task.timeSlot || 'Morning';
  const timeSlotIcon = TASK_TIME_SLOT_ICONS[task.timeSlot] || 'schedule';

  const assigneeName = task.assignedTo?.name || 'Shared (Anyone Available)';
  const creatorName = task.createdBy?.name || 'Care Circle Member';

  const handleStatusChange = async (newStatus) => {
    setIsLoading(true);
    try {
      await onUpdateStatus(task.id || task._id, {
        status: newStatus,
        completionNotes: completionNotes.trim() || undefined,
      });
      setShowCompletionInput(false);
      setCompletionNotes('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Details"
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Header Badges & Title */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="neutral" size="sm" icon={categoryIcon}>
              {categoryLabel}
            </Badge>

            <Badge variant={priorityVariant} size="sm">
              {priorityLabel} Priority
            </Badge>

            <Badge variant={statusVariant} size="sm">
              {statusLabel}
            </Badge>
          </div>

          <h3 className="font-serif text-2xl font-bold text-on-surface leading-snug">
            {task.title}
          </h3>

          {task.description && (
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30">
              {task.description}
            </p>
          )}
        </div>

        {/* Schedule & Assignment Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          {/* Due Date & Time */}
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1">
            <span className="font-bold text-outline uppercase tracking-wider text-[11px] block">
              Scheduled For
            </span>
            <div className="flex items-center gap-1.5 font-bold text-sm text-on-surface">
              <Icon name="calendar_today" size={16} className="text-primary" />
              <span>{task.dueDate}</span>
            </div>
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <Icon name={timeSlotIcon} size={15} className="text-outline" />
              <span>
                {task.exactTime ? `${task.exactTime} • ${timeSlotLabel}` : timeSlotLabel}
              </span>
            </div>
          </div>

          {/* Assigned Caregiver */}
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1">
            <span className="font-bold text-outline uppercase tracking-wider text-[11px] block">
              Assigned To
            </span>
            <div className="flex items-center gap-2 pt-0.5">
              <Avatar name={assigneeName} size="sm" />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-on-surface truncate">
                  {assigneeName}
                </span>
                <span className="text-[11px] text-on-surface-variant truncate">
                  {task.assignedTo ? task.assignedTo.email : 'Open to all members'}
                </span>
              </div>
            </div>
          </div>

          {/* Location */}
          {task.location && (
            <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1 sm:col-span-2">
              <span className="font-bold text-outline uppercase tracking-wider text-[11px] block">
                Location
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-sm text-on-surface">
                <Icon name="location_on" size={16} className="text-error" />
                <span>{task.location}</span>
              </div>
            </div>
          )}
        </div>

        {/* Completion Dossier if Completed */}
        {isCompleted && (
          <div className="p-4 bg-primary-container/20 rounded-xl border border-primary/20 space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Icon name="verified" size={18} />
              <span>Completion Record</span>
            </div>
            <div className="text-xs text-on-surface">
              Completed by <strong className="font-bold">{task.completedBy?.name || 'Caregiver'}</strong>
              {task.completedAt && (
                <span className="text-on-surface-variant">
                  {' '}on {new Date(task.completedAt).toLocaleString()}
                </span>
              )}
            </div>
            {task.completionNotes && (
              <div className="text-xs text-on-surface-variant mt-1.5 p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant/20 italic">
                "{task.completionNotes}"
              </div>
            )}
          </div>
        )}

        {/* Completion Notes Input (when toggled) */}
        {showCompletionInput && !isCompleted && (
          <div className="p-4 bg-surface-container-low rounded-xl border border-primary/30 space-y-3 animate-in fade-in duration-150">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Completion Notes / Observations (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Grandma took 500mg with warm water. Blood pressure was 120/80."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="surface"
                size="sm"
                onClick={() => setShowCompletionInput(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isLoading}
                onClick={() => handleStatusChange(TASK_STATUS.COMPLETED)}
              >
                Confirm Complete
              </Button>
            </div>
          </div>
        )}

        {/* Status Workflow Action Buttons */}
        <div className="pt-3 border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-3">
          {/* Status buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isCompleted && !showCompletionInput && (
              <>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon="check"
                  onClick={() => setShowCompletionInput(true)}
                  disabled={isLoading}
                >
                  Mark Complete
                </Button>

                {task.status !== TASK_STATUS.IN_PROGRESS && (
                  <Button
                    type="button"
                    variant="surface"
                    size="sm"
                    icon="play_arrow"
                    onClick={() => handleStatusChange(TASK_STATUS.IN_PROGRESS)}
                    disabled={isLoading}
                  >
                    In Progress
                  </Button>
                )}
              </>
            )}

            {isCompleted && (
              <Button
                type="button"
                variant="surface"
                size="sm"
                icon="undo"
                onClick={() => handleStatusChange(TASK_STATUS.PENDING)}
                disabled={isLoading}
              >
                Revert to Incomplete
              </Button>
            )}

            {!isCancelled && !isCompleted && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-outline hover:text-error"
                onClick={() => handleStatusChange(TASK_STATUS.CANCELLED)}
                disabled={isLoading}
              >
                Cancel Task
              </Button>
            )}
          </div>

          {/* Edit / Delete actions */}
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                type="button"
                variant="surface"
                size="sm"
                icon="edit"
                onClick={() => {
                  onClose();
                  onEdit(task);
                }}
              >
                Edit
              </Button>
            )}

            {(canManage || isCreator) && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon="delete"
                className="text-error hover:bg-error-container/30"
                onClick={() => {
                  onClose();
                  onDelete(task);
                }}
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Audit footer */}
        <div className="text-[11px] text-outline text-right">
          Created by {creatorName} • {new Date(task.createdAt).toLocaleDateString()}
        </div>
      </div>
    </Modal>
  );
}
