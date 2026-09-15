const express = require("express");
const router = express.Router();

const invitationController = require("../controllers/invitation.controller");
const { authenticate } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  tokenParamValidationRules,
  acceptAndRegisterValidationRules,
} = require("../validators/invitation.validator");

/**
 * @route   GET /api/invitations/:token
 * @desc    Public endpoint to verify invitation token and retrieve safe metadata
 * @access  Public
 */
router.get(
  "/:token",
  tokenParamValidationRules,
  validate,
  invitationController.verifyInvitation
);

/**
 * @route   POST /api/invitations/:token/accept
 * @desc    Accept invitation for existing authenticated user (email must match)
 * @access  Private (Authenticated User)
 */
router.post(
  "/:token/accept",
  authenticate,
  tokenParamValidationRules,
  validate,
  invitationController.acceptInvitation
);

/**
 * @route   POST /api/invitations/:token/accept-and-register
 * @desc    Accept invitation and onboard/register a new user in one atomic step
 * @access  Public
 */
router.post(
  "/:token/accept-and-register",
  tokenParamValidationRules,
  acceptAndRegisterValidationRules,
  validate,
  invitationController.acceptAndRegister
);

module.exports = router;
