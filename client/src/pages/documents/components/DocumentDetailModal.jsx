import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { careDocumentsApi } from '../../../api/careDocuments.api';
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_CATEGORY_ICONS,
  DOCUMENT_CATEGORY_BADGE_VARIANTS,
  DOCUMENT_PRIVACY_LABELS,
  DOCUMENT_PRIVACY_DESCRIPTIONS,
  DOCUMENT_PRIVACY_ICONS,
  DOCUMENT_PRIVACY_BADGE_VARIANTS,
  DOCUMENT_AUDIT_ACTION_LABELS,
  DOCUMENT_AUDIT_ACTION_ICONS,
  canEditDocument,
  canDeleteDocument,
  canViewAuditLogs,
} from '../../../constants/roles';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function DocumentDetailModal({
  isOpen,
  onClose,
  document,
  circleId,
  currentUser,
  userRole,
  onEdit,
  onDelete,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'audit'
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const canAudit = canViewAuditLogs(userRole, document, currentUser);

  useEffect(() => {
    if (isOpen && document && canAudit && activeTab === 'audit') {
      let isMounted = true;
      async function fetchAudit() {
        setIsLoadingAudit(true);
        setAuditError(null);
        try {
          const docId = document._id || document.id;
          const data = await careDocumentsApi.getDocumentAuditLogs(circleId, docId);
          if (isMounted) {
            setAuditLogs(data.auditLogs || []);
          }
        } catch (err) {
          if (isMounted) {
            setAuditError(err.message || 'Failed to load audit logs');
          }
        } finally {
          if (isMounted) {
            setIsLoadingAudit(false);
          }
        }
      }
      fetchAudit();
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, document, canAudit, activeTab, circleId]);

  if (!isOpen || !document) return null;

  const docId = document._id || document.id;
  const uploaderName = document.uploadedBy?.name || 'Circle Member';
  const uploaderPhoto = document.uploadedBy?.profilePhoto;
  const uploaderEmail = document.uploadedBy?.email;

  const canEdit = canEditDocument(document, currentUser, userRole);
  const canDelete = canDeleteDocument(document, currentUser, userRole);

  const categoryLabel = DOCUMENT_CATEGORY_LABELS[document.category] || document.category || 'General';
  const categoryIcon = DOCUMENT_CATEGORY_ICONS[document.category] || 'description';
  const categoryBadgeVariant = DOCUMENT_CATEGORY_BADGE_VARIANTS[document.category] || 'neutral';

  const privacyLabel = DOCUMENT_PRIVACY_LABELS[document.privacyLevel] || document.privacyLevel;
  const privacyIcon = DOCUMENT_PRIVACY_ICONS[document.privacyLevel] || 'lock';
  const privacyBadgeVariant = DOCUMENT_PRIVACY_BADGE_VARIANTS[document.privacyLevel] || 'neutral';
  const privacyDesc = DOCUMENT_PRIVACY_DESCRIPTIONS[document.privacyLevel] || '';

  const isEmergency = document.isEmergencyAccessible || document.privacyLevel === 'EMERGENCY_SOS';
  const isS3Vault = document.storageProvider === 'S3' || Boolean(document.s3Key);

  const formattedUploadDate = document.createdAt
    ? new Date(document.createdAt).toLocaleString()
    : 'Recently';

  const handleDownload = async (isInline = false) => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const data = await careDocumentsApi.getDocumentDownloadUrl(circleId, docId, isInline);
      if (data?.downloadUrl) {
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setDownloadError(err.message || 'Failed to authorize document access');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/50 backdrop-blur-xs overflow-y-auto">
      <Card
        variant="lowest"
        padding="none"
        className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-xs">
              <Icon name="description" size={20} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-on-surface">
                Document Dossier
              </h2>
              <span className="text-xs text-on-surface-variant font-mono">
                ID: {docId}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Tab Navigation if Authorized to Audit */}
        {canAudit && (
          <div className="px-6 pt-3 border-b border-outline-variant/20 flex items-center gap-4 bg-surface-container-lowest">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon name="info" size={16} />
              <span>Document Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon name="history" size={16} />
              <span>Access Audit Trail</span>
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {activeTab === 'overview' ? (
            <>
              {/* Badges Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={categoryBadgeVariant} size="sm" icon={categoryIcon}>
                  {categoryLabel}
                </Badge>
                <Badge variant={privacyBadgeVariant} size="sm" icon={privacyIcon}>
                  {privacyLabel}
                </Badge>
                {isEmergency && (
                  <Badge variant="error" size="sm" icon="emergency">
                    Emergency SOS
                  </Badge>
                )}
                {isS3Vault && (
                  <Badge variant="success" size="sm" icon="lock">
                    AWS KMS Encrypted
                  </Badge>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-on-surface leading-snug">
                  {document.title}
                </h3>
                {document.description && (
                  <p className="text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-line bg-surface-container-low/60 p-3.5 rounded-xl border border-outline-variant/20">
                    {document.description}
                  </p>
                )}
              </div>

              {/* Privacy Description Box */}
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 flex items-start gap-2.5 text-xs text-on-surface-variant">
                <Icon name={privacyIcon} size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-on-surface block">
                    Privacy Tier: {privacyLabel}
                  </span>
                  <span>{privacyDesc}</span>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {document.documentNumber && (
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
                      Document / Policy #
                    </span>
                    <span className="font-mono text-sm font-semibold text-on-surface mt-0.5 block">
                      {document.documentNumber}
                    </span>
                  </div>
                )}

                {document.issuedDate && (
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
                      Issued Date
                    </span>
                    <span className="font-semibold text-on-surface mt-0.5 block">
                      {document.issuedDate}
                    </span>
                  </div>
                )}

                {document.expiryDate && (
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
                      Expiry Date
                    </span>
                    <span className="font-semibold text-on-surface mt-0.5 block">
                      {document.expiryDate}
                    </span>
                  </div>
                )}

                {document.fileSizeBytes > 0 && (
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
                      File Size
                    </span>
                    <span className="font-semibold text-on-surface mt-0.5 block">
                      {formatBytes(document.fileSizeBytes)}
                    </span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {document.tags && document.tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
                    Keywords / Tags:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {document.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-lg bg-primary-container/20 text-primary font-bold text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Secure File Access & Download Card */}
              <div className="p-4 bg-surface-container rounded-2xl border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
                    <Icon name={isS3Vault ? 'lock' : 'link'} size={20} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-on-surface truncate">
                      {document.fileName || document.originalFileName || 'Encrypted File Object'}
                    </span>
                    <span className="text-[11px] text-on-surface-variant truncate font-mono">
                      {isS3Vault
                        ? `Amazon S3 (${document.s3Region || 'ap-south-1'}) • SSE-KMS`
                        : document.fileUrl}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={isDownloading ? 'sync' : 'download'}
                    onClick={() => handleDownload(false)}
                    disabled={isDownloading}
                    className="font-bold text-xs shadow-sm"
                  >
                    {isDownloading ? 'Authorizing...' : 'Download'}
                  </Button>

                  <Button
                    variant="surface"
                    size="sm"
                    icon="visibility"
                    onClick={() => handleDownload(true)}
                    disabled={isDownloading}
                    className="text-xs font-semibold"
                    title="Open document in preview tab"
                  >
                    Preview
                  </Button>
                </div>
              </div>

              {downloadError && (
                <div className="p-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-xs flex items-center gap-2">
                  <Icon name="error" size={16} />
                  <span>{downloadError}</span>
                </div>
              )}

              {/* Uploader Attribution */}
              <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between gap-3 text-xs text-on-surface-variant">
                <div className="flex items-center gap-2.5">
                  <Avatar name={uploaderName} src={uploaderPhoto} size="sm" />
                  <div>
                    <span className="font-bold text-on-surface block">
                      Uploaded by {uploaderName}
                    </span>
                    {uploaderEmail && (
                      <span className="text-[11px]">{uploaderEmail}</span>
                    )}
                  </div>
                </div>
                <span>{formattedUploadDate}</span>
              </div>
            </>
          ) : (
            /* Caretaker Audit Trail View */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-base font-bold text-on-surface">
                    Immutable Access History
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    All document uploads, downloads, views, and updates are securely recorded for compliance.
                  </p>
                </div>
                <Badge variant="neutral" size="sm">
                  {auditLogs.length} Records
                </Badge>
              </div>

              {isLoadingAudit && (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-surface-container rounded-xl animate-pulse" />
                  ))}
                </div>
              )}

              {auditError && (
                <div className="p-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-xs">
                  {auditError}
                </div>
              )}

              {!isLoadingAudit && auditLogs.length === 0 && (
                <div className="p-6 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
                  No access audit entries recorded yet.
                </div>
              )}

              {!isLoadingAudit && auditLogs.length > 0 && (
                <div className="space-y-2">
                  {auditLogs.map((log, index) => {
                    const userName = log.user?.name || 'Caregiver';
                    const userRoleStr = log.user?.role || '';
                    const actionLabel = DOCUMENT_AUDIT_ACTION_LABELS[log.action] || log.action;
                    const actionIcon = DOCUMENT_AUDIT_ACTION_ICONS[log.action] || 'info';
                    const timeStr = log.performedAt ? new Date(log.performedAt).toLocaleString() : '';

                    return (
                      <div
                        key={log._id || index}
                        className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                            <Icon name={actionIcon} size={15} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-on-surface">
                                {actionLabel}
                              </span>
                              <span className="text-outline-variant">•</span>
                              <span className="text-on-surface-variant">
                                {userName} {userRoleStr && `(${userRoleStr})`}
                              </span>
                            </div>
                            {log.details && (
                              <span className="text-[11px] text-on-surface-variant block">
                                {log.details}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[11px] text-outline font-mono shrink-0">
                          {timeStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 bg-surface-container-low/50 border-t border-outline-variant/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="surface"
                size="sm"
                icon="edit"
                onClick={() => onEdit && onEdit(document)}
                className="text-xs font-semibold"
              >
                Edit Metadata
              </Button>
            )}

            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                icon="delete"
                onClick={() => onDelete && onDelete(document)}
                className="text-xs text-error hover:bg-error-container/20 font-semibold"
              >
                Delete Document
              </Button>
            )}
          </div>

          <Button
            variant="surface"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
