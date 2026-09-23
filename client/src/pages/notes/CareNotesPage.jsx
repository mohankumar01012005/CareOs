import React, { useState, useEffect, useCallback } from 'react';
import { useCareCircle } from '../../hooks/useCareCircle';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { careNotesApi } from '../../api/careNotes.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  NOTE_CATEGORIES,
  NOTE_CATEGORY_LABELS,
  NOTE_SHIFTS,
  NOTE_SHIFT_LABELS,
  NOTE_URGENCY,
  NOTE_URGENCY_LABELS,
} from '../../constants/roles';

import { NoteCard } from './components/NoteCard';
import { NoteFormModal } from './components/NoteFormModal';
import { NoteDetailModal } from './components/NoteDetailModal';
import { ShiftHandoverCard } from './components/ShiftHandoverCard';
import { DailySummaryCard } from './components/DailySummaryCard';

export function CareNotesPage() {
  const { user } = useAuth();
  const {
    activeCircleId,
    activeCircle,
    activeRecipient,
    activeRole,
  } = useCareCircle();
  const toast = useToast();

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // State Management
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'handover' | 'summary' | 'pinned'
  const [notes, setNotes] = useState([]);
  const [latestHandover, setLatestHandover] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');

  // Loading & Error states
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isLoadingHandover, setIsLoadingHandover] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [error, setError] = useState(null);

  // Modals & Action states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formDefaultCategory, setFormDefaultCategory] = useState('GENERAL');
  const [formDefaultShift, setFormDefaultShift] = useState('none');

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * 1. Fetch Care Notes for Active Circle with filters
   */
  const fetchNotes = useCallback(async () => {
    if (!activeCircleId) return;
    setIsLoadingNotes(true);
    setError(null);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (urgencyFilter) params.urgency = urgencyFilter;
      if (shiftFilter) params.shift = shiftFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (activeTab === 'pinned') params.isPinned = 'true';
      if (activeTab === 'handover') params.category = 'HANDOVER';

      const data = await careNotesApi.getCircleNotes(activeCircleId, params);
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Failed to fetch care notes:', err);
      setError(err.message || 'Failed to load care notes');
    } finally {
      setIsLoadingNotes(false);
    }
  }, [activeCircleId, categoryFilter, urgencyFilter, shiftFilter, searchQuery, activeTab]);

  /**
   * 2. Fetch Latest Handover Note
   */
  const fetchLatestHandover = useCallback(async () => {
    if (!activeCircleId) return;
    setIsLoadingHandover(true);
    try {
      const data = await careNotesApi.getLatestHandover(activeCircleId);
      setLatestHandover(data.note || null);
    } catch (err) {
      console.warn('Failed to fetch latest handover:', err.message);
    } finally {
      setIsLoadingHandover(false);
    }
  }, [activeCircleId]);

  /**
   * 3. Fetch Daily Notes Summary
   */
  const fetchDailySummary = useCallback(async () => {
    if (!activeCircleId) return;
    setIsLoadingSummary(true);
    try {
      const data = await careNotesApi.getDailyNotesSummary(activeCircleId, selectedDate);
      setDailySummary(data);
    } catch (err) {
      console.warn('Failed to fetch daily summary:', err.message);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [activeCircleId, selectedDate]);

  // Initial & Circle-change load
  useEffect(() => {
    fetchNotes();
    fetchLatestHandover();
    fetchDailySummary();
  }, [fetchNotes, fetchLatestHandover, fetchDailySummary]);

  /**
   * Handle Create / Update Note Submit
   */
  const handleFormSubmit = async (payload) => {
    if (!activeCircleId) return;
    setIsSaving(true);
    try {
      if (editingNote) {
        const noteId = editingNote._id || editingNote.id;
        const res = await careNotesApi.updateNote(activeCircleId, noteId, payload);
        toast.success('Care note updated successfully.');
        if (selectedNote && (selectedNote._id === noteId || selectedNote.id === noteId)) {
          setSelectedNote(res.note);
        }
      } else {
        await careNotesApi.createNote(activeCircleId, payload);
        toast.success(
          payload.category === 'HANDOVER'
            ? 'Shift handover logged successfully.'
            : 'Care note created successfully.'
        );
      }

      setIsFormOpen(false);
      setEditingNote(null);
      await Promise.allSettled([fetchNotes(), fetchLatestHandover(), fetchDailySummary()]);
    } catch (err) {
      console.error('Failed to save care note:', err);
      toast.error(err.message || 'Failed to save care note.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle Acknowledge Note
   */
  const handleAcknowledge = async (note) => {
    if (!activeCircleId || !note) return;
    const noteId = note._id || note.id;
    setIsAcknowledging(true);
    try {
      const res = await careNotesApi.acknowledgeNote(activeCircleId, noteId);
      toast.success('Care note acknowledged successfully.');

      // Update local states
      const updatedNote = res.note;
      setNotes((prev) =>
        prev.map((n) => ((n._id || n.id) === noteId ? updatedNote : n))
      );
      if (selectedNote && ((selectedNote._id || selectedNote.id) === noteId)) {
        setSelectedNote(updatedNote);
      }
      if (latestHandover && ((latestHandover._id || latestHandover.id) === noteId)) {
        setLatestHandover(updatedNote);
      }
    } catch (err) {
      console.error('Failed to acknowledge note:', err);
      toast.error(err.message || 'Failed to acknowledge note.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  /**
   * Handle Pin / Unpin Note
   */
  const handleTogglePin = async (note) => {
    if (!activeCircleId || !note) return;
    const noteId = note._id || note.id;
    const targetState = !note.isPinned;
    setIsPinning(true);
    try {
      const res = await careNotesApi.togglePinNote(activeCircleId, noteId, targetState);
      toast.success(targetState ? 'Note pinned to top of the feed.' : 'Note unpinned.');

      const updatedNote = res.note;
      setNotes((prev) =>
        prev.map((n) => ((n._id || n.id) === noteId ? updatedNote : n))
      );
      if (selectedNote && ((selectedNote._id || selectedNote.id) === noteId)) {
        setSelectedNote(updatedNote);
      }
      await fetchNotes();
    } catch (err) {
      console.error('Failed to pin/unpin note:', err);
      toast.error(err.message || 'Failed to update note pin status.');
    } finally {
      setIsPinning(false);
    }
  };

  /**
   * Handle Delete Note
   */
  const handleDeleteNote = async (note) => {
    if (!activeCircleId || !note) return;
    const noteId = note._id || note.id;
    setIsDeleting(true);
    try {
      await careNotesApi.deleteNote(activeCircleId, noteId);
      toast.success('Care note deleted successfully.');

      setNotes((prev) => prev.filter((n) => (n._id || n.id) !== noteId));
      if (selectedNote && ((selectedNote._id || selectedNote.id) === noteId)) {
        setSelectedNote(null);
        setIsDetailOpen(false);
      }
      await Promise.allSettled([fetchLatestHandover(), fetchDailySummary()]);
    } catch (err) {
      console.error('Failed to delete note:', err);
      toast.error(err.message || 'Failed to delete note.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open creation modal helpers
  const handleOpenCreateNote = () => {
    setEditingNote(null);
    setFormDefaultCategory('GENERAL');
    setFormDefaultShift('none');
    setIsFormOpen(true);
  };

  const handleOpenCreateHandover = () => {
    setEditingNote(null);
    setFormDefaultCategory('HANDOVER');
    setFormDefaultShift('morning');
    setIsFormOpen(true);
  };

  const handleOpenEditNote = (note) => {
    setEditingNote(note);
    setIsFormOpen(true);
  };

  const handleOpenDetailModal = (note) => {
    setSelectedNote(note);
    setIsDetailOpen(true);
  };

  const hasActiveFilters =
    categoryFilter !== '' || urgencyFilter !== '' || shiftFilter !== '' || searchQuery !== '';

  const clearFilters = () => {
    setCategoryFilter('');
    setUrgencyFilter('');
    setShiftFilter('');
    setSearchQuery('');
  };

  const recipientName = activeRecipient?.fullName || activeCircle?.name || 'Care Recipient';

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Ambient Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-6 sm:p-7 shadow-xs border border-outline-variant/30">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
              <Icon name="edit_note" size={18} />
              <span>Care Notes & Shift Handover</span>
              <span className="text-outline-variant">•</span>
              <span className="text-on-surface-variant font-medium">
                {activeCircle?.name || 'Active Circle'}
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              Care for {recipientName}
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Log shift observations, daily meal reports, mood updates, biometrics, and handover alerts.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0 flex-wrap">
            <Button
              variant="surface"
              size="md"
              icon="published_with_changes"
              onClick={handleOpenCreateHandover}
              className="font-semibold text-xs sm:text-sm"
            >
              Log Handover
            </Button>
            <Button
              variant="primary"
              size="md"
              icon="add"
              onClick={handleOpenCreateNote}
              className="font-bold shadow-sm text-xs sm:text-sm"
            >
              Add Care Note
            </Button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="mt-6 pt-4 border-t border-outline-variant/30 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'all'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Icon name="notes" size={16} />
            <span>All Care Notes</span>
            {notes.length > 0 && activeTab === 'all' && (
              <span className="px-1.5 py-0.2 rounded-full bg-on-primary/20 text-on-primary text-[10px]">
                {notes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('handover')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'handover'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Icon name="published_with_changes" size={16} />
            <span>Shift Handover</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'summary'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Icon name="analytics" size={16} />
            <span>Daily Telemetry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pinned')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'pinned'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Icon name="push_pin" size={16} className="rotate-45" />
            <span>Pinned Notes</span>
          </button>
        </div>
      </div>

      {/* Main Content Area based on Tab */}
      {activeTab === 'handover' && (
        <div className="space-y-6">
          {/* Spotlight Hero: Latest Handover */}
          <ShiftHandoverCard
            latestHandover={latestHandover}
            currentUserId={user?._id || user?.id}
            onViewDetail={handleOpenDetailModal}
            onAcknowledge={handleAcknowledge}
            onLogHandover={handleOpenCreateHandover}
            isAcknowledging={isAcknowledging}
            isLoading={isLoadingHandover}
          />
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="space-y-6">
          <DailySummaryCard
            summaryData={dailySummary}
            selectedDate={selectedDate}
            onDateChange={(newDate) => setSelectedDate(newDate)}
            isLoading={isLoadingSummary}
          />
        </div>
      )}

      {/* Feed Filter & Search Controls (for All Notes, Pinned, Handover) */}
      {activeTab !== 'summary' && (
        <div className="space-y-4">
          <Card variant="lowest" padding="sm" className="border border-outline-variant/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search notes, clinical observations, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon="search"
                  className="text-xs"
                />
              </div>

              {/* Filter Dropdowns */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Filter */}
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs py-1.5 h-9 w-38"
                >
                  <option value="">All Categories</option>
                  {NOTE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {NOTE_CATEGORY_LABELS[cat] || cat}
                    </option>
                  ))}
                </Select>

                {/* Urgency Filter */}
                <Select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="text-xs py-1.5 h-9 w-32"
                >
                  <option value="">All Urgency</option>
                  {Object.values(NOTE_URGENCY).map((urg) => (
                    <option key={urg} value={urg}>
                      {NOTE_URGENCY_LABELS[urg] || urg}
                    </option>
                  ))}
                </Select>

                {/* Shift Filter */}
                <Select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="text-xs py-1.5 h-9 w-32"
                >
                  <option value="">All Shifts</option>
                  {NOTE_SHIFTS.map((s) => (
                    <option key={s} value={s}>
                      {NOTE_SHIFT_LABELS[s] || s}
                    </option>
                  ))}
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="close"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-primary"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-error-container/20 border border-error/30 text-error flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Icon name="error" size={18} />
                <span>{typeof error === 'string' ? error : error?.message || 'Failed to load care notes'}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchNotes}
                className="text-xs font-bold text-error hover:bg-error/10"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Notes Feed List */}
          {isLoadingNotes ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <LoadingSpinner size="lg" />
              <span className="text-xs text-on-surface-variant font-medium">
                Loading care notes feed...
              </span>
            </div>
          ) : notes.length === 0 ? (
            <EmptyState
              icon={
                activeTab === 'pinned'
                  ? 'push_pin'
                  : activeTab === 'handover'
                  ? 'published_with_changes'
                  : 'edit_note'
              }
              title={
                hasActiveFilters
                  ? 'No Notes Match Filters'
                  : activeTab === 'pinned'
                  ? 'No Pinned Notes'
                  : activeTab === 'handover'
                  ? 'No Shift Handovers'
                  : 'No Care Notes Logged Yet'
              }
              description={
                hasActiveFilters
                  ? 'Try clearing the search query or adjusting your filters.'
                  : activeTab === 'pinned'
                  ? 'Caretakers and doctors can pin critical observations to keep them at the top.'
                  : activeTab === 'handover'
                  ? 'Log the first shift handover note to keep fellow circle caregivers informed.'
                  : `Start documenting daily observations, routines, and vitals for ${recipientName}.`
              }
              actionLabel={
                hasActiveFilters
                  ? 'Clear Filters'
                  : activeTab === 'handover'
                  ? 'Log Handover'
                  : 'Add Care Note'
              }
              onAction={
                hasActiveFilters
                  ? clearFilters
                  : activeTab === 'handover'
                  ? handleOpenCreateHandover
                  : handleOpenCreateNote
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notes.map((note) => (
                <NoteCard
                  key={note._id || note.id}
                  note={note}
                  currentUserId={user?._id || user?.id}
                  userRole={activeRole}
                  onViewDetail={handleOpenDetailModal}
                  onAcknowledge={handleAcknowledge}
                  onTogglePin={handleTogglePin}
                  isAcknowledging={isAcknowledging}
                  isPinning={isPinning}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Note Create/Edit Modal Form */}
      {isFormOpen && (
        <NoteFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingNote(null);
          }}
          onSubmit={handleFormSubmit}
          initialData={editingNote}
          isEditing={Boolean(editingNote)}
          isLoading={isSaving}
          defaultCategory={formDefaultCategory}
          defaultShift={formDefaultShift}
        />
      )}

      {/* Note Full Dossier Modal */}
      {isDetailOpen && selectedNote && (
        <NoteDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedNote(null);
          }}
          note={selectedNote}
          currentUser={user}
          userRole={activeRole}
          onEdit={handleOpenEditNote}
          onDelete={handleDeleteNote}
          onAcknowledge={handleAcknowledge}
          onTogglePin={handleTogglePin}
          isAcknowledging={isAcknowledging}
          isPinning={isPinning}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
