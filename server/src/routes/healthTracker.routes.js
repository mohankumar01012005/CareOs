const express = require("express");
const router = express.Router({ mergeParams: true });

const healthTrackerController = require("../controllers/healthTracker.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { verifyCircleMembership } = require("../middleware/circleAuth.middleware");
const validate = require("../middleware/validate.middleware");
const { circleIdParamValidationRules } = require("../validators/careCircle.validator");
const {
  vitalIdParamValidationRules,
  symptomIdParamValidationRules,
  createVitalValidationRules,
  updateVitalValidationRules,
  createSymptomValidationRules,
  updateSymptomValidationRules,
  upsertBaselineValidationRules,
} = require("../validators/healthTracker.validator");

// Common pipeline for all circle-scoped health tracker routes:
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
 * =====================================================================
 * VITALS ROUTES
 * =====================================================================
 */

/**
 * @route   POST /api/care-circles/:circleId/health/vitals
 * @desc    Log a new vital measurement (with automatic baseline deviation detection)
 * @access  Private (All Active Circle Members)
 */
router.post(
  "/vitals",
  createVitalValidationRules,
  validate,
  healthTrackerController.createVitalReading
);

/**
 * @route   GET /api/care-circles/:circleId/health/vitals
 * @desc    List vital readings with filters and pagination
 * @access  Private (All Active Circle Members)
 */
router.get("/vitals", healthTrackerController.getVitalReadings);

/**
 * @route   GET /api/care-circles/:circleId/health/vitals/alerts
 * @desc    Get abnormal vital reading alerts
 * @access  Private (All Active Circle Members)
 */
router.get("/vitals/alerts", healthTrackerController.getAbnormalVitals);

/**
 * @route   GET /api/care-circles/:circleId/health/vitals/trends
 * @desc    Get aggregated time-series trends and statistics for a vital type
 * @access  Private (All Active Circle Members)
 */
router.get("/vitals/trends", healthTrackerController.getVitalsTrends);

/**
 * @route   GET /api/care-circles/:circleId/health/vitals/:vitalId
 * @desc    Get a single vital reading by ID
 * @access  Private (All Active Circle Members)
 */
router.get(
  "/vitals/:vitalId",
  vitalIdParamValidationRules,
  validate,
  healthTrackerController.getVitalReadingById
);

/**
 * @route   PATCH /api/care-circles/:circleId/health/vitals/:vitalId
 * @desc    Update vital reading (Author or Caretakers / Doctor)
 * @access  Private (Author or Main/Sub Caretaker, Paid Doctor)
 */
router.patch(
  "/vitals/:vitalId",
  updateVitalValidationRules,
  validate,
  healthTrackerController.updateVitalReading
);

/**
 * @route   DELETE /api/care-circles/:circleId/health/vitals/:vitalId
 * @desc    Delete vital reading (Author or Caretakers / Doctor)
 * @access  Private (Author or Main/Sub Caretaker, Paid Doctor)
 */
router.delete(
  "/vitals/:vitalId",
  vitalIdParamValidationRules,
  validate,
  healthTrackerController.deleteVitalReading
);

/**
 * =====================================================================
 * SYMPTOMS ROUTES
 * =====================================================================
 */

/**
 * @route   POST /api/care-circles/:circleId/health/symptoms
 * @desc    Log a new symptom
 * @access  Private (All Active Circle Members)
 */
router.post(
  "/symptoms",
  createSymptomValidationRules,
  validate,
  healthTrackerController.createSymptomLog
);

/**
 * @route   GET /api/care-circles/:circleId/health/symptoms
 * @desc    List symptom logs with filters and pagination
 * @access  Private (All Active Circle Members)
 */
router.get("/symptoms", healthTrackerController.getSymptomLogs);

/**
 * @route   GET /api/care-circles/:circleId/health/symptoms/:symptomId
 * @desc    Get a single symptom log by ID
 * @access  Private (All Active Circle Members)
 */
router.get(
  "/symptoms/:symptomId",
  symptomIdParamValidationRules,
  validate,
  healthTrackerController.getSymptomLogById
);

/**
 * @route   PATCH /api/care-circles/:circleId/health/symptoms/:symptomId
 * @desc    Update symptom log (Author or Caretakers / Doctor)
 * @access  Private (Author or Main/Sub Caretaker, Paid Doctor)
 */
router.patch(
  "/symptoms/:symptomId",
  updateSymptomValidationRules,
  validate,
  healthTrackerController.updateSymptomLog
);

/**
 * @route   DELETE /api/care-circles/:circleId/health/symptoms/:symptomId
 * @desc    Delete symptom log (Author or Caretakers / Doctor)
 * @access  Private (Author or Main/Sub Caretaker, Paid Doctor)
 */
router.delete(
  "/symptoms/:symptomId",
  symptomIdParamValidationRules,
  validate,
  healthTrackerController.deleteSymptomLog
);

/**
 * =====================================================================
 * CLINICAL BASELINE ROUTES
 * =====================================================================
 */

/**
 * @route   GET /api/care-circles/:circleId/health/baseline
 * @desc    Get active clinical baseline thresholds
 * @access  Private (All Active Circle Members)
 */
router.get("/baseline", healthTrackerController.getClinicalBaseline);

/**
 * @route   PUT /api/care-circles/:circleId/health/baseline
 * @desc    Configure / update custom clinical baseline thresholds
 * @access  Private (Main/Sub Caretaker, Paid Doctor strictly)
 */
router.put(
  "/baseline",
  upsertBaselineValidationRules,
  validate,
  healthTrackerController.upsertClinicalBaseline
);

/**
 * =====================================================================
 * DOCTOR'S BRIEF / CLINICAL SNAPSHOT ROUTE
 * =====================================================================
 */

/**
 * @route   GET /api/care-circles/:circleId/health/doctors-brief
 * @desc    Get comprehensive clinical snapshot / consultation brief
 * @access  Private (All Active Circle Members)
 */
router.get("/doctors-brief", healthTrackerController.getDoctorsBrief);

module.exports = router;
