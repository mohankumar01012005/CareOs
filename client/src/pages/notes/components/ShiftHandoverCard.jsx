import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import {
  NOTE_SHIFT_LABELS,
  NOTE_SHIFT_ICONS,
  NOTE_URGENCY,
  NOTE_URGENCY_LABELS,
  NOTE_URGENCY_BADGE_VARIANTS,
  MOOD_LABELS,
  APPETITE_LABELS,
} from '../../../constants/roles';

export function ShiftHandoverCard({
  latestHandover,
  currentUserId,
  onViewDetail,
  onAcknowledge,
  onLogHandover,
  isAcknowledging,
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <Card variant="lowest" padding="lg" className="border border-outline-variant/30 text-center animate-pulse">
        <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center mx-auto mb-3" />
        <div className="h-5 w-48 bg-surface-container-high rounded-md mx-auto mb-2" />
        <div className="h-4 w-72 bg-surface-container-high rounded-md mx-auto" />
      </Card>
    );
  }

  if (!latestHandover) {
    return (
      <Card variant="lowest" padding="lg" className="border border-dashed border-outline-variant/50 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center mx-auto mb-3">
          <Icon name="published_with_changes" size={28} />
        </div>
        <h3 className="font-serif text-lg font-bold text-on-surface">
          No Shift Handover Logged Yet
        </h3>
        <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto mt-1 leading-relaxed">
          Record outgoing shift observations, medication status, meal updates, and caregiver notes to keep the incoming shift informed.
        </p>
        <div className="mt-4">
          <Button
            variant="primary"
            size="md"
            icon="add"
            onClick={onLogHandover}
            className="font-bold shadow-sm text-xs sm:text-sm"
          >
            Log Shift Handover
          </Button>
        </div>
      </Card>
    );
  }

  const authorName = latestHandover.author?.name || 'Outgoing Caregiver';
  const authorPhoto = latestHandover.author?.profilePhoto;
  const isUrgent = latestHandover.urgency === NOTE_URGENCY.URGENT;
  const isImportant = latestHandover.urgency === NOTE_URGENCY.IMPORTANT;
  const shift = latestHandover.shift && latestHandover.shift !== 'none' ? latestHandover.shift : 'Handover';

  const hasUserAcknowledged = (latestHandover.acknowledgedBy || []).some(
    (a) => String(a.user?._id || a.user?.id || a.user) === String(currentUserId)
  );
  const ackCount = latestHandover.acknowledgedBy?.length || 0;

  const vs = latestHandover.vitalsSnapshot || {};
  const hasVitals =
    vs.bpSystolic || vs.heartRate || vs.bloodSugar || vs.temperature || vs.spO2;

  const dm = latestHandover.dietMood || {};

  const formattedDate = latestHandover.noteDate || (latestHandover.createdAt ? new Date(latestHandover.createdAt).toLocaleDateString() : '');
  const formattedTime = latestHandover.createdAt
    ? new Date(latestHandover.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Card
      variant="lowest"
      padding="none"
      className="relative overflow-hidden border-2 border-primary/40 bg-surface-container-lowest shadow-sm rounded-2xl"
    >
      {/* Accent Header Glow */}
      <div className="bg-gradient-to-r from-primary-container/40 via-surface-container-low to-secondary-container/30 px-5 py-3.5 border-b border-outline-variant/30 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-xs">
            <Icon name="published_with_changes" size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Latest Shift Handover
              </span>
              <span className="w-2 h-2 rounded-full bg-success inline-block animate-pulse" />
            </div>
            <span className="text-xs text-on-surface-variant font-medium">
              {formattedDate} {formattedTime && `• ${formattedTime}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-highest text-on-surface text-xs font-bold shadow-xs">
            <Icon name={NOTE_SHIFT_ICONS[latestHandover.shift] || 'schedule'} size={15} />
            <span>{NOTE_SHIFT_LABELS[latestHandover.shift] || latestHandover.shift}</span>
          </span>

          {latestHandover.urgency && latestHandover.urgency !== NOTE_URGENCY.NORMAL && (
            <Badge
              variant={NOTE_URGENCY_BADGE_VARIANTS[latestHandover.urgency] || 'warning'}
              size="sm"
              icon={isUrgent ? 'error' : 'priority_high'}
            >
              {NOTE_URGENCY_LABELS[latestHandover.urgency]}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Outgoing Caregiver Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={authorName} src={authorPhoto} size="md" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-on-surface truncate">
                {authorName}
              </span>
              <span className="text-xs text-on-surface-variant">
                Outgoing Caregiver
              </span>
            </div>
          </div>

          <Button
            variant="surface"
            size="sm"
            icon="add"
            onClick={onLogHandover}
            className="font-semibold text-xs"
          >
            Log New Handover
          </Button>
        </div>

        {/* Handover Title & Content */}
        <div
          onClick={() => onViewDetail && onViewDetail(latestHandover)}
          className="cursor-pointer space-y-1.5 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors border border-outline-variant/20"
        >
          {latestHandover.title && (
            <h4 className="font-serif text-base font-bold text-on-surface leading-snug">
              {latestHandover.title}
            </h4>
          )}
          <p className="text-sm text-on-surface leading-relaxed whitespace-pre-line line-clamp-4">
            {latestHandover.content}
          </p>
        </div>

        {/* Vitals Snapshot (if recorded) */}
        {(hasVitals || dm.mood || dm.appetite) && (
          <div className="flex flex-wrap gap-2 text-xs pt-1">
            {vs.bpSystolic && vs.bpDiastolic && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container text-on-surface font-medium">
                <Icon name="favorite" size={14} className="text-error" />
                BP: {vs.bpSystolic}/{vs.bpDiastolic} mmHg
              </span>
            )}
            {vs.heartRate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container text-on-surface font-medium">
                <Icon name="monitor_heart" size={14} className="text-tertiary" />
                HR: {vs.heartRate} bpm
              </span>
            )}
            {vs.bloodSugar && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container text-on-surface font-medium">
                <Icon name="water_drop" size={14} className="text-primary" />
                Sugar: {vs.bloodSugar} mg/dL
              </span>
            )}
            {dm.mood && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container text-on-surface font-medium">
                <Icon name="mood" size={14} className="text-primary" />
                Mood: {MOOD_LABELS[dm.mood] || dm.mood}
              </span>
            )}
            {dm.appetite && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container text-on-surface font-medium">
                <Icon name="restaurant" size={14} className="text-secondary" />
                Appetite: {APPETITE_LABELS[dm.appetite] || dm.appetite}
              </span>
            )}
          </div>
        )}

        {/* Acknowledgment & Action Footer */}
        <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            {ackCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-success font-bold">
                <Icon name="check_circle" size={16} />
                Acknowledged by {ackCount} caregiver{ackCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-on-surface-variant font-medium">
                Awaiting incoming shift acknowledgment
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!hasUserAcknowledged ? (
              <Button
                variant="primary"
                size="sm"
                icon="thumb_up"
                onClick={() => onAcknowledge && onAcknowledge(latestHandover)}
                disabled={isAcknowledging}
                className="font-bold text-xs shadow-sm"
              >
                {isAcknowledging ? 'Acknowledging...' : 'Acknowledge Handover'}
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-success-container/30 text-success text-xs font-bold">
                <Icon name="done_all" size={16} />
                <span>Acknowledged</span>
              </span>
            )}

            <Button
              variant="ghost"
              size="sm"
              iconRight="arrow_forward"
              onClick={() => onViewDetail && onViewDetail(latestHandover)}
              className="text-xs font-semibold"
            >
              Full Details
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
