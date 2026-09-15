const { body, param } = require("express-validator");
const { BLOOD_GROUPS, GENDERS } = require("../constants/roles");

const createCareCircleValidationRules = [
  // Circle details
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Care Circle name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Care Circle name must be between 2 and 100 characters"),

  // Recipient details
  body("recipient")
    .notEmpty()
    .withMessage("Care recipient details are required")
    .isObject()
    .withMessage("Care recipient details must be an object"),

  body("recipient.fullName")
    .trim()
    .notEmpty()
    .withMessage("Care recipient full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Care recipient full name must be between 2 and 100 characters"),

  body("recipient.dateOfBirth")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Date of birth must be a valid ISO8601 date"),

  body("recipient.gender")
    .optional({ nullable: true, checkFalsy: true })
    .isIn(GENDERS)
    .withMessage(`Gender must be one of: ${GENDERS.join(", ")}`),

  body("recipient.bloodGroup")
    .optional({ nullable: true, checkFalsy: true })
    .isIn(BLOOD_GROUPS)
    .withMessage(`Blood group must be one of: ${BLOOD_GROUPS.join(", ")}`),

  body("recipient.knownConditions")
    .optional({ nullable: true })
    .isArray()
    .withMessage("Known conditions must be an array of strings"),

  body("recipient.knownConditions.*")
    .optional()
    .isString()
    .trim()
    .withMessage("Each known condition must be a string"),

  body("recipient.allergies")
    .optional({ nullable: true })
    .isArray()
    .withMessage("Allergies must be an array of strings"),

  body("recipient.allergies.*")
    .optional()
    .isString()
    .trim()
    .withMessage("Each allergy must be a string"),

  body("recipient.emergencyContact")
    .optional({ nullable: true })
    .isObject()
    .withMessage("Emergency contact must be an object"),

  body("recipient.emergencyContact.name")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .withMessage("Emergency contact name must be a string"),

  body("recipient.emergencyContact.relationship")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .withMessage("Emergency contact relationship must be a string"),

  body("recipient.emergencyContact.phone")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .withMessage("Emergency contact phone must be a string"),

  body("recipient.profilePhoto")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .withMessage("Profile photo must be a valid URL string"),
];

const circleIdParamValidationRules = [
  param("circleId")
    .isMongoId()
    .withMessage("Invalid Care Circle ID format"),
];

module.exports = {
  createCareCircleValidationRules,
  circleIdParamValidationRules,
};
