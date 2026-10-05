import React, { useState, useEffect, useCallback } from 'react';
import { useCareCircle } from '../../hooks/useCareCircle';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { careDocumentsApi } from '../../api/careDocuments.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Icon } from '../../components/ui/Icon';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_PRIVACY_LEVELS,
  DOCUMENT_PRIVACY_LABELS,
} from '../../constants/roles';

// Components
import { DocumentCard } from './components/DocumentCard';
import { EmergencyDocumentsSection } from './components/EmergencyDocumentsSection';
import { ExpiringDocumentsSection } from './components/ExpiringDocumentsSection';
import { DocumentFormModal } from './components/DocumentFormModal';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';

export function DocumentsPage() {
  const { user } = useAuth();
  const {
    activeCircleId,
    activeCircle,
    activeRecipient,
    activeRole,
  } = useCareCircle();

  const toast = useToast();

  // Navigation Tabs: 'all' | 'emergency' | 'expiring'
  const [activeTab, setActiveTab] = useState('all');

  // Documents & Telemetry States
  const [documents, setDocuments] = useState([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [emergencyDocuments, setEmergencyDocuments] = useState([]);
  const [expiringData, setExpiringData] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState('');
  const [emergencyFilter, setEmergencyFilter] = useState(false);

  // Loading & Error States
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isLoadingEmergency, setIsLoadingEmergency] = useState(false);
  const [isLoadingExpiring, setIsLoadingExpiring] = useState(false);
  const [error, setError] = useState(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [formDefaultCategory, setFormDefaultCategory] = useState('OTHER');
  const [formDefaultEmergency, setFormDefaultEmergency] = useState(false);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const recipientName = activeRecipient?.fullName || activeCircle?.name || 'Care Recipient';

  /**
   * 1. Fetch All Documents with Search and Filters
   */
  const fetchDocuments = useCallback(async () => {
    if (!activeCircleId) return;
    setIsLoadingDocuments(true);
    setError(null);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (privacyFilter) params.privacyLevel = privacyFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (emergencyFilter) params.isEmergencyAccessible = 'true';

      const data = await careDocumentsApi.getCircleDocuments(activeCircleId, params);
      setDocuments(data.documents || []);
      setTotalDocuments(data.total ?? data.count ?? (data.documents?.length || 0));
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError(typeof err === 'string' ? err : err?.message || 'Failed to load documents');
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [activeCircleId, categoryFilter, privacyFilter, searchQuery, emergencyFilter]);

  /**
   * 2. Fetch Emergency Quick-Access Documents
   */
  const fetchEmergencyDocuments = useCallback(async () => {
    if (!activeCircleId) return;
    setIsLoadingEmergency(true);
    try {
      const data = await careDocumentsApi.getEmergencyDocuments(activeCircleId);
      setEmergencyDocuments(data.documents || []);
    } catch (err) {
      console.warn('Failed to fetch emergency documents:', err.message);
    } finally {
      setIsLoadingEmergency(false);
    }
  }, [activeCircleId]);

  /**
   * 3. Fetch Expiring & Expired Documents Telemetry
   */
  const fetchExpiringDocuments = useCallback(async () => {
    if (!activeCircleId) return;
    setIsLoadingExpiring(true);
    try {
      const data = await careDocumentsApi.getExpiringDocuments(activeCircleId, 30);
      setExpiringData(data);
    } catch (err) {
      console.warn('Failed to fetch expiring documents:', err.message);
    } finally {
      setIsLoadingExpiring(false);
    }
  }, [activeCircleId]);

  // Initial & Circle Change Load
  useEffect(() => {
    fetchDocuments();
    fetchEmergencyDocuments();
    fetchExpiringDocuments();
  }, [fetchDocuments, fetchEmergencyDocuments, fetchExpiringDocuments]);

  /**
   * Handle Open View Document (triggers backend VIEW audit logging)
   */
  const handleViewDocument = async (doc) => {
    const docId = doc._id || doc.id;
    try {
      const data = await careDocumentsApi.getDocumentById(activeCircleId, docId);
      setSelectedDocument(data.document || doc);
      setIsDetailOpen(true);
    } catch (err) {
      toast.error(err.message || 'Failed to open document');
    }
  };

  /**
   * Handle Open Add Modal
   */
  const handleOpenAddModal = (options = {}) => {
    setEditingDocument(null);
    setFormDefaultCategory(options.category || 'OTHER');
    setFormDefaultEmergency(Boolean(options.isEmergency));
    setIsFormOpen(true);
  };

  /**
   * Handle Open Edit Modal
   */
  const handleOpenEditModal = (doc) => {
    setEditingDocument(doc);
    setIsFormOpen(true);
    if (isDetailOpen) {
      setIsDetailOpen(false);
    }
  };

  /**
   * Handle Open Delete Confirmation Modal
   */
  const handleOpenDeleteModal = (doc) => {
    setDeletingDocument(doc);
    setIsDeleteOpen(true);
    if (isDetailOpen) {
      setIsDetailOpen(false);
    }
  };

  /**
   * Handle Save / Update Document Form Submit
   */
  const handleFormSubmit = async (payload, isFileUpload = false) => {
    if (!activeCircleId) return;
    setIsSaving(true);
    try {
      if (editingDocument) {
        const docId = editingDocument._id || editingDocument.id;
        await careDocumentsApi.updateDocument(activeCircleId, docId, payload);
        toast.success('Document updated successfully');
      } else if (isFileUpload) {
        await careDocumentsApi.uploadDocumentFile(activeCircleId, payload);
        toast.success('Document uploaded and encrypted in vault');
      } else {
        await careDocumentsApi.createDocument(activeCircleId, payload);
        toast.success('Document added to vault');
      }

      setIsFormOpen(false);
      setEditingDocument(null);

      // Refresh documents and telemetry
      await fetchDocuments();
      await Promise.allSettled([
        fetchEmergencyDocuments(),
        fetchExpiringDocuments(),
      ]);
    } catch (err) {
      toast.error(err.message || 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle Confirm Delete Document
   */
  const handleConfirmDelete = async () => {
    if (!activeCircleId || !deletingDocument) return;
    const docId = deletingDocument._id || deletingDocument.id;
    setIsDeleting(true);
    try {
      await careDocumentsApi.deleteDocument(activeCircleId, docId);
      toast.success('Document deleted successfully');
      setIsDeleteOpen(false);
      setDeletingDocument(null);

      // Refresh feeds
      await fetchDocuments();
      await Promise.allSettled([
        fetchEmergencyDocuments(),
        fetchExpiringDocuments(),
      ]);
    } catch (err) {
      toast.error(err.message || 'Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  const emergencyCount = emergencyDocuments.length;
  const expiringCount = expiringData?.expiringCount || 0;
  const expiredCount = expiringData?.expiredCount || 0;

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-6 sm:p-8 shadow-sm border border-outline-variant/30">
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-48 w-48 h-48 rounded-full bg-tertiary-fixed/20 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
              <Icon name="folder_shared" size={18} />
              <span>Medical Records & Document Vault</span>
              <span className="text-outline-variant">•</span>
              <span className="text-on-surface-variant font-medium">
                {activeCircle?.name || 'Active Circle'}
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              Documents for {recipientName}
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Store insurance policies, hospital discharge summaries, diagnostic lab reports, prescriptions, and emergency directives.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0 flex-wrap">
            <Button
              variant="surface"
              size="md"
              icon="emergency"
              onClick={() => handleOpenAddModal({ isEmergency: true })}
              className="font-semibold text-xs sm:text-sm text-error"
            >
              Add Emergency Doc
            </Button>
            <Button
              variant="primary"
              size="md"
              icon="add"
              onClick={() => handleOpenAddModal()}
              className="font-bold shadow-sm text-xs sm:text-sm"
            >
              Add Document
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
            <Icon name="folder" size={16} />
            <span>All Documents</span>
            {totalDocuments > 0 && activeTab === 'all' && (
              <span className="px-1.5 py-0.2 rounded-full bg-on-primary/20 text-on-primary text-[10px]">
                {totalDocuments}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('emergency')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'emergency'
                ? 'bg-error text-on-error shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Icon name="emergency" size={16} />
            <span>Emergency Vault</span>
            {emergencyCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'emergency' ? 'bg-on-error/20 text-on-error' : 'bg-error-container text-error'
              }`}>
                {emergencyCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expiring')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'expiring'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Icon name="event_repeat" size={16} />
            <span>Expiring & Renewals</span>
            {(expiringCount > 0 || expiredCount > 0) && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'expiring' ? 'bg-on-primary/20 text-on-primary' : 'bg-warning/20 text-warning font-bold'
              }`}>
                {expiringCount + expiredCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'emergency' && (
        <EmergencyDocumentsSection
          documents={emergencyDocuments}
          isLoading={isLoadingEmergency}
          currentUser={user}
          userRole={activeRole}
          onView={handleViewDocument}
          onEdit={handleOpenEditModal}
          onDelete={handleOpenDeleteModal}
          onAddDocument={() => handleOpenAddModal({ isEmergency: true })}
        />
      )}

      {activeTab === 'expiring' && (
        <ExpiringDocumentsSection
          expiringData={expiringData}
          isLoading={isLoadingExpiring}
          currentUser={user}
          userRole={activeRole}
          onView={handleViewDocument}
          onEdit={handleOpenEditModal}
          onDelete={handleOpenDeleteModal}
          onAddDocument={() => handleOpenAddModal()}
        />
      )}

      {activeTab === 'all' && (
        <div className="space-y-6">
          {/* Search & Filter Toolbar */}
          <Card variant="lowest" padding="sm" className="border border-outline-variant/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by title, keywords, policy #, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon="search"
                  className="text-xs"
                />
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Filter */}
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs py-1.5 h-9 w-38"
                >
                  <option value="">All Categories</option>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {DOCUMENT_CATEGORY_LABELS[cat] || cat}
                    </option>
                  ))}
                </Select>

                {/* Privacy Filter */}
                <Select
                  value={privacyFilter}
                  onChange={(e) => setPrivacyFilter(e.target.value)}
                  className="text-xs py-1.5 h-9 w-42"
                >
                  <option value="">All Privacy Tiers</option>
                  {Object.keys(DOCUMENT_PRIVACY_LEVELS).map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {DOCUMENT_PRIVACY_LABELS[lvl] || lvl}
                    </option>
                  ))}
                </Select>

                {/* Emergency Toggle Filter */}
                <button
                  type="button"
                  onClick={() => setEmergencyFilter((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                    emergencyFilter
                      ? 'bg-error-container text-error border-error/40'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-transparent'
                  }`}
                >
                  <Icon name="emergency" size={15} />
                  <span>Emergency Only</span>
                </button>

                {/* Reset Filters */}
                {(searchQuery || categoryFilter || privacyFilter || emergencyFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('');
                      setPrivacyFilter('');
                      setEmergencyFilter(false);
                    }}
                    className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                    title="Reset all filters"
                  >
                    <Icon name="filter_alt_off" size={18} />
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Error Message Banner */}
          {error && (
            <Card variant="lowest" padding="md" className="border border-error/30 bg-error-container/20 text-error flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Icon name="error" size={18} />
                <span>{typeof error === 'string' ? error : error?.message || 'Failed to load documents'}</span>
              </div>
              <Button variant="surface" size="sm" onClick={fetchDocuments} className="text-xs">
                Retry
              </Button>
            </Card>
          )}

          {/* Loading Skeleton */}
          {isLoadingDocuments && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} variant="lowest" padding="md" className="border border-outline-variant/30 animate-pulse space-y-3">
                  <div className="h-5 w-32 bg-surface-container-high rounded" />
                  <div className="h-6 w-48 bg-surface-container-high rounded" />
                  <div className="h-12 w-full bg-surface-container-high rounded" />
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoadingDocuments && documents.length === 0 && (
            <Card variant="lowest" padding="lg" className="border border-dashed border-outline-variant/50 text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center mx-auto mb-3">
                <Icon name="folder_open" size={32} />
              </div>
              <h3 className="font-serif text-lg font-bold text-on-surface">
                No Documents Found
              </h3>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto mt-1.5 leading-relaxed">
                {searchQuery || categoryFilter || privacyFilter || emergencyFilter
                  ? 'No documents match your active search and filter criteria. Try resetting the filters.'
                  : `Securely upload medical IDs, prescriptions, insurance policies, and diagnostic reports for ${recipientName}.`}
              </p>
              <div className="mt-5">
                <Button
                  variant="primary"
                  size="md"
                  icon="add"
                  onClick={() => handleOpenAddModal()}
                  className="font-bold text-xs sm:text-sm"
                >
                  Upload First Document
                </Button>
              </div>
            </Card>
          )}

          {/* Documents Grid */}
          {!isLoadingDocuments && documents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc._id || doc.id}
                  document={doc}
                  currentUser={user}
                  userRole={activeRole}
                  onView={handleViewDocument}
                  onEdit={handleOpenEditModal}
                  onDelete={handleOpenDeleteModal}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <DocumentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingDocument}
        isEditing={Boolean(editingDocument)}
        isSaving={isSaving}
        defaultCategory={formDefaultCategory}
        defaultEmergency={formDefaultEmergency}
      />

      <DocumentDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        document={selectedDocument}
        circleId={activeCircleId}
        currentUser={user}
        userRole={activeRole}
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
      />

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        documentTitle={deletingDocument?.title || 'this document'}
        isDeleting={isDeleting}
      />
    </div>
  );
}
