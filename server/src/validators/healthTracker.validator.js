const { body, param, query } = require("express-validator");
const {
  ALL_VITAL_TYPES,
  VITAL_TYPES,
  ALL_SUGAR_MEAL_CONTEXTS,
  ALL_SYMPTOM_CATEGORIES,
  ALL_SYMPTOM_SEVERITIES,
} = require("../constants/roles");

const isValidObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(value);

const vitalIdParamValidationRules = [
  param("vitalId")
    .custom(isValidObjectId)
    .withMessage("Invalid vital ID format. Must be a 24-character hexadecimal ObjectId."),
];

const symptomIdParamValidationRules = [
  param("symptomId")
    .custom(isValidObjectId)
    .withMessage("Invalid symptom ID format. Must be a 24-character hexadecimal ObjectId."),
];

const createVitalValidationRules = [
  body("vitalType")
    .notEmpty()
    .withMessage("Vital type is required")
    .isIn(ALL_VITAL_TYPES)
    .withMessage(`Invalid vital type. Must be one of: ${ALL_VITAL_TYPES.join(", ")}`),

  body("recordedAt")
    .optional()
    .isISO8601()
    .withMessage("Recorded at must be a valid ISO 8601 date string"),

  body("measurements")
    .isObject()
    .withMessage("Measurements object is required")
    .custom((measurements, { req }) => {
      const type = req.body.vitalType;

      if (type === VITAL_TYPES.BLOOD_PRESSURE) {
        if (typeof measurements.systolic !== "number" || measurements.systolic < 30 || measurements.systolic > 300) {
          throw new Error("Systolic blood pressure is required and must be between 30 and 300 mmHg");
        }
        if (typeof measurements.diastolic !== "number" || measurements.diastolic < 20 || measurements.diastolic > 200) {
          throw new Error("Diastolic blood pressure is required and must be between 20 and 200 mmHg");
        }
        if (measurements.pulse !== undefined && (typeof measurements.pulse !== "number" || measurements.pulse < 20 || measurements.pulse > 300)) {
          throw new Error("Pulse must be between 20 and 300 bpm if provided");
        }
      } else if (type === VITAL_TYPES.BLOOD_SUGAR) {
        if (typeof measurements.sugarLevel !== "number" || measurements.sugarLevel < 10 || measurements.sugarLevel > 1000) {
          throw new Error("Sugar level is required and must be between 10 and 1000 mg/dL");
        }
        if (measurements.mealContext && !ALL_SUGAR_MEAL_CONTEXTS.includes(measurements.mealContext)) {
          throw new Error(`Meal context must be one of: ${ALL_SUGAR_MEAL_CONTEXTS.join(", ")}`);
        }
      } else if (type === VITAL_TYPES.HEART_RATE) {
        if (typeof measurements.bpm !== "number" || measurements.bpm < 20 || measurements.bpm > 300) {
          throw new Error("Heart rate bpm is required and must be between 20 and 300 bpm");
        }
      } else if (type === VITAL_TYPES.OXYGEN_SATURATION) {
        if (typeof measurements.spO2 !== "number" || measurements.spO2 < 40 || measurements.spO2 > 100) {
          throw new Error("SpO2 oxygen saturation is required and must be between 40% and 100%");
        }
      } else if (type === VITAL_TYPES.TEMPERATURE) {
        if (typeof measurements.temperature !== "number" || measurements.temperature < 80 || measurements.temperature > 115) {
          throw new Error("Temperature is required and must be between 80 and 115 degrees");
        }
        if (measurements.temperatureUnit && !["F", "C"].includes(measurements.temperatureUnit)) {
          throw new Error("Temperature unit must be either 'F' or 'C'");
        }
      } else if (type === VITAL_TYPES.WEIGHT) {
        if (typeof measurements.weight !== "number" || measurements.weight < 1 || measurements.weight > 500) {
          throw new Error("Weight is required and must be between 1 and 500");
        }
        if (measurements.weightUnit && !["kg", "lbs"].includes(measurements.weightUnit)) {
          throw new Error("Weight unit must be either 'kg' or 'lbs'");
        }
      } else if (type === VITAL_TYPES.RESPIRATORY_RATE) {
        if (typeof measurements.respiratoryRate !== "number" || measurements.respiratoryRate < 4 || measurements.respiratoryRate > 80) {
          throw new Error("Respiratory rate is required and must be between 4 and 80 breaths/min");
        }
      }
      return true;
    }),

  body("notes")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),

  body("deviceSource")
    .optional()
    .isString()
    .trim(),
];

const updateVitalValidationRules = [
  ...vitalIdParamValidationRules,

  body("measurements")
    .optional()
    .isObject()
    .withMessage("Measurements must be an object if provided"),

  body("notes")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),
];

const createSymptomValidationRules = [
  body("symptomCategory")
    .notEmpty()
    .withMessage("Symptom category is required")
    .isIn(ALL_SYMPTOM_CATEGORIES)
    .withMessage(`Invalid symptom category. Must be one of: ${ALL_SYMPTOM_CATEGORIES.join(", ")}`),

  body("symptomName")
    .trim()
    .notEmpty()
    .withMessage("Symptom name is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Symptom name must be between 2 and 200 characters"),

  body("severity")
    .optional()
    .isIn(ALL_SYMPTOM_SEVERITIES)
    .withMessage(`Severity must be one of: ${ALL_SYMPTOM_SEVERITIES.join(", ")}`),

  body("severityScore")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 10 })
    .withMessage("Severity score must be an integer between 1 and 10"),

  body("onsetTime")
    .optional()
    .isISO8601()
    .withMessage("Onset time must be a valid ISO 8601 date string"),

  body("durationHours")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Duration hours cannot be negative"),

  body("isOngoing")
    .optional()
    .isBoolean()
    .withMessage("isOngoing must be a boolean"),

  body("bodyLocation")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 200 })
    .withMessage("Body location cannot exceed 200 characters"),

  body("triggers")
    .optional()
    .isArray()
    .withMessage("Triggers must be an array of strings"),

  body("notes")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 2000 })
    .withMessage("Notes cannot exceed 2000 characters"),
];

const updateSymptomValidationRules = [
  ...symptomIdParamValidationRules,

  body("symptomCategory")
    .optional()
    .isIn(ALL_SYMPTOM_CATEGORIES)
    .withMessage(`Invalid symptom category. Must be one of: ${ALL_SYMPTOM_CATEGORIES.join(", ")}`),

  body("symptomName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Symptom name must be between 2 and 200 characters"),

  body("severity")
    .optional()
    .isIn(ALL_SYMPTOM_SEVERITIES)
    .withMessage(`Severity must be one of: ${ALL_SYMPTOM_SEVERITIES.join(", ")}`),

  body("severityScore")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 10 })
    .withMessage("Severity score must be an integer between 1 and 10"),

  body("isOngoing")
    .optional()
    .isBoolean()
    .withMessage("isOngoing must be a boolean"),

  body("notes")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 2000 })
    .withMessage("Notes cannot exceed 2000 characters"),
];

const upsertBaselineValidationRules = [
  body("bpSystolicMin")
    .optional()
    .isFloat({ min: 40, max: 200 })
    .withMessage("bpSystolicMin must be between 40 and 200"),
  body("bpSystolicMax")
    .optional()
    .isFloat({ min: 50, max: 250 })
    .withMessage("bpSystolicMax must be between 50 and 250"),
  body("bpDiastolicMin")
    .optional()
    .isFloat({ min: 30, max: 150 })
    .withMessage("bpDiastolicMin must be between 30 and 150"),
  body("bpDiastolicMax")
    .optional()
    .isFloat({ min: 40, max: 180 })
    .withMessage("bpDiastolicMax must be between 40 and 180"),
  body("heartRateMin")
    .optional()
    .isFloat({ min: 30, max: 120 })
    .withMessage("heartRateMin must be between 30 and 120"),
  body("heartRateMax")
    .optional()
    .isFloat({ min: 60, max: 220 })
    .withMessage("heartRateMax must be between 60 and 220"),
  body("bloodSugarFastingMin")
    .optional()
    .isFloat({ min: 40, max: 200 })
    .withMessage("bloodSugarFastingMin must be between 40 and 200"),
  body("bloodSugarFastingMax")
    .optional()
    .isFloat({ min: 70, max: 300 })
    .withMessage("bloodSugarFastingMax must be between 70 and 300"),
  body("bloodSugarPostPrandialMin")
    .optional()
    .isFloat({ min: 50, max: 250 })
    .withMessage("bloodSugarPostPrandialMin must be between 50 and 250"),
  body("bloodSugarPostPrandialMax")
    .optional()
    .isFloat({ min: 80, max: 400 })
    .withMessage("bloodSugarPostPrandialMax must be between 80 and 400"),
  body("spO2Min")
    .optional()
    .isFloat({ min: 70, max: 100 })
    .withMessage("spO2Min must be between 70 and 100"),
  body("temperatureMin")
    .optional()
    .isFloat({ min: 90, max: 100 })
    .withMessage("temperatureMin must be between 90 and 100"),
  body("temperatureMax")
    .optional()
    .isFloat({ min: 98, max: 108 })
    .withMessage("temperatureMax must be between 98 and 108"),
  body("respiratoryRateMin")
    .optional()
    .isFloat({ min: 6, max: 30 })
    .withMessage("respiratoryRateMin must be between 6 and 30"),
  body("respiratoryRateMax")
    .optional()
    .isFloat({ min: 12, max: 60 })
    .withMessage("respiratoryRateMax must be between 12 and 60"),
  body("criticalOverrides")
    .optional()
    .isObject()
    .withMessage("criticalOverrides must be an object if provided"),
];

module.exports = {
  vitalIdParamValidationRules,
  symptomIdParamValidationRules,
  createVitalValidationRules,
  updateVitalValidationRules,
  createSymptomValidationRules,
  updateSymptomValidationRules,
  upsertBaselineValidationRules,
};
