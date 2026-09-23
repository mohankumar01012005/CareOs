import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Icon } from '../../../components/ui/Icon';
import {
  NOTE_CATEGORIES,
  NOTE_CATEGORY_LABELS,
  NOTE_SHIFTS,
  NOTE_SHIFT_LABELS,
  NOTE_URGENCY,
  NOTE_URGENCY_LABELS,
  APPETITE_LEVELS,
  APPETITE_LABELS,
  MOOD_LEVELS,
  MOOD_LABELS,
  BOWEL_MOVEMENT_STATUS,
  BOWEL_MOVEMENT_LABELS,
} from '../../../constants/roles';

export function NoteFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isEditing = false,
  isLoading = false,
  defaultCategory = 'GENERAL',
  defaultShift = 'none',
}) {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: defaultCategory,
    shift: defaultShift,
    urgency: NOTE_URGENCY.NORMAL,
    noteDate: getTodayStr(),
    vitalsSnapshot: {
      bpSystolic: '',
      bpDiastolic: '',
      heartRate: '',
      bloodSugar: '',
      temperature: '',
      spO2: '',
    },
    dietMood: {
      appetite: '',
      mood: '',
      bowelMovement: '',
    },
  });

  const [showVitalsSection, setShowVitalsSection] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData && isEditing) {
      setFormData({
        title: initialData.title || '',
        content: initialData.content || '',
        category: initialData.category || 'GENERAL',
        shift: initialData.shift || 'none',
        urgency: initialData.urgency || NOTE_URGENCY.NORMAL,
        noteDate: initialData.noteDate || getTodayStr(),
        vitalsSnapshot: {
          bpSystolic: initialData.vitalsSnapshot?.bpSystolic ?? '',
          bpDiastolic: initialData.vitalsSnapshot?.bpDiastolic ?? '',
          heartRate: initialData.vitalsSnapshot?.heartRate ?? '',
          bloodSugar: initialData.vitalsSnapshot?.bloodSugar ?? '',
          temperature: initialData.vitalsSnapshot?.temperature ?? '',
          spO2: initialData.vitalsSnapshot?.spO2 ?? '',
        },
        dietMood: {
          appetite: initialData.dietMood?.appetite || '',
          mood: initialData.dietMood?.mood || '',
          bowelMovement: initialData.dietMood?.bowelMovement || '',
        },
      });

      const hasVitalsOrDiet =
        initialData.vitalsSnapshot?.bpSystolic ||
        initialData.vitalsSnapshot?.heartRate ||
        initialData.vitalsSnapshot?.bloodSugar ||
        initialData.vitalsSnapshot?.temperature ||
        initialData.vitalsSnapshot?.spO2 ||
        initialData.dietMood?.appetite ||
        initialData.dietMood?.mood ||
        initialData.dietMood?.bowelMovement;

      if (hasVitalsOrDiet) {
        setShowVitalsSection(true);
      }
    } else {
      setFormData({
        title: '',
        content: '',
        category: defaultCategory,
        shift: defaultShift,
        urgency: NOTE_URGENCY.NORMAL,
        noteDate: getTodayStr(),
        vitalsSnapshot: {
          bpSystolic: '',
          bpDiastolic: '',
          heartRate: '',
          bloodSugar: '',
          temperature: '',
          spO2: '',
        },
        dietMood: {
          appetite: '',
          mood: '',
          bowelMovement: '',
        },
      });
      setShowVitalsSection(defaultCategory === 'VITALS_DIET' || defaultCategory === 'HANDOVER');
      setErrors({});
    }
  }, [initialData, isEditing, defaultCategory, defaultShift, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleVitalChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      vitalsSnapshot: {
        ...prev.vitalsSnapshot,
        [field]: value,
      },
    }));
  };

  const handleDietMoodChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      dietMood: {
        ...prev.dietMood,
        [field]: value || null,
      },
    }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.content || formData.content.trim().length < 2) {
      errs.content = 'Note content must be at least 2 characters.';
    }
    if (formData.content && formData.content.length > 3000) {
      errs.content = 'Note content cannot exceed 3000 characters.';
    }
    if (formData.title && formData.title.length > 200) {
      errs.title = 'Title cannot exceed 200 characters.';
    }
    if (!formData.noteDate || !/^\d{4}-\d{2}-\d{2}$/.test(formData.noteDate)) {
      errs.noteDate = 'Date must be in YYYY-MM-DD format.';
    }

    // Validate vitals numerical bounds if entered
    const vs = formData.vitalsSnapshot;
    if (vs.bpSystolic !== '' && (Number(vs.bpSystolic) < 40 || Number(vs.bpSystolic) > 300)) {
      errs.bpSystolic = 'Systolic BP must be 40-300';
    }
    if (vs.bpDiastolic !== '' && (Number(vs.bpDiastolic) < 30 || Number(vs.bpDiastolic) > 200)) {
      errs.bpDiastolic = 'Diastolic BP must be 30-200';
    }
    if (vs.heartRate !== '' && (Number(vs.heartRate) < 30 || Number(vs.heartRate) > 250)) {
      errs.heartRate = 'Heart rate must be 30-250 bpm';
    }
    if (vs.bloodSugar !== '' && (Number(vs.bloodSugar) < 20 || Number(vs.bloodSugar) > 800)) {
      errs.bloodSugar = 'Blood sugar must be 20-800 mg/dL';
    }
    if (vs.temperature !== '' && (Number(vs.temperature) < 90 || Number(vs.temperature) > 110)) {
      errs.temperature = 'Temp must be 90-110 °F';
    }
    if (vs.spO2 !== '' && (Number(vs.spO2) < 50 || Number(vs.spO2) > 100)) {
      errs.spO2 = 'SpO2 must be 50-100%';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Clean payload
    const payload = {
      title: formData.title ? formData.title.trim() : null,
      content: formData.content.trim(),
      category: formData.category,
      shift: formData.shift,
      urgency: formData.urgency,
      noteDate: formData.noteDate,
    };

    // Format vitalsSnapshot
    const vs = formData.vitalsSnapshot;
    const cleanVitals = {};
    if (vs.bpSystolic !== '') cleanVitals.bpSystolic = Number(vs.bpSystolic);
    if (vs.bpDiastolic !== '') cleanVitals.bpDiastolic = Number(vs.bpDiastolic);
    if (vs.heartRate !== '') cleanVitals.heartRate = Number(vs.heartRate);
    if (vs.bloodSugar !== '') cleanVitals.bloodSugar = Number(vs.bloodSugar);
    if (vs.temperature !== '') cleanVitals.temperature = Number(vs.temperature);
    if (vs.spO2 !== '') cleanVitals.spO2 = Number(vs.spO2);
    payload.vitalsSnapshot = cleanVitals;

    // Format dietMood
    const dm = formData.dietMood;
    const cleanDietMood = {};
    if (dm.appetite) cleanDietMood.appetite = dm.appetite;
    if (dm.mood) cleanDietMood.mood = dm.mood;
    if (dm.bowelMovement) cleanDietMood.bowelMovement = dm.bowelMovement;
    payload.dietMood = cleanDietMood;

    onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Care Note' : 'Log Care Note & Observation'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Top grid: Category, Shift, Urgency, Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Category
            </label>
            <Select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full text-sm"
            >
              {NOTE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {NOTE_CATEGORY_LABELS[cat] || cat}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Shift
            </label>
            <Select
              value={formData.shift}
              onChange={(e) => handleChange('shift', e.target.value)}
              className="w-full text-sm"
            >
              {NOTE_SHIFTS.map((s) => (
                <option key={s} value={s}>
                  {NOTE_SHIFT_LABELS[s] || s}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Urgency Level
            </label>
            <Select
              value={formData.urgency}
              onChange={(e) => handleChange('urgency', e.target.value)}
              className="w-full text-sm"
            >
              {Object.values(NOTE_URGENCY).map((urg) => (
                <option key={urg} value={urg}>
                  {NOTE_URGENCY_LABELS[urg] || urg}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Note Date
            </label>
            <Input
              type="date"
              value={formData.noteDate}
              onChange={(e) => handleChange('noteDate', e.target.value)}
              error={errors.noteDate}
              className="w-full text-sm"
            />
          </div>
        </div>

        {/* Title (Optional) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
            Title (Optional)
          </label>
          <Input
            placeholder="e.g. Morning Blood Sugar & Breakfast Notes"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            error={errors.title}
            maxLength={200}
            className="w-full text-sm"
          />
        </div>

        {/* Note Content (Required) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
            Note & Observation Content <span className="text-error">*</span>
          </label>
          <textarea
            rows={4}
            placeholder="Record observations, shifts updates, symptom changes, meals eaten, or instructions for the next caregiver..."
            value={formData.content}
            onChange={(e) => handleChange('content', e.target.value)}
            className={`w-full rounded-xl p-3 text-sm bg-surface-container-low border text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary transition-all resize-y ${
              errors.content
                ? 'border-error ring-1 ring-error'
                : 'border-outline-variant/50 hover:border-outline-variant'
            }`}
          />
          {errors.content && (
            <p className="text-xs text-error mt-1 font-medium">{errors.content}</p>
          )}
          <div className="flex justify-end text-[11px] text-on-surface-variant/70 mt-1">
            {formData.content.length}/3000 chars
          </div>
        </div>

        {/* Collapsible Vitals & Diet Snapshot Section */}
        <div className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest">
          <button
            type="button"
            onClick={() => setShowVitalsSection((prev) => !prev)}
            className="w-full p-3.5 flex items-center justify-between bg-surface-container-low hover:bg-surface-container transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Icon name="monitor_heart" size={18} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                Vitals & Nutrition Snapshot (Optional)
              </span>
            </div>
            <Icon
              name={showVitalsSection ? 'expand_less' : 'expand_more'}
              size={20}
              className="text-on-surface-variant"
            />
          </button>

          {showVitalsSection && (
            <div className="p-4 space-y-4 border-t border-outline-variant/20 animate-in fade-in duration-150">
              <p className="text-xs text-on-surface-variant">
                Record biometric vitals and daily nutrition observations logged during this shift.
              </p>

              {/* Vitals Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    Systolic BP (mmHg)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 120"
                    value={formData.vitalsSnapshot.bpSystolic}
                    onChange={(e) => handleVitalChange('bpSystolic', e.target.value)}
                    error={errors.bpSystolic}
                    min={40}
                    max={300}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    Diastolic BP (mmHg)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 80"
                    value={formData.vitalsSnapshot.bpDiastolic}
                    onChange={(e) => handleVitalChange('bpDiastolic', e.target.value)}
                    error={errors.bpDiastolic}
                    min={30}
                    max={200}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    Heart Rate (bpm)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 72"
                    value={formData.vitalsSnapshot.heartRate}
                    onChange={(e) => handleVitalChange('heartRate', e.target.value)}
                    error={errors.heartRate}
                    min={30}
                    max={250}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    Blood Sugar (mg/dL)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 110"
                    value={formData.vitalsSnapshot.bloodSugar}
                    onChange={(e) => handleVitalChange('bloodSugar', e.target.value)}
                    error={errors.bloodSugar}
                    min={20}
                    max={800}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    Temperature (°F)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 98.6"
                    value={formData.vitalsSnapshot.temperature}
                    onChange={(e) => handleVitalChange('temperature', e.target.value)}
                    error={errors.temperature}
                    min={90}
                    max={110}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    Oxygen SpO2 (%)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 98"
                    value={formData.vitalsSnapshot.spO2}
                    onChange={(e) => handleVitalChange('spO2', e.target.value)}
                    error={errors.spO2}
                    min={50}
                    max={100}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Nutrition & Mood Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-outline-variant/20">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    Appetite / Meal Intake
                  </label>
                  <Select
                    value={formData.dietMood.appetite || ''}
                    onChange={(e) => handleDietMoodChange('appetite', e.target.value)}
                    className="text-xs"
                  >
                    <option value="">-- Not Recorded --</option>
                    {APPETITE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {APPETITE_LABELS[lvl] || lvl}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    Mood / Mental State
                  </label>
                  <Select
                    value={formData.dietMood.mood || ''}
                    onChange={(e) => handleDietMoodChange('mood', e.target.value)}
                    className="text-xs"
                  >
                    <option value="">-- Not Recorded --</option>
                    {MOOD_LEVELS.map((m) => (
                      <option key={m} value={m}>
                        {MOOD_LABELS[m] || m}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    Bowel Movement
                  </label>
                  <Select
                    value={formData.dietMood.bowelMovement || ''}
                    onChange={(e) => handleDietMoodChange('bowelMovement', e.target.value)}
                    className="text-xs"
                  >
                    <option value="">-- Not Recorded --</option>
                    {BOWEL_MOVEMENT_STATUS.map((bm) => (
                      <option key={bm} value={bm}>
                        {BOWEL_MOVEMENT_LABELS[bm] || bm}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
          <Button
            type="button"
            variant="surface"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={isEditing ? 'save' : 'add'}
            disabled={isLoading}
            className="font-bold shadow-sm"
          >
            {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Care Note'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
