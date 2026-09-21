const { body, param } = require("express-validator");
const {
  DOCUMENT_CATEGORIES,
  ALL_DOCUMENT_PRIVACY_LEVELS,
} = require("../constants/roles");

const documentIdParamValidationRules = [
  param("docId")
    .isMongoId()
    .withMessage("Invalid Document ID format"),
];

const createDocumentValidationRules = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Document title is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Document title must be between 2 and 200 characters"),

  body("fileUrl")
    .trim()
    .notEmpty()
    .withMessage("File URL is required"),

  body("category")
    .optional({ nullable: true })
    .isIn(DOCUMENT_CATEGORIES)
    .withMessage(`Category must be one of: ${DOCUMENT_CATEGORIES.join(", ")}`),

  body("privacyLevel")
    .optional({ nullable: true })
    .isIn(ALL_DOCUMENT_PRIVACY_LEVELS)
    .withMessage(
      `Privacy level must be one of: ${ALL_DOCUMENT_PRIVACY_LEVELS.join(", ")}`
    ),

  body("description")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("fileName")
    .optional({ nullable: true })
    .isString()
    .trim(),

  body("fileType")
    .optional({ nullable: true })
    .isString()
    .trim(),

  body("fileSizeBytes")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("File size must be a non-negative integer"),

  body("documentNumber")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Document number cannot exceed 100 characters"),

  body("issuedDate")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Issued date must be in YYYY-MM-DD format (e.g. 2026-09-15)"),

  body("expiryDate")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Expiry date must be in YYYY-MM-DD format (e.g. 2026-09-15)"),

  body("isEmergencyAccessible")
    .optional()
    .isBoolean()
    .withMessage("isEmergencyAccessible must be a boolean (true or false)"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array of strings"),

  body("tags.*")
    .optional()
    .isString()
    .trim()
    .withMessage("Each tag must be a string"),

  body("version")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Version must be a positive integer >= 1"),
];

const updateDocumentValidationRules = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Document title cannot be empty")
    .isLength({ min: 2, max: 200 })
    .withMessage("Document title must be between 2 and 200 characters"),

  body("fileUrl")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("File URL cannot be empty"),

  body("category")
    .optional()
    .isIn(DOCUMENT_CATEGORIES)
    .withMessage(`Category must be one of: ${DOCUMENT_CATEGORIES.join(", ")}`),

  body("privacyLevel")
    .optional()
    .isIn(ALL_DOCUMENT_PRIVACY_LEVELS)
    .withMessage(
      `Privacy level must be one of: ${ALL_DOCUMENT_PRIVACY_LEVELS.join(", ")}`
    ),

  body("description")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("fileName")
    .optional({ nullable: true })
    .isString()
    .trim(),

  body("fileType")
    .optional({ nullable: true })
    .isString()
    .trim(),

  body("fileSizeBytes")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("File size must be a non-negative integer"),

  body("documentNumber")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Document number cannot exceed 100 characters"),

  body("issuedDate")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Issued date must be in YYYY-MM-DD format (e.g. 2026-09-15)"),

  body("expiryDate")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Expiry date must be in YYYY-MM-DD format (e.g. 2026-09-15)"),

  body("isEmergencyAccessible")
    .optional()
    .isBoolean()
    .withMessage("isEmergencyAccessible must be a boolean (true or false)"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array of strings"),

  body("tags.*")
    .optional()
    .isString()
    .trim()
    .withMessage("Each tag must be a string"),

  body("version")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Version must be a positive integer >= 1"),
];

module.exports = {
  documentIdParamValidationRules,
  createDocumentValidationRules,
  updateDocumentValidationRules,
};
