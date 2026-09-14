const { body } = require("express-validator");

const registerValidationRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false }),

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
];

const loginValidationRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false }),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

const refreshValidationRules = [
  body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required"),
];

const logoutValidationRules = [
  body("refreshToken")
    .optional()
    .notEmpty()
    .withMessage("Refresh token cannot be empty if provided"),
];

module.exports = {
  registerValidationRules,
  loginValidationRules,
  refreshValidationRules,
  logoutValidationRules,
};
