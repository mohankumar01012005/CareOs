import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  ALL_TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_TIME_SLOTS,
  TASK_TIME_SLOT_LABELS,
} from '../../../constants/roles';

export function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  members = [],
  initialDate = null,
}) {
  const isEditing = !!initialData;
  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    dueDate: todayStr,
    timeSlot: 'morning',
    exactTime: '',
    assignedTo: '',
    location: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Synchronize initial data when opening modal
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        category: initialData.category || 'GENERAL',
        priority: initialData.priority || 'MEDIUM',
        dueDate: initialData.dueDate || todayStr,
        timeSlot: initialData.timeSlot || 'morning',
        exactTime: initialData.exactTime || '',
        assignedTo: initialData.assignedTo?.id || initialData.assignedTo?._id || initialData.assignedTo || '',
        location: initialData.location || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'GENERAL',
        priority: 'MEDIUM',
        dueDate: initialDate || todayStr,
        timeSlot: 'morning',
        exactTime: '',
        assignedTo: '',
        location: '',
      });
    }
    setErrorMessage('');
  }, [initialData, initialDate, isOpen, todayStr]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanTitle = formData.title.trim();
    if (!cleanTitle) {
      setErrorMessage('Please enter a task title.');
      return;
    }

    if (cleanTitle.length < 2 || cleanTitle.length > 200) {
      setErrorMessage('Task title must be between 2 and 200 characters.');
      return;
    }

    if (!formData.dueDate) {
      setErrorMessage('Due date is required.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        title: cleanTitle,
        description: formData.description.trim() || undefined,
        category: formData.category,
        priority: formData.priority,
        dueDate: formData.dueDate,
        timeSlot: formData.timeSlot,
        exactTime: formData.exactTime.trim() || undefined,
        assignedTo: formData.assignedTo || undefined,
        location: formData.location.trim() || undefined,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save task.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Care Task' : 'Add Care Task'}
      description={
        isEditing
          ? 'Update scheduled routine, time, or assigned family member.'
          : 'Schedule a routine, medication reminder, errand, or medical check.'
      }
      maxWidth="max-w-xl"
    >
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 border border-error/20">
          <Icon name="error" size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Input
          label="Task Title / Description"
          name="title"
          placeholder="e.g. Check morning blood pressure, Pick up metformin, Walk in the garden"
          value={formData.title}
          onChange={handleChange}
          required
          autoFocus
        />

        {/* Due Date & Category Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Scheduled Date"
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            required
          />

          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            {TASK_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {TASK_CATEGORY_LABELS[cat] || cat}
              </option>
            ))}
          </Select>
        </div>

        {/* Priority & Time Slot Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Priority Level"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
          >
            {ALL_TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS[p] || p}
              </option>
            ))}
          </Select>

          <Select
            label="Time Slot"
            name="timeSlot"
            value={formData.timeSlot}
            onChange={handleChange}
          >
            {TASK_TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {TASK_TIME_SLOT_LABELS[slot] || slot}
              </option>
            ))}
          </Select>

          <Input
            label="Exact Time (Optional)"
            type="time"
            name="exactTime"
            value={formData.exactTime}
            onChange={handleChange}
          />
        </div>

        {/* Assignee & Location Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Assign Caregiver"
            name="assignedTo"
            value={formData.assignedTo}
            onChange={handleChange}
          >
            <option value="">Shared / Anyone Available</option>
            {members.map((m) => {
              const u = m.user;
              if (!u) return null;
              const uId = u.id || u._id;
              return (
                <option key={uId} value={uId}>
                  {u.name} ({m.role?.replace(/_/g, ' ') || 'Member'})
                </option>
              );
            })}
          </Select>

          <Input
            label="Location (Optional)"
            name="location"
            placeholder="e.g. Master Bedroom, City Clinic"
            value={formData.location}
            onChange={handleChange}
          />
        </div>

        {/* Detailed Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
            Instructions / Notes (Optional)
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Add specific instructions for family members or aides..."
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest text-on-surface text-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-end gap-3">
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
            isLoading={isLoading}
            className="font-bold shadow-sm px-6"
          >
            {isEditing ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
