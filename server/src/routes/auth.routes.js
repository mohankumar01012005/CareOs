const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  registerValidationRules,
  loginValidationRules,
  refreshValidationRules,
  logoutValidationRules,
} = require("../validators/auth.validator");

/**
 * @route   POST /api/auth/register
 * @desc    Main Caretaker self-registration
 * @access  Public
 */
router.post(
  "/register",
  registerValidationRules,
  validate,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Log in user with email and password
 * @access  Public
 */
router.post(
  "/login",
  loginValidationRules,
  validate,
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using a valid refresh token (with token rotation)
 * @access  Public
 */
router.post(
  "/refresh",
  refreshValidationRules,
  validate,
  authController.refresh
);

/**
 * @route   POST /api/auth/logout
 * @desc    Invalidate refresh token session
 * @access  Public / Authenticated
 */
router.post(
  "/logout",
  logoutValidationRules,
  validate,
  authController.logout
);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user identity
 * @access  Private (Requires Bearer Access Token)
 */
router.get("/me", authenticate, authController.getMe);

module.exports = router;
