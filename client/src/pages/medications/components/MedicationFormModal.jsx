import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Icon } from '../../../components/ui/Icon';
import { medicationApi } from '../../../api/medication.api';
import {
  MEDICATION_FORMS,
  MEDICATION_FORM_LABELS,
  MEDICATION_FREQUENCIES,
  MEDICATION_FREQUENCY_LABELS,
  FOOD_TIMINGS,
  FOOD_TIMING_LABELS,
  MEDICATION_TIME_SLOTS,
  MEDICATION_TIME_SLOT_LABELS,
  MEDICATION_TIME_SLOT_DEFAULTS,
} from '../../../constants/roles';

const DEFAULT_SCHEDULE_MAP = {
  once_daily: [{ slot: 'morning', time: '08:00', doseQuantity: 1, instructions: '' }],
  twice_daily: [
    { slot: 'morning', time: '08:00', doseQuantity: 1, instructions: '' },
    { slot: 'evening', time: '18:00', doseQuantity: 1, instructions: '' },
  ],
  thrice_daily: [
    { slot: 'morning', time: '08:00', doseQuantity: 1, instructions: '' },
    { slot: 'afternoon', time: '14:00', doseQuantity: 1, instructions: '' },
    { slot: 'evening', time: '20:00', doseQuantity: 1, instructions: '' },
  ],
  four_times_daily: [
    { slot: 'morning', time: '08:00', doseQuantity: 1, instructions: '' },
    { slot: 'afternoon', time: '13:00', doseQuantity: 1, instructions: '' },
    { slot: 'evening', time: '18:00', doseQuantity: 1, instructions: '' },
    { slot: 'night', time: '21:30', doseQuantity: 1, instructions: '' },
  ],
  as_needed: [{ slot: 'as_needed', time: '', doseQuantity: 1, instructions: 'Take when needed' }],
  every_other_day: [{ slot: 'morning', time: '08:00', doseQuantity: 1, instructions: 'Every alternate morning' }],
  weekly: [{ slot: 'morning', time: '08:00', doseQuantity: 1, instructions: 'Weekly on scheduled day' }],
  custom: [{ slot: 'morning', time: '08:00', doseQuantity: 1, instructions: '' }],
};

export function MedicationFormModal({
  isOpen,
  onClose,
  circleId,
  initialData = null,
  onSuccess,
}) {
  const isEditing = Boolean(initialData?.id || initialData?._id);

  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState('tablet');
  const [formDetails, setFormDetails] = useState('');
  const [frequency, setFrequency] = useState('once_daily');
  const [foodTiming, setFoodTiming] = useState('with_meal');
  const [instructions, setInstructions] = useState('');

  // Schedule items array
  const [schedule, setSchedule] = useState([
    { slot: 'morning', time: '08:00', doseQuantity: 1, instructions: '' },
  ]);

  // Doctor & Prescriber
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [hospital, setHospital] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');

  // Dates
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  // Stock
  const [trackStock, setTrackStock] = useState(true);
  const [currentQuantity, setCurrentQuantity] = useState(60);
  const [unit, setUnit] = useState('tablets');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [packageSize, setPackageSize] = useState(60);
  const [pharmacy, setPharmacy] = useState('');

  // Safety Protocols
  const [safetyProtocols, setSafetyProtocols] = useState(['']);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setGenericName(initialData.genericName || '');
        setDosage(initialData.dosage || '');
        setForm(initialData.form || 'tablet');
        setFormDetails(initialData.formDetails || '');
        setFrequency(initialData.frequency || 'once_daily');
        setFoodTiming(initialData.foodTiming || 'no_restriction');
        setInstructions(initialData.instructions || '');
        setSchedule(
          initialData.schedule && initialData.schedule.length > 0
            ? initialData.schedule.map((s) => ({
                slot: s.slot || 'morning',
                time: s.time || '08:00',
                doseQuantity: s.doseQuantity || 1,
                instructions: s.instructions || '',
              }))
            : [{ slot: 'morning', time: '08:00', doseQuantity: 1, instructions: '' }]
        );
        setDoctorName(initialData.prescribedBy?.doctorName || '');
        setSpecialty(initialData.prescribedBy?.specialty || '');
        setHospital(initialData.prescribedBy?.hospital || '');
        setDoctorPhone(initialData.prescribedBy?.phone || '');
        setStartDate(
          initialData.startDate
            ? new Date(initialData.startDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
        setEndDate(
          initialData.endDate
            ? new Date(initialData.endDate).toISOString().split('T')[0]
            : ''
        );
        setTrackStock(initialData.stock?.tracked !== false);
        setCurrentQuantity(initialData.stock?.currentQuantity ?? 60);
        setUnit(initialData.stock?.unit || 'tablets');
        setLowStockThreshold(initialData.stock?.lowStockThreshold ?? 10);
        setPackageSize(initialData.stock?.packageSize ?? 60);
        setPharmacy(initialData.stock?.pharmacy || '');
        setSafetyProtocols(
          initialData.safetyProtocols && initialData.safetyProtocols.length > 0
            ? initialData.safetyProtocols
            : ['']
        );
      } else {
        setName('');
        setGenericName('');
        setDosage('');
        setForm('tablet');
        setFormDetails('');
        setFrequency('once_daily');
        setFoodTiming('with_meal');
        setInstructions('');
        setSchedule([{ slot: 'morning', time: '08:00', doseQuantity: 1, instructions: '' }]);
        setDoctorName('');
        setSpecialty('');
        setHospital('');
        setDoctorPhone('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setTrackStock(true);
        setCurrentQuantity(60);
        setUnit('tablets');
        setLowStockThreshold(10);
        setPackageSize(60);
        setPharmacy('');
        setSafetyProtocols(['']);
      }
      setErrors({});
      setServerError('');
    }
  }, [isOpen, initialData]);

  // When frequency changes, offer default schedule slots
  const handleFrequencyChange = (e) => {
    const newFreq = e.target.value;
    setFrequency(newFreq);
    if (DEFAULT_SCHEDULE_MAP[newFreq]) {
      setSchedule(DEFAULT_SCHEDULE_MAP[newFreq]);
    }
  };

  const handleAddScheduleSlot = () => {
    setSchedule((prev) => [
      ...prev,
      { slot: 'morning', time: '08:00', doseQuantity: 1, instructions: '' },
    ]);
  };

  const handleRemoveScheduleSlot = (index) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  const handleScheduleSlotChange = (index, field, value) => {
    setSchedule((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'slot' && !item.time && MEDICATION_TIME_SLOT_DEFAULTS[value]) {
          updated.time = MEDICATION_TIME_SLOT_DEFAULTS[value];
        }
        return updated;
      })
    );
  };

  const handleAddProtocol = () => {
    setSafetyProtocols((prev) => [...prev, '']);
  };

  const handleRemoveProtocol = (index) => {
    setSafetyProtocols((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProtocolChange = (index, value) => {
    setSafetyProtocols((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Medication name is required';
    else if (name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters';

    if (!dosage.trim()) newErrors.dosage = 'Dosage is required (e.g. 500mg, 1 tablet)';

    if (schedule.length === 0) {
      newErrors.schedule = 'At least one schedule time slot is required';
    }

    if (trackStock) {
      if (currentQuantity < 0) newErrors.currentQuantity = 'Quantity cannot be negative';
      if (lowStockThreshold < 0) newErrors.lowStockThreshold = 'Threshold cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    setServerError('');

    const payload = {
      name: name.trim(),
      genericName: genericName.trim() || undefined,
      dosage: dosage.trim(),
      form,
      formDetails: formDetails.trim() || undefined,
      frequency,
      foodTiming,
      instructions: instructions.trim() || undefined,
      schedule: schedule.map((s) => ({
        slot: s.slot,
        time: s.time || undefined,
        doseQuantity: Number(s.doseQuantity) || 1,
        instructions: s.instructions?.trim() || undefined,
      })),
      prescribedBy: {
        doctorName: doctorName.trim() || undefined,
        specialty: specialty.trim() || undefined,
        hospital: hospital.trim() || undefined,
        phone: doctorPhone.trim() || undefined,
      },
      startDate: startDate || undefined,
      endDate: endDate || null,
      stock: trackStock
        ? {
            tracked: true,
            currentQuantity: Number(currentQuantity) || 0,
            unit: unit.trim() || 'tablets',
            lowStockThreshold: Number(lowStockThreshold) || 10,
            packageSize: Number(packageSize) || 60,
            pharmacy: pharmacy.trim() || undefined,
          }
        : { tracked: false },
      safetyProtocols: safetyProtocols
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    };

    try {
      let result;
      if (isEditing) {
        result = await medicationApi.updateMedication(
          circleId,
          initialData.id || initialData._id,
          payload
        );
      } else {
        result = await medicationApi.createMedication(circleId, payload);
      }

      if (onSuccess) {
        onSuccess(result.medication);
      }
      onClose();
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const fieldErrors = {};
        err.errors.forEach((eItem) => {
          if (eItem.path) fieldErrors[eItem.path] = eItem.msg;
        });
        setErrors(fieldErrors);
        setServerError('Please fix the highlighted validation errors.');
      } else {
        setServerError(err.message || 'Failed to save medication.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Prescription' : 'Add New Medication'}
      description="Define the prescription dosage, daily administration schedule, and pharmacy stock."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {serverError && (
          <div className="p-3.5 rounded-xl bg-error-container/30 border border-error/30 text-error text-xs flex items-center gap-2">
            <Icon name="error" size={16} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Section 1: Medicine Identity */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-1 border-b border-outline-variant/30">
            <Icon name="medication" size={18} className="text-primary" />
            <h4 className="font-serif text-sm font-bold text-on-surface uppercase tracking-wider text-[11px]">
              1. Medication Identity
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Medication Name"
              required
              placeholder="e.g. Metformin Hydrochloride"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />

            <Input
              label="Generic / Brand Name"
              placeholder="e.g. Glucophage"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              error={errors.genericName}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Dosage Strength"
              required
              placeholder="e.g. 500mg, 5ml, 1 puff"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              error={errors.dosage}
            />

            <Select
              label="Medication Form"
              value={form}
              onChange={(e) => setForm(e.target.value)}
              options={MEDICATION_FORMS.map((f) => ({
                value: f,
                label: MEDICATION_FORM_LABELS[f] || f,
              }))}
            />

            <Input
              label="Pill Form Details (Optional)"
              placeholder="e.g. White round tablet"
              value={formDetails}
              onChange={(e) => setFormDetails(e.target.value)}
            />
          </div>
        </div>

        {/* Section 2: Frequency & Schedule Configuration */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <Icon name="schedule" size={18} className="text-primary" />
              <h4 className="font-serif text-sm font-bold text-on-surface uppercase tracking-wider text-[11px]">
                2. Daily Administration Schedule
              </h4>
            </div>

            <button
              type="button"
              onClick={handleAddScheduleSlot}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Icon name="add" size={14} />
              <span>+ Add Slot</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Dosage Frequency"
              value={frequency}
              onChange={handleFrequencyChange}
              options={MEDICATION_FREQUENCIES.map((freq) => ({
                value: freq,
                label: MEDICATION_FREQUENCY_LABELS[freq] || freq,
              }))}
            />

            <Select
              label="Meal / Food Timing"
              value={foodTiming}
              onChange={(e) => setFoodTiming(e.target.value)}
              options={FOOD_TIMINGS.map((ft) => ({
                value: ft,
                label: FOOD_TIMING_LABELS[ft] || ft,
              }))}
            />
          </div>

          {/* Schedule Slots List */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-on-surface-variant block">
              Time Slot Doses ({schedule.length})
            </label>

            {schedule.map((item, index) => (
              <div
                key={index}
                className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
              >
                <div className="sm:col-span-4">
                  <Select
                    value={item.slot}
                    onChange={(e) =>
                      handleScheduleSlotChange(index, 'slot', e.target.value)
                    }
                    options={MEDICATION_TIME_SLOTS.map((slot) => ({
                      value: slot,
                      label: MEDICATION_TIME_SLOT_LABELS[slot] || slot,
                    }))}
                  />
                </div>

                <div className="sm:col-span-3">
                  <Input
                    type="time"
                    placeholder="Time (HH:MM)"
                    value={item.time || ''}
                    onChange={(e) =>
                      handleScheduleSlotChange(index, 'time', e.target.value)
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    type="number"
                    min="0.1"
                    step="0.5"
                    placeholder="Qty"
                    value={item.doseQuantity}
                    onChange={(e) =>
                      handleScheduleSlotChange(index, 'doseQuantity', e.target.value)
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    placeholder="e.g. with water"
                    value={item.instructions || ''}
                    onChange={(e) =>
                      handleScheduleSlotChange(index, 'instructions', e.target.value)
                    }
                  />
                </div>

                <div className="sm:col-span-1 flex justify-end">
                  {schedule.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveScheduleSlot(index)}
                      className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                      title="Remove Slot"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Input
            label="General Instructions & Notes"
            placeholder="e.g. Take with full glass of water. Do not crush tablet."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        {/* Section 3: Stock Inventory & Pharmacy Tracking */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <Icon name="inventory_2" size={18} className="text-primary" />
              <h4 className="font-serif text-sm font-bold text-on-surface uppercase tracking-wider text-[11px]">
                3. Stock Inventory & Pharmacy
              </h4>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={trackStock}
                onChange={(e) => setTrackStock(e.target.checked)}
                className="w-4 h-4 rounded text-primary border-outline-variant"
              />
              <span>Track Inventory</span>
            </label>
          </div>

          {trackStock && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="Current Quantity"
                type="number"
                min="0"
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(e.target.value)}
                error={errors.currentQuantity}
              />

              <Input
                label="Unit"
                placeholder="tablets, ml, puffs"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />

              <Input
                label="Low Stock Alert At"
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                error={errors.lowStockThreshold}
              />

              <Input
                label="Package Size"
                type="number"
                min="1"
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value)}
              />

              <div className="col-span-2 sm:col-span-4">
                <Input
                  label="Dispensing Pharmacy Name (Optional)"
                  placeholder="e.g. Apollo Pharmacy 24/7"
                  value={pharmacy}
                  onChange={(e) => setPharmacy(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Prescribed By & Dates */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-1 border-b border-outline-variant/30">
            <Icon name="stethoscope" size={18} className="text-primary" />
            <h4 className="font-serif text-sm font-bold text-on-surface uppercase tracking-wider text-[11px]">
              4. Clinical Prescriber & Dates
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Doctor Name"
              placeholder="e.g. Dr. Alok Sharma"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            />

            <Input
              label="Specialty / Department"
              placeholder="e.g. Diabetology / Cardiology"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />

            <Input
              label="Hospital / Clinic"
              placeholder="e.g. City Multi-speciality Hospital"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
            />

            <Input
              label="Doctor Phone / Emergency"
              placeholder="e.g. +91 98101 22345"
              value={doctorPhone}
              onChange={(e) => setDoctorPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <Input
              label="End Date (Optional)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Section 5: Safety Protocols */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <Icon name="warning" size={18} className="text-warning" />
              <h4 className="font-serif text-sm font-bold text-on-surface uppercase tracking-wider text-[11px]">
                5. Safety Protocols & Precautions
              </h4>
            </div>

            <button
              type="button"
              onClick={handleAddProtocol}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Icon name="add" size={14} />
              <span>+ Add Protocol</span>
            </button>
          </div>

          <div className="space-y-2">
            {safetyProtocols.map((protocol, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="e.g. Always verify 250ml water taken; Do NOT double dose if missed."
                  value={protocol}
                  onChange={(e) => handleProtocolChange(index, e.target.value)}
                />
                {safetyProtocols.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProtocol(index)}
                    className="p-2 text-outline hover:text-error transition-colors"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-end gap-3">
          <Button variant="surface" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={isSubmitting}
            className="font-bold shadow-sm"
          >
            {isSubmitting
              ? isEditing
                ? 'Updating...'
                : 'Saving...'
              : isEditing
              ? 'Update Medication'
              : 'Add Medication'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
