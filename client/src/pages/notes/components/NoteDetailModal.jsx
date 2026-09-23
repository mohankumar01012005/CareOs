import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { Icon } from '../../../components/ui/Icon';
import {
  NOTE_CATEGORY_LABELS,
  NOTE_CATEGORY_ICONS,
  NOTE_CATEGORY_BADGE_VARIANTS,
  NOTE_SHIFT_LABELS,
  NOTE_SHIFT_ICONS,
  NOTE_URGENCY,
  NOTE_URGENCY_LABELS,
  NOTE_URGENCY_BADGE_VARIANTS,
  APPETITE_LABELS,
  MOOD_LABELS,
  BOWEL_MOVEMENT_LABELS,
  canPinNotes,
  canEditNote,
  canDeleteNote,
} from '../../../constants/roles';

export function NoteDetailModal({
  isOpen,
  onClose,
  note,
  currentUser,
  userRole,
  onEdit,
  onDelete,
  onAcknowledge,
  onTogglePin,
  isAcknowledging,
  isPinning,
  isDeleting,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!note) return null;

  const authorName = note.author?.name || 'Caregiver';
  const authorEmail = note.author?.email;
  const authorPhoto = note.author?.profilePhoto;
  const isPinned = Boolean(note.isPinned);
  const isUrgent = note.urgency === NOTE_URGENCY.URGENT;
  const hasShift = note.shift && note.shift !== 'none';

  const canPin = canPinNotes(userRole);
  const canEdit = canEditNote(note, currentUser, userRole);
  const canDelete = canDeleteNote(note, currentUser, userRole);

  const currentUserId = currentUser?._id || currentUser?.id;
  const hasUserAcknowledged = (note.acknowledgedBy || []).some(
    (a) => String(a.user?._id || a.user?.id || a.user) === String(currentUserId)
  );

  const vs = note.vitalsSnapshot || {};
  const hasVitals =
    vs.bpSystolic || vs.heartRate || vs.bloodSugar || vs.temperature || vs.spO2;

  const dm = note.dietMood || {};
  const hasDietMood = dm.mood || dm.appetite || dm.bowelMovement;

  const formattedCreated = note.createdAt
    ? new Date(note.createdAt).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : note.noteDate;

  const formattedUpdated =
    note.updatedAt && note.updatedAt !== note.createdAt
      ? new Date(note.updatedAt).toLocaleString([], {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : null;

  return (
    <>
      <Modal
        isOpen={isOpen && !showDeleteConfirm}
        onClose={onClose}
        title="Care Note Dossier"
        size="lg"
      >
        <div className="space-y-5">
          {/* Header Metadata Banner */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={authorName} src={authorPhoto} size="lg" />
              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold text-on-surface truncate">
                  {authorName}
                </span>
                {authorEmail && (
                  <span className="text-xs text-on-surface-variant truncate">
                    {authorEmail}
                  </span>
                )}
                <span className="text-xs text-on-surface-variant mt-0.5">
                  Logged: {formattedCreated}
                  {formattedUpdated && ` (Updated: ${formattedUpdated})`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {/* Category */}
              <Badge
                variant={NOTE_CATEGORY_BADGE_VARIANTS[note.category] || 'neutral'}
                size="md"
                icon={NOTE_CATEGORY_ICONS[note.category]}
              >
                {NOTE_CATEGORY_LABELS[note.category] || note.category}
              </Badge>

              {/* Urgency */}
              {note.urgency && note.urgency !== NOTE_URGENCY.NORMAL && (
                <Badge
                  variant={NOTE_URGENCY_BADGE_VARIANTS[note.urgency] || 'warning'}
                  size="md"
                  icon={isUrgent ? 'error' : 'priority_high'}
                >
                  {NOTE_URGENCY_LABELS[note.urgency]}
                </Badge>
              )}

              {/* Shift */}
              {hasShift && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold">
                  <Icon name={NOTE_SHIFT_ICONS[note.shift] || 'schedule'} size={15} />
                  <span>{NOTE_SHIFT_LABELS[note.shift] || note.shift}</span>
                </span>
              )}

              {/* Pinned Tag */}
              {isPinned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-xs font-bold">
                  <Icon name="push_pin" size={14} className="rotate-45" />
                  Pinned
                </span>
              )}
            </div>
          </div>

          {/* Title & Full Note Content */}
          <div className="space-y-2 p-1">
            {note.title && (
              <h3 className="font-serif text-xl font-bold text-on-surface leading-snug">
                {note.title}
              </h3>
            )}
            <div className="text-sm sm:text-base text-on-surface leading-relaxed whitespace-pre-line bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30">
              {note.content}
            </div>
          </div>

          {/* Vitals Snapshot Panel */}
          {hasVitals && (
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Icon name="monitor_heart" size={18} />
                <span>Recorded Biometric Vitals</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {vs.bpSystolic && vs.bpDiastolic && (
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <span className="text-[11px] font-bold text-on-surface-variant block">Blood Pressure</span>
                    <span className="text-sm font-bold text-on-surface">
                      {vs.bpSystolic} / {vs.bpDiastolic} <span className="text-xs font-normal text-on-surface-variant">mmHg</span>
                    </span>
                  </div>
                )}
                {vs.heartRate && (
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <span className="text-[11px] font-bold text-on-surface-variant block">Heart Rate</span>
                    <span className="text-sm font-bold text-on-surface">
                      {vs.heartRate} <span className="text-xs font-normal text-on-surface-variant">bpm</span>
                    </span>
                  </div>
                )}
                {vs.bloodSugar && (
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <span className="text-[11px] font-bold text-on-surface-variant block">Blood Sugar</span>
                    <span className="text-sm font-bold text-on-surface">
                      {vs.bloodSugar} <span className="text-xs font-normal text-on-surface-variant">mg/dL</span>
                    </span>
                  </div>
                )}
                {vs.temperature && (
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <span className="text-[11px] font-bold text-on-surface-variant block">Temperature</span>
                    <span className="text-sm font-bold text-on-surface">
                      {vs.temperature} <span className="text-xs font-normal text-on-surface-variant">°F</span>
                    </span>
                  </div>
                )}
                {vs.spO2 && (
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <span className="text-[11px] font-bold text-on-surface-variant block">SpO2 Oxygen</span>
                    <span className="text-sm font-bold text-on-surface">
                      {vs.spO2} <span className="text-xs font-normal text-on-surface-variant">%</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nutrition & Mood Panel */}
          {hasDietMood && (
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
                <Icon name="restaurant" size={18} />
                <span>Daily Nutrition & Mental State</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {dm.appetite && (
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <span className="text-[11px] font-bold text-on-surface-variant block">Appetite</span>
                    <span className="text-sm font-semibold text-on-surface">
                      {APPETITE_LABELS[dm.appetite] || dm.appetite}
                    </span>
                  </div>
                )}
                {dm.mood && (
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <span className="text-[11px] font-bold text-on-surface-variant block">Mood State</span>
                    <span className="text-sm font-semibold text-on-surface">
                      {MOOD_LABELS[dm.mood] || dm.mood}
                    </span>
                  </div>
                )}
                {dm.bowelMovement && (
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <span className="text-[11px] font-bold text-on-surface-variant block">Bowel Movement</span>
                    <span className="text-sm font-semibold text-on-surface">
                      {BOWEL_MOVEMENT_LABELS[dm.bowelMovement] || dm.bowelMovement}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Acknowledgment History */}
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface">
                <Icon name="done_all" size={18} className="text-primary" />
                <span>Caregiver Acknowledgments ({(note.acknowledgedBy || []).length})</span>
              </div>
              {!hasUserAcknowledged && (
                <Button
                  variant="primary"
                  size="sm"
                  icon="thumb_up"
                  onClick={() => onAcknowledge && onAcknowledge(note)}
                  disabled={isAcknowledging}
                  className="font-bold text-xs"
                >
                  {isAcknowledging ? 'Acknowledging...' : 'Acknowledge Note'}
                </Button>
              )}
            </div>

            {(note.acknowledgedBy || []).length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {note.acknowledgedBy.map((ack, idx) => {
                  const ackUserName = ack.user?.name || 'Care Circle Member';
                  const ackUserEmail = ack.user?.email;
                  const ackTime = ack.acknowledgedAt
                    ? new Date(ack.acknowledgedAt).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : '';
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={ackUserName} size="sm" />
                        <div>
                          <span className="font-bold text-on-surface">{ackUserName}</span>
                          {ackUserEmail && (
                            <span className="text-on-surface-variant text-[11px] block">
                              {ackUserEmail}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-on-surface-variant text-[11px]">
                        {ackTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant/70 italic pt-1">
                No caregivers have acknowledged this note yet.
              </p>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon="delete"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-error hover:bg-error/10 text-xs font-semibold"
                >
                  Delete Note
                </Button>
              )}
              {canPin && (
                <Button
                  variant="surface"
                  size="sm"
                  icon="push_pin"
                  onClick={() => onTogglePin && onTogglePin(note)}
                  disabled={isPinning}
                  className={`text-xs font-semibold ${isPinned ? 'text-primary' : ''}`}
                >
                  {isPinned ? 'Unpin Note' : 'Pin Note'}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {canEdit && (
                <Button
                  variant="surface"
                  size="md"
                  icon="edit"
                  onClick={() => {
                    onClose();
                    if (onEdit) {
                      onEdit(note);
                    }
                  }}
                  className="text-xs font-semibold"
                >
                  Edit Note
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={onClose}
                className="text-xs font-bold shadow-sm"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete Care Note"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Are you sure you want to delete this care note? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <Button
                variant="surface"
                size="md"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                icon="delete"
                onClick={async () => {
                  await onDelete(note);
                  setShowDeleteConfirm(false);
                  onClose();
                }}
                disabled={isDeleting}
                className="bg-error text-on-error hover:bg-error/90 font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
