const express = require("express");
const multer = require("multer");
const router = express.Router({ mergeParams: true });

const careDocumentController = require("../controllers/careDocument.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { verifyCircleMembership } = require("../middleware/circleAuth.middleware");
const validate = require("../middleware/validate.middleware");
const { circleIdParamValidationRules } = require("../validators/careCircle.validator");
const {
  documentIdParamValidationRules,
  createDocumentValidationRules,
  uploadDocumentValidationRules,
  updateDocumentValidationRules,
} = require("../validators/careDocument.validator");
const { MAX_DOCUMENT_FILE_SIZE_BYTES } = require("../utils/s3.util");

/**
 * Configure Multer in-memory storage for encrypted streaming to S3
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCUMENT_FILE_SIZE_BYTES || 15 * 1024 * 1024,
  },
});

// Common pipeline for all circle-scoped document routes:
// 1. authenticate (JWT)
// 2. circleIdParamValidationRules (validate circleId format)
// 3. validate (check validator result)
// 4. verifyCircleMembership (ensure user is an ACTIVE member of this care circle)
router.use(
  authenticate,
  circleIdParamValidationRules,
  validate,
  verifyCircleMembership
);

/**
 * @route   POST /api/care-circles/:circleId/documents/upload
 * @desc    Upload an encrypted binary document file directly to S3 vault
 * @access  Private (All Active Circle Members)
 */
router.post(
  "/upload",
  upload.single("file"),
  uploadDocumentValidationRules,
  validate,
  careDocumentController.uploadDocumentFile
);

/**
 * @route   POST /api/care-circles/:circleId/documents
 * @desc    Create a document reference in the vault (URL or external storage path)
 * @access  Private (All Active Circle Members)
 */
router.post(
  "/",
  createDocumentValidationRules,
  validate,
  careDocumentController.createDocument
);

/**
 * @route   GET /api/care-circles/:circleId/documents
 * @desc    List documents with role & PERSONAL privacy filtering, categories, search & pagination
 * @access  Private (All Active Circle Members)
 */
router.get("/", careDocumentController.getCircleDocuments);

/**
 * @route   GET /api/care-circles/:circleId/documents/emergency
 * @desc    Get emergency quick-access documents (excluding non-uploader PERSONAL docs)
 * @access  Private (All Active Circle Members)
 */
router.get("/emergency", careDocumentController.getEmergencyDocuments);

/**
 * @route   GET /api/care-circles/:circleId/documents/expiring
 * @desc    Get expiring and expired documents telemetry
 * @access  Private (All Active Circle Members)
 */
router.get("/expiring", careDocumentController.getExpiringDocuments);

/**
 * @route   GET /api/care-circles/:circleId/documents/:docId
 * @desc    Get a single document by ID (with privacy enforcement & VIEW audit logging)
 * @access  Private (Circle Members with matching role permission or uploader)
 */
router.get(
  "/:docId",
  documentIdParamValidationRules,
  validate,
  careDocumentController.getDocumentById
);

/**
 * @route   GET /api/care-circles/:circleId/documents/:docId/download
 * @desc    Authorize and generate a short-lived presigned GET download/preview URL
 * @access  Private (Circle Members with matching role permission or uploader)
 */
router.get(
  "/:docId/download",
  documentIdParamValidationRules,
  validate,
  careDocumentController.getDocumentDownloadUrl
);

/**
 * @route   PATCH /api/care-circles/:circleId/documents/:docId
 * @desc    Update document metadata (Uploader or Caretakers for non-PERSONAL docs)
 * @access  Private (Uploader or Main/Sub Caretaker)
 */
router.patch(
  "/:docId",
  documentIdParamValidationRules,
  updateDocumentValidationRules,
  validate,
  careDocumentController.updateDocument
);

/**
 * @route   DELETE /api/care-circles/:circleId/documents/:docId
 * @desc    Delete a document and its S3 object (Uploader or Caretakers for non-PERSONAL docs)
 * @access  Private (Uploader or Main/Sub Caretaker)
 */
router.delete(
  "/:docId",
  documentIdParamValidationRules,
  validate,
  careDocumentController.deleteDocument
);

/**
 * @route   GET /api/care-circles/:circleId/documents/:docId/audit-logs
 * @desc    Get access audit logs for a document (Caretakers only, or uploader for PERSONAL docs)
 * @access  Private (Main/Sub Caretakers, or uploader for PERSONAL)
 */
router.get(
  "/:docId/audit-logs",
  documentIdParamValidationRules,
  validate,
  careDocumentController.getDocumentAuditLogs
);

module.exports = router;
