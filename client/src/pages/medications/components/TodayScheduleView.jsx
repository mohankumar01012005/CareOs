import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Icon } from '../../../components/ui/Icon';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  MEDICATION_TIME_SLOT_LABELS,
  MEDICATION_TIME_SLOT_ICONS,
  MEDICATION_FORM_ICONS,
  FOOD_TIMING_LABELS,
  FOOD_TIMING_ICONS,
  DOSE_STATUS_BADGE_VARIANTS,
  DOSE_STATUS_ICONS,
} from '../../../constants/roles';

const TIME_SLOT_ORDER = ['morning', 'afternoon', 'evening', 'night', 'as_needed'];

export function TodayScheduleView({
  timeline,
  summary,
  selectedDate,
  onDateChange,
  onRecordDoseClick,
  onViewMedicationClick,
  isLoading,
  canManage,
}) {
  const isToday = !selectedDate || selectedDate === new Date().toISOString().split('T')[0];

  const handlePrevDay = () => {
    const current = new Date(selectedDate || new Date().toISOString().split('T')[0]);
    current.setDate(current.getDate() - 1);
    onDateChange(current.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate || new Date().toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
    onDateChange(current.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    onDateChange(new Date().toISOString().split('T')[0]);
  };

  const totalDoses = summary?.totalScheduledCount || 0;
  const completedDoses = summary?.totalCompletedCount || 0;
  const skippedDoses = summary?.totalSkippedCount || 0;
  const pendingDoses = summary?.pendingCount || 0;
  const adherenceRate = summary?.adherenceRate ?? (totalDoses > 0 ? Math.round((completedDoses / totalDoses) * 100) : 100);

  const formattedDate = new Date((selectedDate || new Date().toISOString().split('T')[0]) + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Date Navigation & Adherence Header Bar */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
            title="Previous Day"
          >
            <Icon name="chevron_left" size={20} />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-serif text-base sm:text-lg font-bold text-on-surface">
              {formattedDate}
            </span>
            {isToday ? (
              <Badge variant="primary" size="sm">Today</Badge>
            ) : (
              <button
                type="button"
                onClick={handleToday}
                className="text-xs text-primary hover:underline font-bold px-1.5 py-0.5 rounded bg-primary-container/20"
              >
                Jump to Today
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
            title="Next Day"
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>

        {/* Quick Dose Completion Metrics */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center font-bold text-xs">
              <Icon name="medication" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase text-outline tracking-wider">
                Total Doses
              </span>
              <span className="text-sm font-bold text-on-surface">
                {totalDoses} scheduled
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-success-container/30 text-success flex items-center justify-center font-bold text-xs">
              <Icon name="check_circle" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase text-outline tracking-wider">
                Taken
              </span>
              <span className="text-sm font-bold text-success">
                {completedDoses} taken
              </span>
            </div>
          </div>

          {skippedDoses > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-warning-container/30 text-warning flex items-center justify-center font-bold text-xs">
                <Icon name="do_not_disturb_on" size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase text-outline tracking-wider">
                  Skipped
                </span>
                <span className="text-sm font-bold text-warning">
                  {skippedDoses} skipped
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1">
              <div className="flex justify-between text-xs font-semibold text-on-surface mb-1">
                <span>Pace</span>
                <span>{adherenceRate}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${adherenceRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Slots */}
      {totalDoses === 0 && !isLoading ? (
        <EmptyState
          icon="medication"
          title="No Medications Scheduled for this Date"
          description="There are no active medication regimens scheduled for this day. You can add a new prescription using '+ Add Medication'."
        />
      ) : (
        <div className="space-y-6">
          {TIME_SLOT_ORDER.map((slotKey) => {
            const slotData = timeline?.[slotKey];
            const items = slotData?.items || [];
            if (items.length === 0) return null;

            const slotLabel = MEDICATION_TIME_SLOT_LABELS[slotKey] || slotKey;
            const slotIcon = MEDICATION_TIME_SLOT_ICONS[slotKey] || 'schedule';
            const scheduledTime = slotData?.scheduledTime;
            const slotStatus = slotData?.status || 'PENDING';

            return (
              <div key={slotKey} className="space-y-3">
                {/* Slot Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center">
                      <Icon name={slotIcon} size={18} />
                    </div>
                    <div>
                      <span className="font-serif text-base font-bold text-on-surface">
                        {slotLabel}
                      </span>
                      {scheduledTime && (
                        <span className="text-xs text-on-surface-variant font-medium ml-2">
                          • Scheduled for {scheduledTime}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant">
                      {items.filter((i) => i.isLogged).length}/{items.length} logged
                    </span>
                    <Badge
                      variant={
                        slotStatus === 'COMPLETED'
                          ? 'success'
                          : slotStatus === 'PARTIAL'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {slotStatus}
                    </Badge>
                  </div>
                </div>

                {/* Dose Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {items.map((item, index) => {
                    const isLogged = item.isLogged;
                    const logStatus = item.logStatus;
                    const formIcon = MEDICATION_FORM_ICONS[item.form] || 'medication';
                    const isLowStock =
                      item.stockRemaining !== null &&
                      item.stockRemaining !== undefined &&
                      item.stockRemaining <= 10;

                    return (
                      <Card
                        key={`${item.medicationId}_${index}`}
                        variant="lowest"
                        padding="md"
                        className={`transition-all border ${
                          logStatus === 'TAKEN'
                            ? 'bg-success-container/5 border-success/30'
                            : logStatus === 'SKIPPED'
                            ? 'bg-warning-container/5 border-warning/30'
                            : 'border-outline-variant/40 hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-surface-container text-primary flex items-center justify-center shrink-0 mt-0.5">
                              <Icon name={formIcon} size={22} />
                            </div>

                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => onViewMedicationClick(item.medicationId)}
                                  className="font-serif text-base font-bold text-on-surface hover:text-primary transition-colors text-left truncate"
                                >
                                  {item.name}
                                </button>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant shrink-0">
                                  {item.dosage}
                                </span>
                              </div>

                              {item.genericName && (
                                <span className="text-xs text-on-surface-variant italic truncate mt-0.5">
                                  {item.genericName}
                                </span>
                              )}

                              {/* Quantity & Instructions */}
                              <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-1.5 flex-wrap">
                                <span className="font-semibold text-on-surface">
                                  Dose: {item.doseQuantity || 1} {item.form || 'unit'}
                                </span>
                                {item.foodTiming && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                                      <Icon
                                        name={FOOD_TIMING_ICONS[item.foodTiming] || 'restaurant'}
                                        size={14}
                                      />
                                      {FOOD_TIMING_LABELS[item.foodTiming] || item.foodTiming}
                                    </span>
                                  </>
                                )}
                              </div>

                              {item.instructions && (
                                <p className="text-xs text-on-surface-variant/90 mt-1 line-clamp-2">
                                  {item.instructions}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <Badge
                              variant={DOSE_STATUS_BADGE_VARIANTS[logStatus] || 'neutral'}
                              size="sm"
                              icon={DOSE_STATUS_ICONS[logStatus]}
                            >
                              {logStatus}
                            </Badge>

                            {item.stockRemaining !== null && item.stockRemaining !== undefined && (
                              <span
                                className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                  isLowStock
                                    ? 'bg-error-container/40 text-error'
                                    : 'text-on-surface-variant'
                                }`}
                              >
                                {item.stockRemaining} in stock
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dose Logging History Details if Logged */}
                        {isLogged && item.doseLog && (
                          <div className="mt-3 pt-2.5 border-t border-outline-variant/30 text-xs text-on-surface-variant flex flex-col gap-1 bg-surface-container-low/50 -mx-4 -mb-4 p-3 rounded-b-2xl">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <span className="font-semibold text-on-surface flex items-center gap-1">
                                <Icon name="person" size={14} className="text-primary" />
                                {item.doseLog.administeredBy?.name || 'Caregiver'}
                              </span>
                              <span className="text-[11px] text-outline">
                                {new Date(item.doseLog.administeredAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {item.doseLog.notes && (
                              <p className="text-xs text-on-surface italic mt-0.5">
                                "{item.doseLog.notes}"
                              </p>
                            )}

                            {item.doseLog.skipReason && (
                              <p className="text-xs text-warning font-medium mt-0.5">
                                Reason: {item.doseLog.skipReason}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action Buttons if Pending */}
                        {!isLogged && (
                          <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-end gap-2">
                            <Button
                              variant="surface"
                              size="sm"
                              icon="do_not_disturb_on"
                              onClick={() =>
                                onRecordDoseClick({
                                  medication: item,
                                  slot: slotKey,
                                  scheduledTime: item.scheduledTime,
                                  initialStatus: 'SKIPPED',
                                })
                              }
                            >
                              Skip
                            </Button>

                            <Button
                              variant="primary"
                              size="sm"
                              icon="check"
                              onClick={() =>
                                onRecordDoseClick({
                                  medication: item,
                                  slot: slotKey,
                                  scheduledTime: item.scheduledTime,
                                  initialStatus: 'TAKEN',
                                })
                              }
                              className="font-bold shadow-xs"
                            >
                              Mark Taken
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
