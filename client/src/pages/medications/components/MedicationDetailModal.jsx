import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Icon } from '../../../components/ui/Icon';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { medicationApi } from '../../../api/medication.api';
import {
  MEDICATION_FORM_ICONS,
  MEDICATION_FORM_LABELS,
  MEDICATION_FREQUENCY_LABELS,
  FOOD_TIMING_LABELS,
  FOOD_TIMING_ICONS,
  MEDICATION_STATUS_BADGE_VARIANTS,
  MEDICATION_TIME_SLOT_LABELS,
  DOSE_STATUS_BADGE_VARIANTS,
  DOSE_STATUS_ICONS,
} from '../../../constants/roles';

export function MedicationDetailModal({
  isOpen,
  onClose,
  medicationId,
  circleId,
  onRefillClick,
  onDiscontinueSuccess,
  canManage,
}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDiscontinuing, setIsDiscontinuing] = useState(false);
  const [showConfirmDiscontinue, setShowConfirmDiscontinue] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchDossier() {
      if (!isOpen || !medicationId || !circleId) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await medicationApi.getMedicationById(circleId, medicationId);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load medication dossier.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDossier();

    return () => {
      isMounted = false;
    };
  }, [isOpen, medicationId, circleId]);

  if (!isOpen) return null;

  const med = data?.medication;
  const recentDoses = data?.recentDoses || [];
  const telemetry = data?.telemetry;

  const handleDiscontinue = async () => {
    if (!circleId || !medicationId) return;
    setIsDiscontinuing(true);
    try {
      await medicationApi.discontinueMedication(circleId, medicationId);
      setShowConfirmDiscontinue(false);
      if (onDiscontinueSuccess) {
        onDiscontinueSuccess(medicationId);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to discontinue medication.');
    } finally {
      setIsDiscontinuing(false);
    }
  };

  const formIcon = med?.form ? MEDICATION_FORM_ICONS[med.form] || 'medication' : 'medication';
  const isDiscontinued = med?.status === 'DISCONTINUED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={med ? med.name : 'Medication Dossier'}
      description={med ? `${med.dosage} • ${MEDICATION_FORM_LABELS[med.form] || med.form}` : 'Detailed prescription information & dose history'}
      maxWidth="max-w-2xl"
    >
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size="lg" />
          <span className="text-xs text-on-surface-variant">Loading medication details...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-error-container/30 border border-error/30 text-error text-sm">
          <div className="flex items-center gap-2 font-bold">
            <Icon name="error" size={18} />
            <span>Error</span>
          </div>
          <p className="mt-1">{error}</p>
          <Button variant="surface" size="sm" onClick={onClose} className="mt-3">
            Close
          </Button>
        </div>
      ) : med ? (
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Header Dossier Overview */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center shrink-0">
                <Icon name={formIcon} size={28} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-serif text-xl font-bold text-on-surface">
                    {med.name}
                  </h4>
                  <Badge
                    variant={MEDICATION_STATUS_BADGE_VARIANTS[med.status] || 'neutral'}
                    size="sm"
                  >
                    {med.status}
                  </Badge>
                </div>

                {med.genericName && (
                  <span className="text-xs text-on-surface-variant italic mt-0.5">
                    Generic: {med.genericName}
                  </span>
                )}

                <span className="text-xs text-outline mt-1 font-medium">
                  Prescribed dosage: <strong className="text-on-surface">{med.dosage}</strong> •{' '}
                  {MEDICATION_FREQUENCY_LABELS[med.frequency] || med.frequency}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1">
              <span className="font-bold uppercase tracking-wider text-outline text-[11px] block">
                Food & Administration
              </span>
              <div className="flex items-center gap-1.5 text-on-surface font-semibold">
                <Icon
                  name={FOOD_TIMING_ICONS[med.foodTiming] || 'restaurant'}
                  size={16}
                  className="text-primary"
                />
                <span>{FOOD_TIMING_LABELS[med.foodTiming] || med.foodTiming}</span>
              </div>
              {med.instructions && (
                <p className="text-on-surface-variant mt-1 leading-relaxed">
                  {med.instructions}
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1">
              <span className="font-bold uppercase tracking-wider text-outline text-[11px] block">
                Prescribing Doctor
              </span>
              <div className="flex items-center gap-1.5 text-on-surface font-semibold">
                <Icon name="stethoscope" size={16} className="text-primary" />
                <span>
                  {med.prescribedBy?.doctorName ? `Dr. ${med.prescribedBy.doctorName}` : 'Attending Physician'}
                </span>
              </div>
              {med.prescribedBy?.hospital && (
                <p className="text-on-surface-variant">
                  {med.prescribedBy.hospital} {med.prescribedBy.specialty ? `• ${med.prescribedBy.specialty}` : ''}
                </p>
              )}
              {med.prescribedBy?.phone && (
                <a
                  href={`tel:${med.prescribedBy.phone}`}
                  className="text-primary font-bold hover:underline inline-flex items-center gap-1 mt-0.5"
                >
                  <Icon name="call" size={13} />
                  <span>{med.prescribedBy.phone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Schedule Slots Configuration */}
          <div className="space-y-2">
            <h5 className="font-serif text-sm font-bold text-on-surface uppercase tracking-wider text-[11px] text-outline">
              Daily Schedule Breakdown
            </h5>
            <div className="space-y-2">
              {med.schedule && med.schedule.length > 0 ? (
                med.schedule.map((slotItem, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center">
                        <Icon name="schedule" size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-on-surface capitalize">
                          {MEDICATION_TIME_SLOT_LABELS[slotItem.slot] || slotItem.slot}
                        </span>
                        {slotItem.time && (
                          <span className="text-on-surface-variant ml-2 font-medium">
                            ({slotItem.time})
                          </span>
                        )}
                        {slotItem.instructions && (
                          <p className="text-on-surface-variant mt-0.5">
                            {slotItem.instructions}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-primary text-sm">
                        {slotItem.doseQuantity || 1} {med.form || 'unit'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant">
                  Standard Once Daily Schedule
                </div>
              )}
            </div>
          </div>

          {/* Stock & Pharmacy Inventory Telemetry */}
          {med.stock && med.stock.tracked && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="inventory_2" size={20} className="text-primary" />
                  <span className="font-serif text-sm font-bold text-on-surface">
                    Stock & Pharmacy Inventory
                  </span>
                </div>
                {canManage && !isDiscontinued && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon="add"
                    onClick={() => onRefillClick(med)}
                    className="font-bold"
                  >
                    Refill Stock
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20">
                  <span className="text-[11px] text-outline font-semibold uppercase block">
                    Current Stock
                  </span>
                  <span className="font-serif text-lg font-bold text-on-surface">
                    {med.stock.currentQuantity} {med.stock.unit || 'units'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20">
                  <span className="text-[11px] text-outline font-semibold uppercase block">
                    Days Supply
                  </span>
                  <span className="font-serif text-lg font-bold text-primary">
                    ~{telemetry?.daysRemaining ?? 0} days
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20">
                  <span className="text-[11px] text-outline font-semibold uppercase block">
                    Low Alert At
                  </span>
                  <span className="font-serif text-lg font-bold text-on-surface">
                    {med.stock.lowStockThreshold || 10}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20">
                  <span className="text-[11px] text-outline font-semibold uppercase block">
                    Package Size
                  </span>
                  <span className="font-serif text-lg font-bold text-on-surface">
                    {med.stock.packageSize || 60}
                  </span>
                </div>
              </div>

              {med.stock.pharmacy && (
                <div className="text-xs text-on-surface-variant flex items-center gap-1.5 pt-1">
                  <Icon name="local_pharmacy" size={16} className="text-outline" />
                  <span>Dispensing Pharmacy: <strong>{med.stock.pharmacy}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Safety Protocols */}
          {med.safetyProtocols && med.safetyProtocols.length > 0 && (
            <div className="p-3.5 rounded-xl bg-warning-container/20 border border-warning/30 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-warning font-bold">
                <Icon name="warning" size={16} />
                <span>Caregiver Safety Protocols</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-on-surface">
                {med.safetyProtocols.map((protocol, i) => (
                  <li key={i}>{protocol}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent Dose Logs History */}
          <div className="space-y-2.5">
            <h5 className="font-serif text-sm font-bold text-on-surface uppercase tracking-wider text-[11px] text-outline">
              Recent Administration History
            </h5>
            {recentDoses.length > 0 ? (
              <div className="space-y-2">
                {recentDoses.map((log) => (
                  <div
                    key={log.id || log._id}
                    className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        <Icon
                          name={DOSE_STATUS_ICONS[log.status] || 'check'}
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
                      <div>
                        <div className="flex items-center gap-2 font-semibold text-on-surface">
                          <span>{log.scheduledDate}</span>
                          <span>•</span>
                          <span className="capitalize">{log.slot} slot</span>
                        </div>

                        <div className="text-on-surface-variant text-[11px] mt-0.5">
                          Administered by <strong>{log.administeredBy?.name || 'Caregiver'}</strong> at{' '}
                          {new Date(log.administeredAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>

                        {log.notes && (
                          <p className="text-on-surface italic mt-1 bg-surface-container-low p-1.5 rounded-lg">
                            "{log.notes}"
                          </p>
                        )}

                        {log.skipReason && (
                          <p className="text-warning font-medium mt-1">
                            Reason: {log.skipReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant={DOSE_STATUS_BADGE_VARIANTS[log.status] || 'neutral'}
                      size="sm"
                    >
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-container-low text-center text-xs text-on-surface-variant">
                No recent dose administration records found for this medicine.
              </div>
            )}
          </div>

          {/* Discontinue Confirmation Modal */}
          {showConfirmDiscontinue && (
            <div className="p-4 rounded-xl bg-error-container/30 border border-error/40 text-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 font-bold text-error text-sm">
                <Icon name="warning" size={18} />
                <span>Confirm Discontinue Medication</span>
              </div>
              <p className="text-on-surface leading-relaxed">
                Are you sure you want to mark <strong>{med.name}</strong> as discontinued? It will be removed from active daily dose schedules, but past dose logs will be preserved.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="surface"
                  size="sm"
                  onClick={() => setShowConfirmDiscontinue(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDiscontinue}
                  disabled={isDiscontinuing}
                  className="bg-error hover:bg-error/90 text-on-error font-bold"
                >
                  {isDiscontinuing ? 'Discontinuing...' : 'Yes, Discontinue'}
                </Button>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-between gap-3">
            <div>
              {canManage && !isDiscontinued && !showConfirmDiscontinue && (
                <Button
                  variant="surface"
                  size="sm"
                  icon="do_not_disturb"
                  onClick={() => setShowConfirmDiscontinue(true)}
                  className="text-error hover:bg-error-container/20"
                >
                  Discontinue Medicine
                </Button>
              )}
            </div>

            <Button variant="surface" size="md" onClick={onClose}>
              Close Dossier
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
