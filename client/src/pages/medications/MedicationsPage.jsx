import React, { useState, useEffect, useCallback } from 'react';
import { useCareCircle } from '../../hooks/useCareCircle';
import { medicationApi } from '../../api/medication.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Icon } from '../../components/ui/Icon';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { canManageMedications, ROLE_LABELS } from '../../constants/roles';

// Subcomponents
import { TodayScheduleView } from './components/TodayScheduleView';
import { MedicationCard } from './components/MedicationCard';
import { MedicationDetailModal } from './components/MedicationDetailModal';
import { MedicationFormModal } from './components/MedicationFormModal';
import { RecordDoseModal } from './components/RecordDoseModal';
import { RefillStockModal } from './components/RefillStockModal';
import { AdherenceStatsView } from './components/AdherenceStatsView';

export function MedicationsPage() {
  const {
    activeCircleId,
    activeCircle,
    activeRecipient,
    activeRole,
    isLoading: isCircleLoading,
  } = useCareCircle();


  const canManage = canManageMedications(activeRole);

  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'prescriptions' | 'adherence'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Data states
  const [medications, setMedications] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [adherenceStats, setAdherenceStats] = useState(null);

  // Loading & error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); // 'ACTIVE' | 'DISCONTINUED' | 'ALL'

  // Modal states
  const [selectedMedicationIdForDetail, setSelectedMedicationIdForDetail] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState(null);
  const [doseModalData, setDoseModalData] = useState(null);
  const [refillModalMedication, setRefillModalMedication] = useState(null);

  // Toast / notification banner
  const [bannerMessage, setBannerMessage] = useState(null);

  const showBanner = (message, type = 'success') => {
    setBannerMessage({ message, type });
    setTimeout(() => {
      setBannerMessage(null);
    }, 4000);
  };

  // Fetch all medications
  const fetchMedications = useCallback(async () => {
    if (!activeCircleId) return;
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await medicationApi.getCircleMedications(activeCircleId, params);
      setMedications(res?.medications || []);
    } catch (err) {
      console.error('Failed to fetch medications:', err);
    }
  }, [activeCircleId, statusFilter, searchQuery]);

  // Fetch today schedule
  const fetchTodaySchedule = useCallback(async () => {
    if (!activeCircleId) return;
    try {
      const res = await medicationApi.getTodaySchedule(activeCircleId, selectedDate);
      setTodaySchedule(res);
    } catch (err) {
      console.error('Failed to fetch today schedule:', err);
    }
  }, [activeCircleId, selectedDate]);

  // Fetch adherence stats
  const fetchAdherenceStats = useCallback(async () => {
    if (!activeCircleId) return;
    try {
      const res = await medicationApi.getAdherenceStats(activeCircleId);
      setAdherenceStats(res);
    } catch (err) {
      console.error('Failed to fetch adherence stats:', err);
    }
  }, [activeCircleId]);

  // Unified load handler
  const loadAllData = useCallback(async () => {
    if (!activeCircleId) return;
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchMedications(),
        fetchTodaySchedule(),
        fetchAdherenceStats(),
      ]);
    } catch (err) {
      setError(err.message || 'Failed to load medication records.');
    } finally {
      setIsLoading(false);
    }
  }, [activeCircleId, fetchMedications, fetchTodaySchedule, fetchAdherenceStats]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Re-fetch schedule when date changes
  useEffect(() => {
    fetchTodaySchedule();
  }, [selectedDate, fetchTodaySchedule]);

  // Re-fetch medications when filter/search changes
  useEffect(() => {
    fetchMedications();
  }, [statusFilter, searchQuery, fetchMedications]);

  const recipientName = activeRecipient?.fullName || activeCircle?.name || 'Care Recipient';

  // Calculate low-stock count across active medications
  const lowStockCount = medications.filter(
    (m) =>
      m.status === 'ACTIVE' &&
      m.stock?.tracked !== false &&
      (m.stock?.currentQuantity ?? 0) <= (m.stock?.lowStockThreshold ?? 10)
  ).length;

  if (isCircleLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <span className="text-xs text-on-surface-variant font-medium">
          Loading Care Circle information...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Banner message */}
      {bannerMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
            bannerMessage.type === 'success'
              ? 'bg-success-container/30 border-success/30 text-success'
              : 'bg-error-container/30 border-error/30 text-error'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <Icon
              name={bannerMessage.type === 'success' ? 'check_circle' : 'error'}
              size={18}
            />
            <span>{bannerMessage.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-outline hover:text-on-surface"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-6 sm:p-8 shadow-xs border border-outline-variant/30">
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-48 w-48 h-48 rounded-full bg-secondary-fixed/20 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
              <Icon name="medication" size={16} />
              <span>Medication Regimen & Pill Adherence</span>
              <span className="text-outline-variant">•</span>
              <span className="text-on-surface-variant font-medium">CareOS Clinical</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-on-surface tracking-tight leading-tight font-bold">
              Medications for {recipientName}
            </h1>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Track daily dosage schedules, record doses taken/skipped, monitor pharmacy inventory, and review 7-day adherence.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            {canManage && (
              <Button
                variant="primary"
                size="md"
                icon="add"
                onClick={() => {
                  setFormInitialData(null);
                  setIsFormModalOpen(true);
                }}
                className="font-bold shadow-sm"
              >
                Add Medication
              </Button>
            )}
          </div>
        </div>

        {/* Header Telemetry Pills */}
        <div className="mt-6 pt-5 border-t border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-on-surface font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              <span>
                <strong>{medications.filter((m) => m.status === 'ACTIVE').length}</strong> Active Prescriptions
              </span>
            </div>

            {lowStockCount > 0 && (
              <div className="flex items-center gap-1.5 text-error font-bold px-2 py-0.5 rounded-full bg-error-container/30">
                <Icon name="inventory_2" size={14} />
                <span>{lowStockCount} Low-Stock Alert</span>
              </div>
            )}

            {adherenceStats && (
              <div className="flex items-center gap-1.5 text-primary font-semibold">
                <Icon name="local_fire_department" size={14} className="text-warning" />
                <span>
                  <strong>{adherenceStats.streakDays} Day</strong> Adherence Streak ({adherenceStats.averageAdherenceRate}%)
                </span>
              </div>
            )}
          </div>

          <div className="text-on-surface-variant text-[11px]">
            Role: <strong className="text-on-surface">{ROLE_LABELS[activeRole] || activeRole}</strong>
            {!canManage && <span className="ml-1 text-outline">(Logging & View Access)</span>}
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'today'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <Icon name="today" size={18} />
            <span>Today's Doses Schedule</span>
            {todaySchedule?.summary?.pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest text-primary text-xs font-bold">
                {todaySchedule.summary.pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prescriptions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'prescriptions'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <Icon name="medication" size={18} />
            <span>Prescriptions & Stock ({medications.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('adherence')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'adherence'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <Icon name="analytics" size={18} />
            <span>Adherence & Logs</span>
          </button>
        </div>

        <button
          type="button"
          onClick={loadAllData}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors font-semibold self-end sm:self-center"
        >
          <Icon name="refresh" size={16} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {isLoading && medications.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size="lg" />
          <span className="text-xs text-on-surface-variant">Loading medication records...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-error-container/20 border border-error/30 text-center space-y-3">
          <Icon name="error" size={32} className="text-error mx-auto" />
          <h3 className="font-serif text-lg font-bold text-on-surface">
            Could not load medications
          </h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">{error}</p>
          <Button variant="surface" size="sm" onClick={loadAllData}>
            Try Again
          </Button>
        </div>
      ) : (
        <>
          {/* TAB 1: TODAY'S SCHEDULE */}
          {activeTab === 'today' && (
            <TodayScheduleView
              timeline={todaySchedule?.timeline}
              summary={todaySchedule?.summary}
              selectedDate={selectedDate}
              onDateChange={(newDate) => setSelectedDate(newDate)}
              onRecordDoseClick={(doseInfo) => {
                setDoseModalData({
                  ...doseInfo,
                  scheduledDate: selectedDate,
                });
              }}
              onViewMedicationClick={(medId) => setSelectedMedicationIdForDetail(medId)}
              isLoading={isLoading}
              canManage={canManage}
            />
          )}

          {/* TAB 2: PRESCRIPTIONS & STOCK LIST */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-5">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-3.5 rounded-2xl border border-outline-variant/30 shadow-xs">
                <div className="flex-1 max-w-md">
                  <Input
                    placeholder="Search medicines by name or generic title..."
                    icon="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 text-xs"
                  >
                    <option value="ACTIVE">Active Prescriptions</option>
                    <option value="DISCONTINUED">Discontinued</option>
                    <option value="ALL">All Prescriptions</option>
                  </Select>
                </div>
              </div>

              {/* Medication Grid */}
              {medications.length === 0 ? (
                <EmptyState
                  icon="medication"
                  title="No Medications Found"
                  description={
                    searchQuery
                      ? 'No medications matched your search query. Try clearing the search filter.'
                      : 'No prescriptions have been registered yet in this Care Circle.'
                  }
                  action={
                    canManage && !searchQuery
                      ? {
                          label: '+ Add First Medication',
                          onClick: () => {
                            setFormInitialData(null);
                            setIsFormModalOpen(true);
                          },
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {medications.map((med) => (
                    <MedicationCard
                      key={med.id || med._id}
                      medication={med}
                      onViewDetail={(id) => setSelectedMedicationIdForDetail(id)}
                      onRefillClick={(medItem) => setRefillModalMedication(medItem)}
                      onDiscontinueClick={async (medItem) => {
                        setSelectedMedicationIdForDetail(medItem.id || medItem._id);
                      }}
                      canManage={canManage}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADHERENCE & LOGS */}
          {activeTab === 'adherence' && (
            <AdherenceStatsView
              circleId={activeCircleId}
              stats={adherenceStats}
              isLoading={isLoading}
            />
          )}
        </>
      )}

      {/* Medication Detail Dossier Modal */}
      {selectedMedicationIdForDetail && (
        <MedicationDetailModal
          isOpen={Boolean(selectedMedicationIdForDetail)}
          onClose={() => setSelectedMedicationIdForDetail(null)}
          medicationId={selectedMedicationIdForDetail}
          circleId={activeCircleId}
          onRefillClick={(medItem) => {
            setSelectedMedicationIdForDetail(null);
            setRefillModalMedication(medItem);
          }}
          onDiscontinueSuccess={() => {
            showBanner('Medication successfully marked as discontinued.');
            loadAllData();
          }}
          canManage={canManage}
        />
      )}

      {/* Medication Create/Edit Modal */}
      {isFormModalOpen && (
        <MedicationFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          circleId={activeCircleId}
          initialData={formInitialData}
          onSuccess={(newMed) => {
            showBanner(
              formInitialData
                ? `Updated ${newMed.name} successfully.`
                : `Added ${newMed.name} to medication regimen.`
            );
            loadAllData();
          }}
        />
      )}

      {/* Record Dose TAKEN/SKIPPED Modal */}
      {doseModalData && (
        <RecordDoseModal
          isOpen={Boolean(doseModalData)}
          onClose={() => setDoseModalData(null)}
          circleId={activeCircleId}
          doseData={doseModalData}
          onSuccess={(result) => {
            const statusLabel = result?.doseLog?.status || 'recorded';
            showBanner(`Dose marked as ${statusLabel} successfully.`);
            loadAllData();
          }}
        />
      )}

      {/* Refill Stock Modal */}
      {refillModalMedication && (
        <RefillStockModal
          isOpen={Boolean(refillModalMedication)}
          onClose={() => setRefillModalMedication(null)}
          circleId={activeCircleId}
          medication={refillModalMedication}
          onSuccess={(result) => {
            showBanner(`Refilled stock for ${refillModalMedication.name}. Current stock: ${result?.stock?.currentQuantity}.`);
            loadAllData();
          }}
        />
      )}
    </div>
  );
}
