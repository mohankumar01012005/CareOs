import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Icon } from '../../../components/ui/Icon';
import {
  MEDICATION_FORM_ICONS,
  MEDICATION_FORM_LABELS,
  MEDICATION_FREQUENCY_LABELS,
  FOOD_TIMING_LABELS,
  FOOD_TIMING_ICONS,
  MEDICATION_STATUS_BADGE_VARIANTS,
  MEDICATION_TIME_SLOT_LABELS,
} from '../../../constants/roles';

export function MedicationCard({
  medication,
  onViewDetail,
  onRefillClick,
  onDiscontinueClick,
  canManage,
}) {
  const formIcon = MEDICATION_FORM_ICONS[medication.form] || 'medication';
  const formLabel = MEDICATION_FORM_LABELS[medication.form] || medication.form;
  const isDiscontinued = medication.status === 'DISCONTINUED';

  // Stock telemetry
  const isStockTracked = medication.stock?.tracked !== false;
  const currentStock = medication.stock?.currentQuantity ?? 0;
  const stockUnit = medication.stock?.unit || 'tablets';
  const lowThreshold = medication.stock?.lowStockThreshold ?? 10;
  const isLowStock = isStockTracked && currentStock <= lowThreshold && !isDiscontinued;

  // Daily dose count calculation
  const dailyDoses =
    medication.schedule && medication.schedule.length > 0
      ? medication.schedule.reduce((acc, s) => acc + (s.doseQuantity || 1), 0)
      : 1;
  const daysRemaining = dailyDoses > 0 ? Math.floor(currentStock / dailyDoses) : 0;

  return (
    <Card
      variant="lowest"
      padding="md"
      className={`relative flex flex-col justify-between transition-all duration-200 border ${
        isDiscontinued
          ? 'opacity-70 bg-surface-container-low/50 border-outline-variant/30'
          : isLowStock
          ? 'border-error/40 hover:border-error hover:shadow-md'
          : 'border-outline-variant/40 hover:border-primary/40 hover:shadow-md'
      }`}
    >
      <div>
        {/* Top Header: Form Icon, Name, Dosage & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isDiscontinued
                ? 'bg-surface-container text-outline'
                : 'bg-primary-container/20 text-primary'
            }`}>
              <Icon name={formIcon} size={24} />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onViewDetail(medication.id || medication._id)}
                  className="font-serif text-lg font-bold text-on-surface hover:text-primary transition-colors text-left truncate"
                >
                  {medication.name}
                </button>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface shrink-0">
                  {medication.dosage}
                </span>
              </div>

              {medication.genericName && (
                <span className="text-xs text-on-surface-variant italic truncate mt-0.5">
                  {medication.genericName}
                </span>
              )}

              <span className="text-[11px] text-outline font-medium mt-0.5">
                {formLabel} • {MEDICATION_FREQUENCY_LABELS[medication.frequency] || medication.frequency}
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <Badge
              variant={MEDICATION_STATUS_BADGE_VARIANTS[medication.status] || 'neutral'}
              size="sm"
            >
              {medication.status}
            </Badge>

            {isLowStock && (
              <Badge variant="error" size="sm" icon="warning">
                Low Stock
              </Badge>
            )}
          </div>
        </div>

        {/* Schedule Slots Chips */}
        {medication.schedule && medication.schedule.length > 0 && (
          <div className="mt-4 pt-3 border-t border-outline-variant/30 flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] font-bold uppercase text-outline tracking-wider mr-1">
              Schedule:
            </span>
            {medication.schedule.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface text-xs font-semibold"
              >
                <Icon name="schedule" size={13} className="text-primary" />
                <span>
                  {MEDICATION_TIME_SLOT_LABELS[item.slot] || item.slot}
                </span>
                {item.time && <span className="text-outline font-normal">({item.time})</span>}
                <span className="text-primary font-bold">×{item.doseQuantity || 1}</span>
              </span>
            ))}
          </div>
        )}

        {/* Instructions & Food Timing */}
        <div className="mt-3 space-y-1 text-xs">
          {medication.foodTiming && (
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Icon
                name={FOOD_TIMING_ICONS[medication.foodTiming] || 'restaurant'}
                size={15}
              />
              <span>{FOOD_TIMING_LABELS[medication.foodTiming] || medication.foodTiming}</span>
            </div>
          )}

          {medication.instructions && (
            <p className="text-xs text-on-surface-variant/90 line-clamp-2">
              {medication.instructions}
            </p>
          )}

          {medication.prescribedBy?.doctorName && (
            <div className="flex items-center gap-1 text-[11px] text-outline pt-1">
              <Icon name="stethoscope" size={13} />
              <span>Dr. {medication.prescribedBy.doctorName} {medication.prescribedBy.hospital ? `(${medication.prescribedBy.hospital})` : ''}</span>
            </div>
          )}
        </div>

        {/* Stock Inventory Tracker Banner */}
        {isStockTracked && (
          <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between text-xs ${
            isLowStock
              ? 'bg-error-container/20 border-error/30 text-error'
              : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
          }`}>
            <div className="flex items-center gap-2">
              <Icon
                name={isLowStock ? 'inventory_2' : 'inventory'}
                size={18}
                className={isLowStock ? 'text-error' : 'text-primary'}
              />
              <div className="flex flex-col">
                <span className="font-bold">
                  {currentStock} {stockUnit} remaining
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {daysRemaining > 0 ? `~${daysRemaining} days supply remaining` : 'Supply exhausted'}
                </span>
              </div>
            </div>

            {canManage && !isDiscontinued && (
              <button
                type="button"
                onClick={() => onRefillClick(medication)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-primary hover:bg-primary-container/30 transition-colors flex items-center gap-1"
              >
                <Icon name="add" size={14} />
                <span>Refill</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon="visibility"
          onClick={() => onViewDetail(medication.id || medication._id)}
        >
          Dossier & Logs
        </Button>

        <div className="flex items-center gap-1.5">
          {canManage && !isDiscontinued && (
            <Button
              variant="surface"
              size="sm"
              icon="do_not_disturb"
              onClick={() => onDiscontinueClick(medication)}
              className="text-error hover:bg-error-container/20"
            >
              Discontinue
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
