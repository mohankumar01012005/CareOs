const { body, param } = require("express-validator");
const {
  NOTE_CATEGORIES,
  NOTE_SHIFTS,
  ALL_NOTE_URGENCIES,
  APPETITE_LEVELS,
  MOOD_LEVELS,
  BOWEL_MOVEMENT_STATUS,
} = require("../constants/roles");

const noteIdParamValidationRules = [
  param("noteId")
    .isMongoId()
    .withMessage("Invalid Note ID format"),
];

const createNoteValidationRules = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Note content is required")
    .isLength({ min: 2, max: 3000 })
    .withMessage("Note content must be between 2 and 3000 characters"),

  body("title")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("noteDate")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Note date must be in YYYY-MM-DD format (e.g. 2026-09-15)"),

  body("category")
    .optional({ nullable: true })
    .isIn(NOTE_CATEGORIES)
    .withMessage(`Category must be one of: ${NOTE_CATEGORIES.join(", ")}`),

  body("shift")
    .optional({ nullable: true })
    .isIn(NOTE_SHIFTS)
    .withMessage(`Shift must be one of: ${NOTE_SHIFTS.join(", ")}`),

  body("urgency")
    .optional({ nullable: true })
    .isIn(ALL_NOTE_URGENCIES)
    .withMessage(`Urgency must be one of: ${ALL_NOTE_URGENCIES.join(", ")}`),

  body("vitalsSnapshot.bpSystolic")
    .optional({ nullable: true })
    .isInt({ min: 40, max: 300 })
    .withMessage("Systolic BP must be an integer between 40 and 300 mmHg"),

  body("vitalsSnapshot.bpDiastolic")
    .optional({ nullable: true })
    .isInt({ min: 30, max: 200 })
    .withMessage("Diastolic BP must be an integer between 30 and 200 mmHg"),

  body("vitalsSnapshot.heartRate")
    .optional({ nullable: true })
    .isInt({ min: 30, max: 250 })
    .withMessage("Heart rate must be an integer between 30 and 250 bpm"),

  body("vitalsSnapshot.bloodSugar")
    .optional({ nullable: true })
    .isInt({ min: 20, max: 800 })
    .withMessage("Blood sugar must be an integer between 20 and 800 mg/dL"),

  body("vitalsSnapshot.temperature")
    .optional({ nullable: true })
    .isFloat({ min: 90, max: 110 })
    .withMessage("Temperature must be a decimal between 90.0 and 110.0 °F"),

  body("vitalsSnapshot.spO2")
    .optional({ nullable: true })
    .isInt({ min: 50, max: 100 })
    .withMessage("SpO2 must be an integer between 50 and 100%"),

  body("dietMood.appetite")
    .optional({ nullable: true })
    .isIn(APPETITE_LEVELS)
    .withMessage(`Appetite must be one of: ${APPETITE_LEVELS.join(", ")}`),

  body("dietMood.mood")
    .optional({ nullable: true })
    .isIn(MOOD_LEVELS)
    .withMessage(`Mood must be one of: ${MOOD_LEVELS.join(", ")}`),

  body("dietMood.bowelMovement")
    .optional({ nullable: true })
    .isIn(BOWEL_MOVEMENT_STATUS)
    .withMessage(`Bowel movement must be one of: ${BOWEL_MOVEMENT_STATUS.join(", ")}`),
];

const updateNoteValidationRules = [
  body("content")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Note content cannot be empty")
    .isLength({ min: 2, max: 3000 })
    .withMessage("Note content must be between 2 and 3000 characters"),

  body("title")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("noteDate")
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Note date must be in YYYY-MM-DD format (e.g. 2026-09-15)"),

  body("category")
    .optional()
    .isIn(NOTE_CATEGORIES)
    .withMessage(`Category must be one of: ${NOTE_CATEGORIES.join(", ")}`),

  body("shift")
    .optional()
    .isIn(NOTE_SHIFTS)
    .withMessage(`Shift must be one of: ${NOTE_SHIFTS.join(", ")}`),

  body("urgency")
    .optional()
    .isIn(ALL_NOTE_URGENCIES)
    .withMessage(`Urgency must be one of: ${ALL_NOTE_URGENCIES.join(", ")}`),

  body("vitalsSnapshot.bpSystolic")
    .optional({ nullable: true })
    .isInt({ min: 40, max: 300 })
    .withMessage("Systolic BP must be an integer between 40 and 300 mmHg"),

  body("vitalsSnapshot.bpDiastolic")
    .optional({ nullable: true })
    .isInt({ min: 30, max: 200 })
    .withMessage("Diastolic BP must be an integer between 30 and 200 mmHg"),

  body("vitalsSnapshot.heartRate")
    .optional({ nullable: true })
    .isInt({ min: 30, max: 250 })
    .withMessage("Heart rate must be an integer between 30 and 250 bpm"),

  body("vitalsSnapshot.bloodSugar")
    .optional({ nullable: true })
    .isInt({ min: 20, max: 800 })
    .withMessage("Blood sugar must be an integer between 20 and 800 mg/dL"),

  body("vitalsSnapshot.temperature")
    .optional({ nullable: true })
    .isFloat({ min: 90, max: 110 })
    .withMessage("Temperature must be a decimal between 90.0 and 110.0 °F"),

  body("vitalsSnapshot.spO2")
    .optional({ nullable: true })
    .isInt({ min: 50, max: 100 })
    .withMessage("SpO2 must be an integer between 50 and 100%"),

  body("dietMood.appetite")
    .optional({ nullable: true })
    .isIn(APPETITE_LEVELS)
    .withMessage(`Appetite must be one of: ${APPETITE_LEVELS.join(", ")}`),

  body("dietMood.mood")
    .optional({ nullable: true })
    .isIn(MOOD_LEVELS)
    .withMessage(`Mood must be one of: ${MOOD_LEVELS.join(", ")}`),

  body("dietMood.bowelMovement")
    .optional({ nullable: true })
    .isIn(BOWEL_MOVEMENT_STATUS)
    .withMessage(`Bowel movement must be one of: ${BOWEL_MOVEMENT_STATUS.join(", ")}`),
];

const pinNoteValidationRules = [
  body("isPinned")
    .notEmpty()
    .withMessage("isPinned is required")
    .isBoolean()
    .withMessage("isPinned must be a boolean (true or false)"),
];

module.exports = {
  noteIdParamValidationRules,
  createNoteValidationRules,
  updateNoteValidationRules,
  pinNoteValidationRules,
};
