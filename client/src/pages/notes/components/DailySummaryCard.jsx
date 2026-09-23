import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export function DailySummaryCard({
  summaryData,
  selectedDate,
  onDateChange,
  isLoading,
}) {
  const summary = summaryData?.summary || {
    totalNotesCount: 0,
    urgentNotesCount: 0,
    handoverCount: 0,
    vitalsLoggedCount: 0,
    latestVitals: null,
  };

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const isToday = selectedDate === getTodayStr();

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const formattedSelectedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const lv = summary.latestVitals;

  return (
    <Card variant="lowest" padding="md" className="space-y-4 border border-outline-variant/30">
      {/* Top Date Header & Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-tertiary-container/20 text-tertiary flex items-center justify-center font-bold">
            <Icon name="event_note" size={18} />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-on-surface">
              Daily Care Telemetry
            </h3>
            <span className="text-xs text-on-surface-variant">
              {formattedSelectedDate} {isToday && '• Today'}
            </span>
          </div>
        </div>

        {/* Date Selector & Jump Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="surface"
            size="sm"
            icon="chevron_left"
            onClick={handlePrevDay}
            className="p-1.5"
            title="Previous Day"
          />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="text-xs py-1 px-2 h-8 w-34"
          />
          <Button
            variant="surface"
            size="sm"
            icon="chevron_right"
            onClick={handleNextDay}
            className="p-1.5"
            title="Next Day"
          />
          {!isToday && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDateChange(getTodayStr())}
              className="text-xs font-bold text-primary"
            >
              Today
            </Button>
          )}
        </div>
      </div>

      {/* 4 Metric Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Notes */}
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Notes</span>
            <Icon name="notes" size={16} className="text-primary" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-on-surface">
            {summary.totalNotesCount}
          </div>
        </div>

        {/* Urgent Alerts */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between ${
          summary.urgentNotesCount > 0
            ? 'bg-error-container/20 border-error/30 text-error'
            : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">Urgent Alerts</span>
            <Icon name="warning" size={16} className={summary.urgentNotesCount > 0 ? 'text-error' : 'text-outline'} />
          </div>
          <div className={`mt-2 text-2xl font-serif font-bold ${summary.urgentNotesCount > 0 ? 'text-error' : 'text-on-surface'}`}>
            {summary.urgentNotesCount}
          </div>
        </div>

        {/* Shift Handovers */}
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold uppercase tracking-wider">Handovers</span>
            <Icon name="published_with_changes" size={16} className="text-secondary" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-on-surface">
            {summary.handoverCount}
          </div>
        </div>

        {/* Vitals Logged */}
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vitals Logged</span>
            <Icon name="monitor_heart" size={16} className="text-tertiary" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-on-surface">
            {summary.vitalsLoggedCount}
          </div>
        </div>
      </div>

      {/* Latest Vitals Reading (if any logged on this date) */}
      {lv && (
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Icon name="favorite" size={16} />
            <span>Latest Recorded Vitals on {selectedDate}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {lv.bpSystolic && lv.bpDiastolic && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container text-on-surface font-medium">
                BP: <strong className="text-on-surface">{lv.bpSystolic}/{lv.bpDiastolic}</strong> mmHg
              </span>
            )}
            {lv.heartRate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container text-on-surface font-medium">
                HR: <strong className="text-on-surface">{lv.heartRate}</strong> bpm
              </span>
            )}
            {lv.bloodSugar && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container text-on-surface font-medium">
                Sugar: <strong className="text-on-surface">{lv.bloodSugar}</strong> mg/dL
              </span>
            )}
            {lv.temperature && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container text-on-surface font-medium">
                Temp: <strong className="text-on-surface">{lv.temperature}</strong> °F
              </span>
            )}
            {lv.spO2 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container text-on-surface font-medium">
                SpO2: <strong className="text-on-surface">{lv.spO2}</strong>%
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
