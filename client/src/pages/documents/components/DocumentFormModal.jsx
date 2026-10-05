import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_PRIVACY_LEVELS,
  DOCUMENT_PRIVACY_LABELS,
  DOCUMENT_PRIVACY_DESCRIPTIONS,
  DOCUMENT_PRIVACY_ICONS,
} from '../../../constants/roles';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function DocumentFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isEditing = false,
  isSaving = false,
  defaultCategory = 'OTHER',
  defaultEmergency = false,
}) {
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'OTHER',
    privacyLevel: DOCUMENT_PRIVACY_LEVELS.CIRCLE_WIDE,
    fileUrl: '',
    fileName: '',
    fileType: 'application/pdf',
    fileSizeBytes: 0,
    documentNumber: '',
    issuedDate: '',
    expiryDate: '',
    isEmergencyAccessible: false,
    description: '',
    tagsString: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (initialData && isEditing) {
        setUploadMode(initialData.storageProvider === 'S3' ? 'file' : 'url');
        setSelectedFile(null);
        setFormData({
          title: initialData.title || '',
          category: initialData.category || 'OTHER',
          privacyLevel: initialData.privacyLevel || DOCUMENT_PRIVACY_LEVELS.CIRCLE_WIDE,
          fileUrl: initialData.fileUrl || '',
          fileName: initialData.fileName || initialData.originalFileName || '',
          fileType: initialData.fileType || initialData.mimeType || 'application/pdf',
          fileSizeBytes: initialData.fileSizeBytes || 0,
          documentNumber: initialData.documentNumber || '',
          issuedDate: initialData.issuedDate || '',
          expiryDate: initialData.expiryDate || '',
          isEmergencyAccessible: Boolean(initialData.isEmergencyAccessible),
          description: initialData.description || '',
          tagsString: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : '',
        });
      } else {
        setUploadMode('file');
        setSelectedFile(null);
        setFormData({
          title: '',
          category: defaultCategory || 'OTHER',
          privacyLevel: defaultEmergency ? DOCUMENT_PRIVACY_LEVELS.EMERGENCY_SOS : DOCUMENT_PRIVACY_LEVELS.CIRCLE_WIDE,
          fileUrl: '',
          fileName: '',
          fileType: 'application/pdf',
          fileSizeBytes: 0,
          documentNumber: '',
          issuedDate: '',
          expiryDate: '',
          isEmergencyAccessible: defaultEmergency,
          description: '',
          tagsString: '',
        });
      }
      setValidationErrors({});
    }
  }, [isOpen, initialData, isEditing, defaultCategory, defaultEmergency]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // If switching to PERSONAL privacy, disable emergency flag
      if (field === 'privacyLevel' && value === DOCUMENT_PRIVACY_LEVELS.PERSONAL) {
        updated.isEmergencyAccessible = false;
      }
      return updated;
    });

    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    // Check size limit (15MB)
    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setValidationErrors((prev) => ({
        ...prev,
        file: 'File size exceeds maximum allowed 15MB limit',
      }));
      return;
    }

    setSelectedFile(file);
    setValidationErrors((prev) => ({ ...prev, file: null }));

    // Autofill title if empty
    if (!formData.title.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setFormData((prev) => ({
        ...prev,
        title: baseName.charAt(0).toUpperCase() + baseName.slice(1),
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSizeBytes: file.size,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSizeBytes: file.size,
      }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = 'Document title is required';
    } else if (formData.title.trim().length < 2) {
      errors.title = 'Title must be at least 2 characters';
    } else if (formData.title.trim().length > 200) {
      errors.title = 'Title cannot exceed 200 characters';
    }

    if (!isEditing && uploadMode === 'file' && !selectedFile) {
      errors.file = 'Please select or drop a file to upload';
    }

    if (!isEditing && uploadMode === 'url' && !formData.fileUrl.trim()) {
      errors.fileUrl = 'File URL or storage reference is required';
    }

    if (formData.issuedDate && !/^\d{4}-\d{2}-\d{2}$/.test(formData.issuedDate)) {
      errors.issuedDate = 'Issued date must be in YYYY-MM-DD format';
    }

    if (formData.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(formData.expiryDate)) {
      errors.expiryDate = 'Expiry date must be in YYYY-MM-DD format';
    }

    if (
      formData.privacyLevel === DOCUMENT_PRIVACY_LEVELS.PERSONAL &&
      formData.isEmergencyAccessible
    ) {
      errors.isEmergencyAccessible =
        'Personal (Uploader-Only) documents cannot be flagged as Emergency Accessible.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const tags = formData.tagsString
      ? formData.tagsString
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];

    if (!isEditing && uploadMode === 'file' && selectedFile) {
      // Build FormData for direct S3 upload
      const formPayload = new FormData();
      formPayload.append('file', selectedFile);
      formPayload.append('title', formData.title.trim());
      formPayload.append('category', formData.category);
      formPayload.append('privacyLevel', formData.privacyLevel);
      if (formData.description.trim()) {
        formPayload.append('description', formData.description.trim());
      }
      if (formData.documentNumber.trim()) {
        formPayload.append('documentNumber', formData.documentNumber.trim());
      }
      if (formData.issuedDate) {
        formPayload.append('issuedDate', formData.issuedDate);
      }
      if (formData.expiryDate) {
        formPayload.append('expiryDate', formData.expiryDate);
      }
      formPayload.append('isEmergencyAccessible', String(formData.isEmergencyAccessible));
      tags.forEach((t) => formPayload.append('tags', t));
      formPayload.append('version', String(formData.version || 1));

      onSubmit(formPayload, true);
    } else {
      // JSON payload for metadata update or URL reference
      const jsonPayload = {
        title: formData.title.trim(),
        category: formData.category,
        privacyLevel: formData.privacyLevel,
        fileUrl: formData.fileUrl.trim() || undefined,
        fileName: formData.fileName.trim() || undefined,
        fileType: formData.fileType.trim() || 'application/pdf',
        fileSizeBytes: Number(formData.fileSizeBytes) || 0,
        documentNumber: formData.documentNumber.trim() || undefined,
        issuedDate: formData.issuedDate || undefined,
        expiryDate: formData.expiryDate || undefined,
        isEmergencyAccessible: Boolean(formData.isEmergencyAccessible),
        description: formData.description.trim() || undefined,
        tags,
      };

      onSubmit(jsonPayload, false);
    }
  };

  const isPersonalPrivacy = formData.privacyLevel === DOCUMENT_PRIVACY_LEVELS.PERSONAL;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/50 backdrop-blur-xs overflow-y-auto">
      <Card
        variant="lowest"
        padding="none"
        className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-xs">
              <Icon name={isEditing ? 'edit_document' : 'cloud_upload'} size={20} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-on-surface">
                {isEditing ? 'Edit Document Metadata' : 'Add Document to Secure Vault'}
              </h2>
              <p className="text-xs text-on-surface-variant">
                Encrypted with AWS KMS & stored privately in Amazon S3.
              </p>
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

        {/* Upload Mode Selector for New Documents */}
        {!isEditing && (
          <div className="px-6 pt-4 pb-1 flex items-center gap-2 border-b border-outline-variant/20 bg-surface-container-low/20">
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                uploadMode === 'file'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <Icon name="upload_file" size={16} />
              <span>Upload Real File (Encrypted S3)</span>
            </button>

            <button
              type="button"
              onClick={() => setUploadMode('url')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                uploadMode === 'url'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <Icon name="link" size={16} />
              <span>External URL / Reference</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* File Upload Drop Zone (New Files Only) */}
          {!isEditing && uploadMode === 'file' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1">
                Select Document File <span className="text-error">*</span>
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary bg-primary-container/20 scale-[0.99]'
                    : selectedFile
                    ? 'border-success/50 bg-success-container/10'
                    : 'border-outline-variant/60 hover:border-primary/50 bg-surface-container-low/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt"
                />

                {selectedFile ? (
                  <div className="flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-success text-on-success flex items-center justify-center shrink-0">
                        <Icon name="verified" size={20} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-on-surface truncate">
                          {selectedFile.name}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          {formatBytes(selectedFile.size)} • {selectedFile.type || 'Document'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                      title="Remove file"
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-2">
                    <div className="w-12 h-12 rounded-2xl bg-primary-container/30 text-primary flex items-center justify-center mx-auto">
                      <Icon name="cloud_upload" size={26} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-on-surface">
                        Click to browse or drag & drop document
                      </span>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        PDF, JPG, PNG, DOCX, XLSX, TXT (Max 15MB) • SSE-KMS Encrypted
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {validationErrors.file && (
                <p className="text-[11px] text-error font-medium">{validationErrors.file}</p>
              )}
            </div>
          )}

          {/* External URL Input */}
          {(!isEditing && uploadMode === 'url') && (
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1">
                File URL / Document Reference <span className="text-error">*</span>
              </label>
              <Input
                placeholder="https://... or /documents/records/cardiology-2026.pdf"
                value={formData.fileUrl}
                onChange={(e) => handleChange('fileUrl', e.target.value)}
                error={validationErrors.fileUrl}
                icon="link"
                required
              />
              <p className="text-[11px] text-on-surface-variant">
                Provide the direct document access link or storage reference path.
              </p>
            </div>
          )}

          {/* Document Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
              Document Title <span className="text-error">*</span>
            </label>
            <Input
              placeholder="e.g. Star Health Insurance Policy 2026, Cardiology Lab Report"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={validationErrors.title}
              required
            />
          </div>

          {/* Category & Privacy Tier Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                Category
              </label>
              <Select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {DOCUMENT_CATEGORY_LABELS[cat] || cat}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                Privacy / Visibility Tier
              </label>
              <Select
                value={formData.privacyLevel}
                onChange={(e) => handleChange('privacyLevel', e.target.value)}
              >
                {Object.keys(DOCUMENT_PRIVACY_LEVELS).map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {DOCUMENT_PRIVACY_LABELS[lvl] || lvl}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Privacy Description Box */}
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 flex items-start gap-2.5 text-xs text-on-surface-variant">
            <Icon
              name={DOCUMENT_PRIVACY_ICONS[formData.privacyLevel] || 'info'}
              size={18}
              className="text-primary shrink-0 mt-0.5"
            />
            <div>
              <span className="font-bold text-on-surface block">
                Visibility: {DOCUMENT_PRIVACY_LABELS[formData.privacyLevel]}
              </span>
              <span>
                {DOCUMENT_PRIVACY_DESCRIPTIONS[formData.privacyLevel]}
              </span>
            </div>
          </div>

          {/* Optional File Name & Document Number Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                File Name (Optional)
              </label>
              <Input
                placeholder="e.g. policy-doc-2026.pdf"
                value={formData.fileName}
                onChange={(e) => handleChange('fileName', e.target.value)}
                icon="attachment"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                Document / Policy # (Optional)
              </label>
              <Input
                placeholder="e.g. POL-99201940"
                value={formData.documentNumber}
                onChange={(e) => handleChange('documentNumber', e.target.value)}
                icon="tag"
              />
            </div>
          </div>

          {/* Issued Date & Expiration Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                Issued Date
              </label>
              <Input
                type="date"
                value={formData.issuedDate}
                onChange={(e) => handleChange('issuedDate', e.target.value)}
                error={validationErrors.issuedDate}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                Expiry / Renewal Date
              </label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => handleChange('expiryDate', e.target.value)}
                error={validationErrors.expiryDate}
              />
            </div>
          </div>

          {/* Emergency SOS Access Toggle */}
          <div className={`p-3.5 border rounded-xl flex items-center justify-between gap-3 ${
            isPersonalPrivacy
              ? 'bg-surface-container-low/50 border-outline-variant/30 opacity-60'
              : 'bg-error-container/20 border-error/20'
          }`}>
            <div className="flex items-start gap-2.5">
              <Icon name="emergency" size={20} className={isPersonalPrivacy ? 'text-outline' : 'text-error shrink-0 mt-0.5'} />
              <div>
                <span className="text-xs font-bold text-on-surface block">
                  Emergency Quick Access Flag
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {isPersonalPrivacy
                    ? 'Personal (Uploader-Only) documents cannot be flagged as Emergency Accessible.'
                    : 'Make this document instantly available in emergency / crisis situations for any caregiver.'}
                </span>
              </div>
            </div>

            <label className={`relative inline-flex items-center ${isPersonalPrivacy ? 'cursor-not-allowed' : 'cursor-pointer'} shrink-0`}>
              <input
                type="checkbox"
                checked={formData.isEmergencyAccessible}
                disabled={isPersonalPrivacy}
                onChange={(e) => handleChange('isEmergencyAccessible', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-error" />
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
              Description & Notes
            </label>
            <textarea
              rows={3}
              placeholder="Add details, clinical notes, or renewal instructions..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              maxLength={1000}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
              Tags (Comma separated)
            </label>
            <Input
              placeholder="e.g. cardiology, lab, insurance, emergency"
              value={formData.tagsString}
              onChange={(e) => handleChange('tagsString', e.target.value)}
              icon="label"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="surface"
              size="md"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={isSaving ? 'sync' : isEditing ? 'save' : 'cloud_upload'}
              disabled={isSaving}
              className="font-bold text-xs shadow-sm"
            >
              {isSaving ? 'Saving & Encrypting...' : isEditing ? 'Update Document' : 'Save to Vault'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
