const { body, param, query } = require("express-validator");
const {
  MEDICATION_FORMS,
  MEDICATION_FREQUENCIES,
  ALL_MEDICATION_STATUSES,
  ALL_DOSE_STATUSES,
  TIME_SLOTS,
  FOOD_TIMINGS,
} = require("../constants/roles");

const medicationIdParamValidationRules = [
  param("medicationId")
    .isMongoId()
    .withMessage("Invalid medication ID format"),
];

const doseLogIdParamValidationRules = [
  param("doseLogId")
    .isMongoId()
    .withMessage("Invalid dose log ID format"),
];

const createMedicationValidationRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Medication name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Medication name must be between 2 and 100 characters"),

  body("dosage")
    .trim()
    .notEmpty()
    .withMessage("Dosage is required (e.g. 500mg, 5ml)")
    .isLength({ min: 1, max: 50 })
    .withMessage("Dosage must be between 1 and 50 characters"),

  body("genericName")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 150 })
    .withMessage("Generic name cannot exceed 150 characters"),

  body("form")
    .optional({ nullable: true })
    .isIn(MEDICATION_FORMS)
    .withMessage(`Medication form must be one of: ${MEDICATION_FORMS.join(", ")}`),

  body("formDetails")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Form details cannot exceed 100 characters"),

  body("frequency")
    .optional({ nullable: true })
    .isIn(MEDICATION_FREQUENCIES)
    .withMessage(`Frequency must be one of: ${MEDICATION_FREQUENCIES.join(", ")}`),

  body("schedule")
    .optional({ nullable: true })
    .isArray()
    .withMessage("Schedule must be an array of slot configurations"),

  body("schedule.*.slot")
    .optional()
    .isIn(TIME_SLOTS)
    .withMessage(`Schedule slot must be one of: ${TIME_SLOTS.join(", ")}`),

  body("schedule.*.time")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .withMessage("Schedule time must be a string (e.g. 08:00)"),

  body("schedule.*.doseQuantity")
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage("Schedule dose quantity must be greater than 0"),

  body("instructions")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Instructions cannot exceed 500 characters"),

  body("foodTiming")
    .optional({ nullable: true })
    .isIn(FOOD_TIMINGS)
    .withMessage(`Food timing must be one of: ${FOOD_TIMINGS.join(", ")}`),

  body("prescribedBy")
    .optional({ nullable: true })
    .isObject()
    .withMessage("prescribedBy must be an object"),

  body("prescribedBy.doctorName")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Doctor name cannot exceed 100 characters"),

  body("startDate")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Start date must be a valid ISO8601 date"),

  body("endDate")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("End date must be a valid ISO8601 date"),

  body("stock")
    .optional({ nullable: true })
    .isObject()
    .withMessage("Stock must be an object"),

  body("stock.currentQuantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Current stock quantity must be a non-negative integer"),

  body("stock.lowStockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Low stock threshold must be a non-negative integer"),

  body("safetyProtocols")
    .optional({ nullable: true })
    .isArray()
    .withMessage("Safety protocols must be an array of strings"),

  body("safetyProtocols.*")
    .optional()
    .isString()
    .trim()
    .withMessage("Each safety protocol must be a string"),
];

const updateMedicationValidationRules = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Medication name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Medication name must be between 2 and 100 characters"),

  body("dosage")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Dosage cannot be empty")
    .isLength({ min: 1, max: 50 })
    .withMessage("Dosage must be between 1 and 50 characters"),

  body("status")
    .optional()
    .isIn(ALL_MEDICATION_STATUSES)
    .withMessage(`Status must be one of: ${ALL_MEDICATION_STATUSES.join(", ")}`),

  body("form")
    .optional()
    .isIn(MEDICATION_FORMS)
    .withMessage(`Medication form must be one of: ${MEDICATION_FORMS.join(", ")}`),

  body("frequency")
    .optional()
    .isIn(MEDICATION_FREQUENCIES)
    .withMessage(`Frequency must be one of: ${MEDICATION_FREQUENCIES.join(", ")}`),

  body("foodTiming")
    .optional()
    .isIn(FOOD_TIMINGS)
    .withMessage(`Food timing must be one of: ${FOOD_TIMINGS.join(", ")}`),

  body("schedule")
    .optional()
    .isArray()
    .withMessage("Schedule must be an array of slot configurations"),

  body("schedule.*.slot")
    .optional()
    .isIn(TIME_SLOTS)
    .withMessage(`Schedule slot must be one of: ${TIME_SLOTS.join(", ")}`),

  body("instructions")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Instructions cannot exceed 500 characters"),

  body("stock")
    .optional()
    .isObject()
    .withMessage("Stock must be an object"),

  body("stock.currentQuantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Current stock quantity must be a non-negative integer"),
];

const recordDoseValidationRules = [
  body("slot")
    .trim()
    .notEmpty()
    .withMessage("Dose slot is required")
    .isIn(TIME_SLOTS)
    .withMessage(`Dose slot must be one of: ${TIME_SLOTS.join(", ")}`),

  body("scheduledDate")
    .trim()
    .notEmpty()
    .withMessage("Scheduled date (YYYY-MM-DD) is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Scheduled date must be in YYYY-MM-DD format (e.g. 2026-09-15)"),

  body("status")
    .optional()
    .isIn(ALL_DOSE_STATUSES)
    .withMessage(`Dose status must be one of: ${ALL_DOSE_STATUSES.join(", ")}`),

  body("scheduledTime")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim(),

  body("administeredAt")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Administered at must be a valid ISO8601 date"),

  body("quantityTaken")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Quantity taken must be a non-negative number"),

  body("notes")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),

  body("skipReason")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Skip reason cannot exceed 500 characters"),
];

const refillStockValidationRules = [
  body("quantity")
    .notEmpty()
    .withMessage("Refill quantity is required")
    .isInt({ min: 1 })
    .withMessage("Refill quantity must be a positive integer greater than 0"),

  body("packageSize")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Package size must be a positive integer"),

  body("pharmacy")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Pharmacy name cannot exceed 100 characters"),
];

const updateDoseLogValidationRules = [
  body("notes")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),

  body("skipReason")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Skip reason cannot exceed 500 characters"),

  body("status")
    .optional()
    .isIn(ALL_DOSE_STATUSES)
    .withMessage(`Status must be one of: ${ALL_DOSE_STATUSES.join(", ")}`),
];

module.exports = {
  medicationIdParamValidationRules,
  doseLogIdParamValidationRules,
  createMedicationValidationRules,
  updateMedicationValidationRules,
  recordDoseValidationRules,
  refillStockValidationRules,
  updateDoseLogValidationRules,
};
