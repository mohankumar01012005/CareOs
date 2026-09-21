const express = require("express");
const router = express.Router({ mergeParams: true });

const careDocumentController = require("../controllers/careDocument.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { verifyCircleMembership } = require("../middleware/circleAuth.middleware");
const validate = require("../middleware/validate.middleware");
const { circleIdParamValidationRules } = require("../validators/careCircle.validator");
const {
  documentIdParamValidationRules,
  createDocumentValidationRules,
  updateDocumentValidationRules,
} = require("../validators/careDocument.validator");

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
 * @route   POST /api/care-circles/:circleId/documents
 * @desc    Upload / add a document to the vault
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
 * @desc    List documents with role privacy filtering, categories, search & pagination
 * @access  Private (All Active Circle Members)
 */
router.get("/", careDocumentController.getCircleDocuments);

/**
 * @route   GET /api/care-circles/:circleId/documents/emergency
 * @desc    Get emergency quick-access documents
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
 * @desc    Get a single document by ID (with privacy enforcement & audit logging)
 * @access  Private (Circle Members with matching role permission or uploader)
 */
router.get(
  "/:docId",
  documentIdParamValidationRules,
  validate,
  careDocumentController.getDocumentById
);

/**
 * @route   PATCH /api/care-circles/:circleId/documents/:docId
 * @desc    Update document metadata (Uploader or Caretakers)
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
 * @desc    Delete a document (Uploader or Caretakers)
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
 * @desc    Get access audit logs for a document (Caretakers only)
 * @access  Private (Main/Sub Caretakers)
 */
router.get(
  "/:docId/audit-logs",
  documentIdParamValidationRules,
  validate,
  careDocumentController.getDocumentAuditLogs
);

module.exports = router;
