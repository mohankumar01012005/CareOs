import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import {
  NOTE_CATEGORY_LABELS,
  NOTE_CATEGORY_ICONS,
  NOTE_CATEGORY_BADGE_VARIANTS,
  NOTE_SHIFT_LABELS,
  NOTE_SHIFT_ICONS,
  NOTE_URGENCY,
  NOTE_URGENCY_LABELS,
  NOTE_URGENCY_BADGE_VARIANTS,
  MOOD_LABELS,
  APPETITE_LABELS,
  canPinNotes,
} from '../../../constants/roles';

export function NoteCard({
  note,
  currentUserId,
  userRole,
  onViewDetail,
  onAcknowledge,
  onTogglePin,
  isAcknowledging,
  isPinning,
}) {
  const authorName = note.author?.name || 'Caregiver';
  const authorPhoto = note.author?.profilePhoto;
  const isPinned = Boolean(note.isPinned);
  const isUrgent = note.urgency === NOTE_URGENCY.URGENT;
  const isImportant = note.urgency === NOTE_URGENCY.IMPORTANT;
  const hasShift = note.shift && note.shift !== 'none';

  // Check if current user has already acknowledged
  const hasUserAcknowledged = (note.acknowledgedBy || []).some(
    (a) => String(a.user?._id || a.user?.id || a.user) === String(currentUserId)
  );
  const acknowledgmentCount = note.acknowledgedBy?.length || 0;

  const canPin = canPinNotes(userRole);

  // Vitals snapshot chips
  const vs = note.vitalsSnapshot || {};
  const hasVitals =
    vs.bpSystolic || vs.heartRate || vs.bloodSugar || vs.temperature || vs.spO2;

  // Diet / Mood snapshot chips
  const dm = note.dietMood || {};
  const hasDietMood = dm.mood || dm.appetite || dm.bowelMovement;

  // Formatted date
  const formattedDate = note.noteDate || (note.createdAt ? new Date(note.createdAt).toLocaleDateString() : '');
  const formattedTime = note.createdAt
    ? new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Card
      variant="lowest"
      padding="none"
      className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md border ${
        isPinned
          ? 'border-primary/50 bg-primary-container/5 shadow-xs'
          : isUrgent
          ? 'border-error/40 bg-error-container/5'
          : isImportant
          ? 'border-warning/40 bg-warning/5'
          : 'border-outline-variant/30 hover:border-outline-variant/70'
      }`}
    >
      {/* Top accent bar for pinned / urgent */}
      {isPinned && (
        <div className="h-1 bg-gradient-to-r from-primary to-primary-container w-full" />
      )}
      {isUrgent && !isPinned && (
        <div className="h-1 bg-gradient-to-r from-error to-error-container w-full" />
      )}

      <div className="p-4 sm:p-5 flex flex-col justify-between space-y-3.5">
        {/* Header Row: Author info & Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={authorName} src={authorPhoto} size="md" />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-on-surface truncate">
                  {authorName}
                </span>
                {isPinned && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                    <Icon name="push_pin" size={12} className="rotate-45" />
                    Pinned
                  </span>
                )}
              </div>
              <span className="text-xs text-on-surface-variant">
                {formattedDate} {formattedTime && `• ${formattedTime}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {/* Category Badge */}
            <Badge
              variant={NOTE_CATEGORY_BADGE_VARIANTS[note.category] || 'neutral'}
              size="sm"
              icon={NOTE_CATEGORY_ICONS[note.category]}
            >
              {NOTE_CATEGORY_LABELS[note.category] || note.category}
            </Badge>

            {/* Urgency Badge (if not normal) */}
            {note.urgency && note.urgency !== NOTE_URGENCY.NORMAL && (
              <Badge
                variant={NOTE_URGENCY_BADGE_VARIANTS[note.urgency] || 'warning'}
                size="sm"
                icon={isUrgent ? 'error' : 'priority_high'}
              >
                {NOTE_URGENCY_LABELS[note.urgency]}
              </Badge>
            )}

            {/* Shift Pill */}
            {hasShift && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">
                <Icon name={NOTE_SHIFT_ICONS[note.shift] || 'schedule'} size={13} />
                <span>{NOTE_SHIFT_LABELS[note.shift] || note.shift}</span>
              </span>
            )}
          </div>
        </div>

        {/* Note Content Section */}
        <div
          onClick={() => onViewDetail && onViewDetail(note)}
          className="cursor-pointer space-y-1.5 group-hover:text-primary transition-colors"
        >
          {note.title && (
            <h4 className="font-serif text-base font-bold text-on-surface group-hover:text-primary transition-colors leading-snug">
              {note.title}
            </h4>
          )}
          <p className="text-sm text-on-surface-variant line-clamp-3 leading-relaxed whitespace-pre-line group-hover:text-on-surface transition-colors">
            {note.content}
          </p>
        </div>

        {/* Vitals & Diet Mini-Snapshot Chips (if present) */}
        {(hasVitals || hasDietMood) && (
          <div className="pt-2 border-t border-outline-variant/20 flex flex-wrap gap-1.5 text-xs">
            {vs.bpSystolic && vs.bpDiastolic && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface font-medium">
                <Icon name="favorite" size={13} className="text-error" />
                BP: {vs.bpSystolic}/{vs.bpDiastolic}
              </span>
            )}
            {vs.heartRate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface font-medium">
                <Icon name="monitor_heart" size={13} className="text-tertiary" />
                HR: {vs.heartRate} bpm
              </span>
            )}
            {vs.bloodSugar && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface font-medium">
                <Icon name="water_drop" size={13} className="text-primary" />
                Sugar: {vs.bloodSugar} mg/dL
              </span>
            )}
            {vs.temperature && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface font-medium">
                <Icon name="device_thermostat" size={13} className="text-warning" />
                Temp: {vs.temperature}°F
              </span>
            )}
            {vs.spO2 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface font-medium">
                <Icon name="air" size={13} className="text-secondary" />
                SpO2: {vs.spO2}%
              </span>
            )}
            {dm.mood && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface font-medium">
                <Icon name="mood" size={13} className="text-primary" />
                {MOOD_LABELS[dm.mood] || dm.mood}
              </span>
            )}
            {dm.appetite && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface font-medium">
                <Icon name="restaurant" size={13} className="text-secondary" />
                Appetite: {APPETITE_LABELS[dm.appetite] || dm.appetite}
              </span>
            )}
          </div>
        )}

        {/* Footer: Acknowledgment Status & Action Buttons */}
        <div className="pt-2.5 border-t border-outline-variant/30 flex items-center justify-between gap-3 flex-wrap">
          {/* Acknowledgment state display */}
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            {acknowledgmentCount > 0 ? (
              <div className="flex items-center gap-1 text-success font-semibold">
                <Icon name="check_circle" size={15} />
                <span>
                  Acknowledged ({acknowledgmentCount})
                </span>
              </div>
            ) : (
              <span className="text-on-surface-variant/70 text-[11px]">
                Not yet acknowledged
              </span>
            )}
          </div>

          {/* Card Actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Quick Pin Toggle (if permitted) */}
            {canPin && (
              <Button
                variant="ghost"
                size="sm"
                icon={isPinned ? 'push_pin' : 'push_pin'}
                onClick={() => onTogglePin && onTogglePin(note)}
                disabled={isPinning}
                className={`p-1.5 rounded-lg ${
                  isPinned ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-primary'
                }`}
                title={isPinned ? 'Unpin note' : 'Pin note to top'}
              />
            )}

            {/* Acknowledge Button */}
            {!hasUserAcknowledged ? (
              <Button
                variant="surface"
                size="sm"
                icon="thumb_up"
                onClick={() => onAcknowledge && onAcknowledge(note)}
                disabled={isAcknowledging}
                className="font-semibold text-xs"
              >
                Acknowledge
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-success-container/30 text-success text-xs font-bold">
                <Icon name="done_all" size={14} />
                <span>Seen</span>
              </span>
            )}

            {/* View Full Dossier */}
            <Button
              variant="ghost"
              size="sm"
              iconRight="chevron_right"
              onClick={() => onViewDetail && onViewDetail(note)}
              className="text-xs font-semibold"
            >
              Details
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
