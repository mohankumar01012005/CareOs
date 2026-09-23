import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Icon } from '../../../components/ui/Icon';
import { medicationApi } from '../../../api/medication.api';

export function RefillStockModal({
  isOpen,
  onClose,
  circleId,
  medication,
  onSuccess,
}) {
  const [quantity, setQuantity] = useState(60);
  const [packageSize, setPackageSize] = useState(60);
  const [pharmacy, setPharmacy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentStock = medication?.stock?.currentQuantity ?? 0;
  const unit = medication?.stock?.unit || 'tablets';

  useEffect(() => {
    if (isOpen && medication) {
      setQuantity(medication.stock?.packageSize || 60);
      setPackageSize(medication.stock?.packageSize || 60);
      setPharmacy(medication.stock?.pharmacy || '');
      setError('');
    }
  }, [isOpen, medication]);

  if (!isOpen || !medication) return null;

  const medicationId = medication.id || medication._id;
  const newTotal = currentStock + (Number(quantity) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!medicationId || !circleId || isSubmitting) return;

    if (!quantity || Number(quantity) <= 0) {
      setError('Please enter a refill quantity greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        quantity: Number(quantity),
        packageSize: packageSize ? Number(packageSize) : undefined,
        pharmacy: pharmacy.trim() || undefined,
      };

      const result = await medicationApi.refillStock(circleId, medicationId, payload);
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to refill stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Refill Medication Inventory"
      description={`Add pharmacy refill units for ${medication.name} (${medication.dosage}).`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-error-container/30 border border-error/30 text-error text-xs flex items-center gap-2">
            <Icon name="error" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Current Inventory Summary */}
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between text-xs">
          <div>
            <span className="text-outline uppercase text-[11px] font-bold block">
              Current Stock
            </span>
            <span className="font-serif text-lg font-bold text-on-surface">
              {currentStock} {unit}
            </span>
          </div>

          <div className="text-right">
            <span className="text-outline uppercase text-[11px] font-bold block">
              Projected Total
            </span>
            <span className="font-serif text-lg font-bold text-primary">
              {newTotal} {unit}
            </span>
          </div>
        </div>

        <Input
          label="Refill Quantity Added"
          required
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        <Input
          label="Package Size (Optional)"
          type="number"
          min="1"
          value={packageSize}
          onChange={(e) => setPackageSize(e.target.value)}
        />

        <Input
          label="Dispensing Pharmacy (Optional)"
          placeholder="e.g. Apollo Pharmacy 24/7"
          value={pharmacy}
          onChange={(e) => setPharmacy(e.target.value)}
        />

        <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-end gap-3">
          <Button variant="surface" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={isSubmitting}
            className="font-bold"
          >
            {isSubmitting ? 'Refilling...' : `Add +${quantity} ${unit}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
