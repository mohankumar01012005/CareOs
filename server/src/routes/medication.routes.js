const express = require("express");
const router = express.Router({ mergeParams: true });

const medicationController = require("../controllers/medication.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  verifyCircleMembership,
  requireCircleRole,
} = require("../middleware/circleAuth.middleware");
const validate = require("../middleware/validate.middleware");
const { circleIdParamValidationRules } = require("../validators/careCircle.validator");
const {
  medicationIdParamValidationRules,
  doseLogIdParamValidationRules,
  createMedicationValidationRules,
  updateMedicationValidationRules,
  recordDoseValidationRules,
  refillStockValidationRules,
  updateDoseLogValidationRules,
} = require("../validators/medication.validator");
const { MEDICATION_MANAGER_ROLES } = require("../constants/roles");

// Common pipeline for all circle-scoped medication routes:
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
 * @route   POST /api/care-circles/:circleId/medications
 * @desc    Create a new medication / prescription regimen
 * @access  Private (Caretakers & Doctors)
 */
router.post(
  "/",
  createMedicationValidationRules,
  validate,
  requireCircleRole(MEDICATION_MANAGER_ROLES),
  medicationController.createMedication
);

/**
 * @route   GET /api/care-circles/:circleId/medications
 * @desc    List all medications for the Care Circle
 * @access  Private (All Active Circle Members)
 */
router.get("/", medicationController.getCircleMedications);

/**
 * @route   GET /api/care-circles/:circleId/medications/schedule/today
 * @desc    Get today's time-slot timeline schedule with logged dose statuses
 * @access  Private (All Active Circle Members)
 */
router.get("/schedule/today", medicationController.getTodaySchedule);

/**
 * @route   GET /api/care-circles/:circleId/medications/adherence/stats
 * @desc    Get 7-day adherence analytics and current streak
 * @access  Private (All Active Circle Members)
 */
router.get("/adherence/stats", medicationController.getAdherenceStats);

/**
 * @route   GET /api/care-circles/:circleId/medications/doses/history
 * @desc    Get circle-wide dose administration logs
 * @access  Private (All Active Circle Members)
 */
router.get("/doses/history", medicationController.getCircleDoses);

/**
 * @route   PATCH /api/care-circles/:circleId/medications/doses/:doseLogId
 * @desc    Update notes or status for a recorded dose log
 * @access  Private (All Active Circle Members)
 */
router.patch(
  "/doses/:doseLogId",
  doseLogIdParamValidationRules,
  updateDoseLogValidationRules,
  validate,
  medicationController.updateDoseLog
);

/**
 * @route   GET /api/care-circles/:circleId/medications/:medicationId
 * @desc    Get full dossier of a single medication including telemetry & recent doses
 * @access  Private (All Active Circle Members)
 */
router.get(
  "/:medicationId",
  medicationIdParamValidationRules,
  validate,
  medicationController.getMedicationById
);

/**
 * @route   PATCH /api/care-circles/:circleId/medications/:medicationId
 * @desc    Update medication configuration, dosage, instructions, or status
 * @access  Private (Caretakers & Doctors)
 */
router.patch(
  "/:medicationId",
  medicationIdParamValidationRules,
  updateMedicationValidationRules,
  validate,
  requireCircleRole(MEDICATION_MANAGER_ROLES),
  medicationController.updateMedication
);

/**
 * @route   DELETE /api/care-circles/:circleId/medications/:medicationId
 * @desc    Discontinue a medication
 * @access  Private (Caretakers & Doctors)
 */
router.delete(
  "/:medicationId",
  medicationIdParamValidationRules,
  validate,
  requireCircleRole(MEDICATION_MANAGER_ROLES),
  medicationController.deleteMedication
);

/**
 * @route   POST /api/care-circles/:circleId/medications/:medicationId/doses
 * @desc    Record a dose administration (TAKEN / SKIPPED / MISSED) & update stock
 * @access  Private (All Active Circle Members)
 */
router.post(
  "/:medicationId/doses",
  medicationIdParamValidationRules,
  recordDoseValidationRules,
  validate,
  medicationController.recordDose
);

/**
 * @route   GET /api/care-circles/:circleId/medications/:medicationId/doses
 * @desc    Get historical dose logs for a specific medication
 * @access  Private (All Active Circle Members)
 */
router.get(
  "/:medicationId/doses",
  medicationIdParamValidationRules,
  validate,
  medicationController.getMedicationDoses
);

/**
 * @route   PATCH /api/care-circles/:circleId/medications/:medicationId/refill
 * @desc    Refill medication stock quantity
 * @access  Private (Caretakers & Doctors)
 */
router.patch(
  "/:medicationId/refill",
  medicationIdParamValidationRules,
  refillStockValidationRules,
  validate,
  requireCircleRole(MEDICATION_MANAGER_ROLES),
  medicationController.refillStock
);

module.exports = router;
