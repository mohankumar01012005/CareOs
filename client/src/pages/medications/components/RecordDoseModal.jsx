import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Icon } from '../../../components/ui/Icon';
import { medicationApi } from '../../../api/medication.api';
import {
  MEDICATION_TIME_SLOT_LABELS,
  MEDICATION_FORM_ICONS,
  FOOD_TIMING_LABELS,
  FOOD_TIMING_ICONS,
} from '../../../constants/roles';

export function RecordDoseModal({
  isOpen,
  onClose,
  circleId,
  doseData,
  onSuccess,
}) {
  const [status, setStatus] = useState('TAKEN');
  const [quantityTaken, setQuantityTaken] = useState(1);
  const [administeredTime, setAdministeredTime] = useState('');
  const [notes, setNotes] = useState('');
  const [skipReason, setSkipReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const med = doseData?.medication;
  const slot = doseData?.slot || 'morning';
  const scheduledTime = doseData?.scheduledTime;
  const scheduledDate = doseData?.scheduledDate || new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen && doseData) {
      setStatus(doseData.initialStatus || 'TAKEN');
      setQuantityTaken(doseData.medication?.doseQuantity || 1);
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setAdministeredTime(`${hh}:${mm}`);
      setNotes('');
      setSkipReason('');
      setError('');
    }
  }, [isOpen, doseData]);

  if (!isOpen || !doseData || !med) return null;

  const formIcon = med.form ? MEDICATION_FORM_ICONS[med.form] || 'medication' : 'medication';
  const medicationId = med.medicationId || med.id || med._id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!medicationId || !circleId || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        slot,
        scheduledDate,
        status,
        scheduledTime: scheduledTime || undefined,
        quantityTaken: Number(quantityTaken) || 1,
        notes: notes.trim() || undefined,
        skipReason: status === 'SKIPPED' ? skipReason.trim() || 'Caregiver skipped dose' : undefined,
      };

      const result = await medicationApi.recordDose(circleId, medicationId, payload);
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err) {
      if (err.code === 'DOSE_ALREADY_LOGGED') {
        setError(`A dose for the ${slot} slot on ${scheduledDate} has already been logged.`);
      } else {
        setError(err.message || 'Failed to record dose administration.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Dose Administration"
      description={`Log administration event for ${med.name} (${MEDICATION_TIME_SLOT_LABELS[slot] || slot} slot).`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-error-container/30 border border-error/30 text-error text-xs flex items-center gap-2">
            <Icon name="error" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Medication Info Card */}
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center shrink-0">
            <Icon name={formIcon} size={22} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-serif text-base font-bold text-on-surface">
                {med.name}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface">
                {med.dosage}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-1">
              <span>Slot: <strong>{MEDICATION_TIME_SLOT_LABELS[slot] || slot}</strong></span>
              {scheduledTime && <span>({scheduledTime})</span>}
              {med.foodTiming && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-primary">
                    <Icon name={FOOD_TIMING_ICONS[med.foodTiming] || 'restaurant'} size={13} />
                    {FOOD_TIMING_LABELS[med.foodTiming] || med.foodTiming}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Switcher (TAKEN vs SKIPPED) */}
        <div>
          <label className="text-xs font-semibold text-on-surface-variant block mb-2">
            Administration Outcome
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-container border border-outline-variant/30">
            <button
              type="button"
              onClick={() => setStatus('TAKEN')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                status === 'TAKEN'
                  ? 'bg-success text-on-success shadow-xs'
                  : 'text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <Icon name="check_circle" size={16} />
              <span>Dose Taken</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('SKIPPED')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                status === 'SKIPPED'
                  ? 'bg-warning text-on-warning shadow-xs'
                  : 'text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <Icon name="do_not_disturb_on" size={16} />
              <span>Dose Skipped</span>
            </button>
          </div>
        </div>

        {/* Input Details */}
        {status === 'TAKEN' ? (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity Administered"
                type="number"
                min="0.1"
                step="0.5"
                value={quantityTaken}
                onChange={(e) => setQuantityTaken(e.target.value)}
              />

              <Input
                label="Time Administered"
                type="time"
                value={administeredTime}
                onChange={(e) => setAdministeredTime(e.target.value)}
              />
            </div>

            <Input
              label="Caregiver Notes / Observations (Optional)"
              placeholder="e.g. Taken with breakfast. Blood pressure stable."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="p-3 rounded-xl bg-success-container/10 border border-success/20 text-xs text-on-surface flex items-start gap-2">
              <Icon name="inventory" size={16} className="text-success mt-0.5" />
              <span>
                Recording as <strong>TAKEN</strong> will automatically decrement the tracked pharmacy stock by <strong>{quantityTaken} {med.form || 'unit'}</strong>.
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <Input
              label="Reason for Skipping (Optional)"
              placeholder="e.g. Advised by doctor / late meal / patient asleep"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
            />

            <Input
              label="Additional Notes (Optional)"
              placeholder="e.g. Scheduled for next morning dose."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="p-3 rounded-xl bg-warning-container/10 border border-warning/20 text-xs text-on-surface flex items-start gap-2">
              <Icon name="shield" size={16} className="text-warning mt-0.5" />
              <span>
                Recording as <strong>SKIPPED</strong> records the clinical event without reducing the medication stock inventory.
              </span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-end gap-3">
          <Button variant="surface" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={isSubmitting}
            className={`font-bold ${
              status === 'TAKEN'
                ? 'bg-success hover:bg-success/90 text-on-success'
                : 'bg-warning hover:bg-warning/90 text-on-warning'
            }`}
          >
            {isSubmitting
              ? 'Recording...'
              : status === 'TAKEN'
              ? 'Confirm Dose Taken'
              : 'Confirm Dose Skipped'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
