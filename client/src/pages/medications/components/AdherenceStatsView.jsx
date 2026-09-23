import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Icon } from '../../../components/ui/Icon';
import { Select } from '../../../components/ui/Select';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { medicationApi } from '../../../api/medication.api';
import {
  DOSE_STATUS_BADGE_VARIANTS,
  DOSE_STATUS_ICONS,
  MEDICATION_TIME_SLOT_LABELS,
  ALL_DOSE_STATUSES,
  MEDICATION_TIME_SLOTS,
} from '../../../constants/roles';

export function AdherenceStatsView({ circleId, stats, isLoading }) {
  const [historyLogs, setHistoryLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchHistory() {
      if (!circleId) return;
      setIsLoadingLogs(true);
      try {
        const params = {};
        if (selectedStatus) params.status = selectedStatus;
        if (selectedSlot) params.slot = selectedSlot;
        const res = await medicationApi.getCircleDosesHistory(circleId, params);
        if (isMounted) {
          setHistoryLogs(res?.doses || []);
        }
      } catch (err) {
        console.warn('Could not load dose history:', err.message);
      } finally {
        if (isMounted) {
          setIsLoadingLogs(false);
        }
      }
    }

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [circleId, selectedStatus, selectedSlot]);

  const averageAdherence = stats?.averageAdherenceRate ?? 100;
  const streakDays = stats?.streakDays ?? 0;
  const history = stats?.history || [];

  return (
    <div className="space-y-6">
      {/* Top Adherence Telemetry Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="lowest" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
            <Icon name="verified" size={26} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
              7-Day Average Adherence
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-on-surface">
              {averageAdherence}%
            </span>
          </div>
        </Card>

        <Card variant="lowest" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning-container/20 text-warning flex items-center justify-center shrink-0">
            <Icon name="local_fire_department" size={26} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
              Adherence Streak
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-on-surface">
              {streakDays} {streakDays === 1 ? 'Day' : 'Days'}
            </span>
          </div>
        </Card>

        <Card variant="lowest" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success-container/20 text-success flex items-center justify-center shrink-0">
            <Icon name="health_and_safety" size={26} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
              Target Benchmark
            </span>
            <span className="font-serif text-base font-bold text-on-surface">
              ≥ 80% Optimal Routine
            </span>
            <span className="text-[11px] text-on-surface-variant block">
              Consistent medication timing
            </span>
          </div>
        </Card>
      </div>

      {/* 7-Day History Cards */}
      <Card variant="lowest" padding="md" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="date_range" size={20} className="text-primary" />
            <h4 className="font-serif text-base font-bold text-on-surface">
              7-Day Adherence Breakdown
            </h4>
          </div>
        </div>

        {history.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5 pt-2">
            {history.map((dayItem, idx) => {
              const d = new Date(dayItem.date + 'T00:00:00');
              const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
              const dateFormatted = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
              const percentage = dayItem.percentage ?? 0;
              const isPerfect = percentage >= 100;
              const isGood = percentage >= 80;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-center transition-colors flex flex-col justify-between ${
                    isPerfect
                      ? 'bg-success-container/10 border-success/30 text-on-surface'
                      : isGood
                      ? 'bg-primary-container/10 border-primary/30 text-on-surface'
                      : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">{dayName}</span>
                    <span className="text-[11px] text-outline block">{dateFormatted}</span>
                  </div>

                  <div className="my-2">
                    <span
                      className={`font-serif text-lg font-bold ${
                        isPerfect
                          ? 'text-success'
                          : isGood
                          ? 'text-primary'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {percentage}%
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold text-outline">
                    {dayItem.taken}/{dayItem.scheduled} taken
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-on-surface-variant">
            No 7-day adherence history logs recorded yet.
          </div>
        )}
      </Card>

      {/* Circle-wide Dose Administration Logs */}
      <Card variant="lowest" padding="md" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-2">
            <Icon name="history" size={20} className="text-primary" />
            <h4 className="font-serif text-base font-bold text-on-surface">
              Medication Administration Logs
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="">All Statuses</option>
              {ALL_DOSE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </Select>

            <Select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="">All Time Slots</option>
              {MEDICATION_TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {MEDICATION_TIME_SLOT_LABELS[slot] || slot}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {isLoadingLogs ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : historyLogs.length === 0 ? (
          <EmptyState
            icon="event_note"
            title="No Dose Logs Found"
            description="No dose administration events have been recorded matching your current filter."
          />
        ) : (
          <div className="space-y-2.5">
            {historyLogs.map((log) => {
              const med = log.medication;
              const dateStr = log.scheduledDate;
              const timeStr = log.administeredAt
                ? new Date(log.administeredAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <div
                  key={log.id || log._id}
                  className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
                      <Icon
                        name={DOSE_STATUS_ICONS[log.status] || 'medication'}
                        size={18}
                        className={
                          log.status === 'TAKEN'
                            ? 'text-success'
                            : log.status === 'SKIPPED'
                            ? 'text-warning'
                            : 'text-error'
                        }
                      />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif text-sm font-bold text-on-surface">
                          {med?.name || 'Medication'}
                        </span>
                        {med?.dosage && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-container font-semibold">
                            {med.dosage}
                          </span>
                        )}
                        <span className="text-outline">•</span>
                        <span className="font-semibold text-primary capitalize">
                          {MEDICATION_TIME_SLOT_LABELS[log.slot] || log.slot} Slot
                        </span>
                      </div>

                      <div className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>Date: <strong>{dateStr}</strong></span>
                        {timeStr && <span>at {timeStr}</span>}
                        <span>•</span>
                        <span>
                          Administered by: <strong>{log.administeredBy?.name || 'Caregiver'}</strong>
                        </span>
                      </div>

                      {log.notes && (
                        <p className="text-xs text-on-surface italic mt-1 bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/20">
                          "{log.notes}"
                        </p>
                      )}

                      {log.skipReason && (
                        <p className="text-xs text-warning font-medium mt-1">
                          Skip Reason: {log.skipReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-end gap-1 justify-between">
                    <Badge
                      variant={DOSE_STATUS_BADGE_VARIANTS[log.status] || 'neutral'}
                      size="sm"
                    >
                      {log.status}
                    </Badge>
                    {log.stockDeducted && (
                      <span className="text-[10px] text-outline">Stock deducted</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
