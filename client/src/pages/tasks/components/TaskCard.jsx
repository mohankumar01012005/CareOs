import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
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

function formatDueDate(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dateStr === today) return 'Today';

  const tom = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrow = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`;
  if (dateStr === tomorrow) return 'Tomorrow';

  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
    }
  } catch {
    return dateStr;
  }
  return dateStr;
}

export function TaskCard({
  task,
  onOpenDetail,
  onToggleComplete,
  onEdit,
  onDelete,
  canManage = false,
  isCreator = false,
}) {
  const isCompleted = task.status === TASK_STATUS.COMPLETED;
  const isCancelled = task.status === TASK_STATUS.CANCELLED;
  const isUrgent = task.priority === 'URGENT' || task.priority === 'HIGH';

  const categoryLabel = TASK_CATEGORY_LABELS[task.category] || task.category || 'General';
  const categoryIcon = TASK_CATEGORY_ICONS[task.category] || 'task_alt';

  const priorityLabel = TASK_PRIORITY_LABELS[task.priority] || task.priority || 'Medium';
  const priorityVariant = TASK_PRIORITY_BADGE_VARIANTS[task.priority] || 'neutral';

  const statusLabel = TASK_STATUS_LABELS[task.status] || task.status;
  const statusVariant = TASK_STATUS_BADGE_VARIANTS[task.status] || 'neutral';

  const timeSlotLabel = TASK_TIME_SLOT_LABELS[task.timeSlot] || task.timeSlot || 'Morning';
  const timeSlotIcon = TASK_TIME_SLOT_ICONS[task.timeSlot] || 'schedule';

  const assigneeName = task.assignedTo?.name || 'Shared (Anyone)';

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    if (onToggleComplete) {
      onToggleComplete(task);
    }
  };

  return (
    <Card
      variant="lowest"
      padding="none"
      className={`group relative overflow-hidden transition-all duration-150 hover:shadow-md cursor-pointer border ${
        isCompleted
          ? 'bg-surface-container-lowest/70 border-outline-variant/30 opacity-80'
          : isCancelled
          ? 'bg-surface-container-low/50 border-outline-variant/20 opacity-60'
          : isUrgent
          ? 'border-warning/40 bg-surface-container-lowest shadow-sm hover:border-warning/70'
          : 'border-outline-variant/40 bg-surface-container-lowest hover:border-primary/40'
      }`}
      onClick={() => onOpenDetail && onOpenDetail(task)}
    >
      {/* Priority accent stripe */}
      {task.priority === 'URGENT' && (
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-error" />
      )}
      {task.priority === 'HIGH' && (
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-warning" />
      )}

      <div className="p-4 sm:p-5 flex items-start gap-3.5 pl-5">
        {/* Completion Action Checkbox */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
            isCompleted
              ? 'bg-primary text-on-primary border-primary hover:bg-primary-hover shadow-xs'
              : 'border-outline-variant hover:border-primary hover:bg-primary-container/20 text-transparent hover:text-primary'
          }`}
          aria-label={isCompleted ? 'Mark task as incomplete' : 'Mark task as completed'}
        >
          <Icon name="check" size={16} />
        </button>

        {/* Task Content Main Body */}
        <div className="flex-1 min-w-0">
          {/* Top Metadata Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <Badge variant="neutral" size="sm" icon={categoryIcon}>
              {categoryLabel}
            </Badge>

            {task.priority !== 'MEDIUM' && (
              <Badge variant={priorityVariant} size="sm">
                {priorityLabel}
              </Badge>
            )}

            <Badge variant={statusVariant} size="sm">
              {statusLabel}
            </Badge>
          </div>

          {/* Title */}
          <h4
            className={`font-serif text-base sm:text-lg font-bold tracking-tight text-on-surface leading-snug ${
              isCompleted ? 'line-through text-on-surface-variant' : ''
            }`}
          >
            {task.title}
          </h4>

          {/* Description */}
          {task.description && (
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Bottom Footer Info */}
          <div className="mt-3.5 pt-2.5 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant">
            {/* Due Date & Time Slot */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-on-surface">
                <Icon name="event" size={15} className="text-outline" />
                <span>{formatDueDate(task.dueDate)}</span>
              </span>

              <span className="flex items-center gap-1">
                <Icon name={timeSlotIcon} size={15} className="text-outline" />
                <span>
                  {task.exactTime ? `${task.exactTime} (${timeSlotLabel})` : timeSlotLabel}
                </span>
              </span>

              {task.location && (
                <span className="hidden sm:flex items-center gap-1 truncate max-w-[140px]">
                  <Icon name="location_on" size={15} className="text-outline" />
                  <span className="truncate">{task.location}</span>
                </span>
              )}
            </div>

            {/* Assignee Avatar / Name */}
            <div className="flex items-center gap-2">
              <Avatar name={assigneeName} size="xs" />
              <span className="text-xs font-medium text-on-surface truncate max-w-[130px]">
                {assigneeName}
              </span>
            </div>
          </div>

          {/* Completed attribution banner if completed */}
          {isCompleted && task.completedBy && (
            <div className="mt-2.5 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
              <span>
                Completed by <strong className="text-on-surface font-semibold">{task.completedBy.name}</strong>
              </span>
              {task.completedAt && (
                <span>
                  {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick Edit/Delete Overflow Actions */}
        <div
          className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              title="Edit Task"
            >
              <Icon name="edit" size={16} />
            </button>
          )}

          {(canManage || isCreator) && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(task)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
              title="Delete Task"
            >
              <Icon name="delete" size={16} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
