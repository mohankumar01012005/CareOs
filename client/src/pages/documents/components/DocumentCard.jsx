import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_CATEGORY_ICONS,
  DOCUMENT_CATEGORY_BADGE_VARIANTS,
  DOCUMENT_PRIVACY_LABELS,
  DOCUMENT_PRIVACY_ICONS,
  DOCUMENT_PRIVACY_BADGE_VARIANTS,
  canEditDocument,
  canDeleteDocument,
} from '../../../constants/roles';

/**
 * Format bytes to readable string (e.g. 1.2 MB)
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Helper to calculate expiry status
 */
function getExpiryStatus(expiryDateStr) {
  if (!expiryDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      label: `Expired (${expiryDateStr})`,
      variant: 'error',
      icon: 'error',
    };
  } else if (diffDays <= 30) {
    return {
      status: 'expiring_soon',
      label: diffDays === 0 ? 'Expires Today' : `Expires in ${diffDays}d (${expiryDateStr})`,
      variant: 'warning',
      icon: 'schedule',
    };
  } else {
    return {
      status: 'active',
      label: `Expires: ${expiryDateStr}`,
      variant: 'neutral',
      icon: 'event',
    };
  }
}

export function DocumentCard({
  document,
  currentUser,
  userRole,
  onView,
  onEdit,
  onDelete,
}) {
  if (!document) return null;

  const uploaderName = document.uploadedBy?.name || 'Circle Member';
  const uploaderPhoto = document.uploadedBy?.profilePhoto;
  const formattedDate = document.createdAt
    ? new Date(document.createdAt).toLocaleDateString()
    : '';

  const expiry = getExpiryStatus(document.expiryDate);
  const isEmergency =
    document.isEmergencyAccessible || document.privacyLevel === 'EMERGENCY_SOS';
  const isS3Vault = document.storageProvider === 'S3' || Boolean(document.s3Key);

  const canEdit = canEditDocument(document, currentUser, userRole);
  const canDelete = canDeleteDocument(document, currentUser, userRole);

  const categoryLabel = DOCUMENT_CATEGORY_LABELS[document.category] || document.category || 'General';
  const categoryIcon = DOCUMENT_CATEGORY_ICONS[document.category] || 'description';
  const categoryBadgeVariant = DOCUMENT_CATEGORY_BADGE_VARIANTS[document.category] || 'neutral';

  const privacyLabel = DOCUMENT_PRIVACY_LABELS[document.privacyLevel] || document.privacyLevel;
  const privacyIcon = DOCUMENT_PRIVACY_ICONS[document.privacyLevel] || 'lock';
  const privacyBadgeVariant = DOCUMENT_PRIVACY_BADGE_VARIANTS[document.privacyLevel] || 'neutral';

  const sizeStr = formatBytes(document.fileSizeBytes);

  return (
    <Card
      variant="lowest"
      padding="none"
      className="group relative overflow-hidden border border-outline-variant/30 hover:border-primary/40 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col justify-between bg-surface-container-lowest"
    >
      {/* Top Banner & Badges */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Category Badge */}
            <Badge variant={categoryBadgeVariant} size="sm" icon={categoryIcon}>
              {categoryLabel}
            </Badge>

            {/* Privacy Level Badge */}
            <Badge variant={privacyBadgeVariant} size="sm" icon={privacyIcon}>
              {privacyLabel}
            </Badge>

            {/* Emergency SOS Badge */}
            {isEmergency && (
              <Badge variant="error" size="sm" icon="emergency">
                Emergency SOS
              </Badge>
            )}

            {/* S3 Vault KMS Badge */}
            {isS3Vault && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success-container/20 text-success text-[10px] font-bold">
                <Icon name="lock" size={11} />
                <span>KMS</span>
              </span>
            )}
          </div>

          {/* Expiry Pill */}
          {expiry && (
            <Badge variant={expiry.variant} size="sm" icon={expiry.icon}>
              {expiry.label}
            </Badge>
          )}
        </div>

        {/* Document Title & Description */}
        <div className="cursor-pointer space-y-1.5" onClick={() => onView && onView(document)}>
          <h3 className="font-serif text-lg font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {document.title}
          </h3>
          {document.description && (
            <p className="text-xs sm:text-sm text-on-surface-variant line-clamp-2 leading-relaxed">
              {document.description}
            </p>
          )}
        </div>

        {/* Document Metadata Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant pt-1">
          {document.documentNumber && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container font-mono text-[11px] font-medium text-on-surface">
              <Icon name="tag" size={13} />
              Doc #{document.documentNumber}
            </span>
          )}

          {document.issuedDate && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container text-[11px]">
              <Icon name="calendar_today" size={13} />
              Issued: {document.issuedDate}
            </span>
          )}

          {sizeStr && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container text-[11px]">
              <Icon name="attachment" size={13} />
              {sizeStr}
            </span>
          )}

          {document.tags && document.tags.length > 0 && (
            document.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-primary-container/20 text-primary font-semibold text-[11px]"
              >
                #{tag}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Footer Row: Uploader Attribution & Action Buttons */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-surface-container-low/60 border-t border-outline-variant/30 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={uploaderName} src={uploaderPhoto} size="sm" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-on-surface truncate">
              {uploaderName}
            </span>
            <span className="text-[11px] text-on-surface-variant">
              {formattedDate}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="surface"
            size="sm"
            icon="visibility"
            onClick={() => onView && onView(document)}
            className="text-xs font-semibold"
          >
            View
          </Button>

          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              icon="edit"
              onClick={() => onEdit && onEdit(document)}
              className="text-xs text-on-surface-variant hover:text-on-surface"
              title="Edit document metadata"
            />
          )}

          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              icon="delete"
              onClick={() => onDelete && onDelete(document)}
              className="text-xs text-error hover:bg-error-container/20"
              title="Delete document"
            />
          )}
        </div>
      </div>
    </Card>
  );
}
