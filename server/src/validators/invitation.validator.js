const { body, param } = require("express-validator");
const { INVITATION_ROLES, CAREOS_ROLES } = require("../constants/roles");

const createInvitationValidationRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Invitee email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false }),

  body("role")
    .trim()
    .notEmpty()
    .withMessage("Invitation role is required")
    .custom((value) => {
      if (value === CAREOS_ROLES.MAIN_CARETAKER) {
        throw new Error("Cannot create an invitation for the MAIN_CARETAKER role");
      }
      if (value === CAREOS_ROLES.CARE_RECEIVER) {
        throw new Error("Cannot create an invitation for the CARE_RECEIVER role");
      }
      if (!INVITATION_ROLES.includes(value)) {
        throw new Error(
          `Invalid invitation role: ${value}. Allowed roles: ${INVITATION_ROLES.join(", ")}`
        );
      }
      return true;
    }),
];

const tokenParamValidationRules = [
  param("token")
    .trim()
    .notEmpty()
    .withMessage("Invitation token is required")
    .isHexadecimal()
    .withMessage("Invitation token must be a valid hex string")
    .isLength({ min: 64, max: 64 })
    .withMessage("Invalid invitation token format"),
];

const acceptAndRegisterValidationRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage("Password must contain at least one letter and one number"),

  body("phone")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number"),

  body("profilePhoto")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isString()
    .withMessage("Profile photo must be a valid string URL"),
];

const invitationIdParamValidationRules = [
  param("invitationId")
    .isMongoId()
    .withMessage("Invalid invitation ID format"),
];

module.exports = {
  createInvitationValidationRules,
  tokenParamValidationRules,
  acceptAndRegisterValidationRules,
  invitationIdParamValidationRules,
};
