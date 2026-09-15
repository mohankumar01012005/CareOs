const express = require("express");
const router = express.Router();

const careCircleController = require("../controllers/careCircle.controller");
const invitationController = require("../controllers/invitation.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  verifyCircleMembership,
  requireCircleRole,
  requireMainCaretaker,
} = require("../middleware/circleAuth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createCareCircleValidationRules,
  circleIdParamValidationRules,
} = require("../validators/careCircle.validator");
const {
  createInvitationValidationRules,
  invitationIdParamValidationRules,
} = require("../validators/invitation.validator");

/**
 * @route   POST /api/care-circles
 * @desc    Create a new Care Circle, Care Recipient, and assign creator as MAIN_CARETAKER
 * @access  Private (Authenticated User)
 */
router.post(
  "/",
  authenticate,
  createCareCircleValidationRules,
  validate,
  careCircleController.createCareCircle
);

/**
 * @route   GET /api/care-circles
 * @desc    Get all Care Circles where the authenticated user is an active member
 * @access  Private (Authenticated User)
 */
router.get("/", authenticate, careCircleController.getUserCareCircles);

/**
 * @route   GET /api/care-circles/:circleId
 * @desc    Get details of a specific Care Circle including care recipient & member list
 * @access  Private (Circle Member Only)
 */
router.get(
  "/:circleId",
  authenticate,
  circleIdParamValidationRules,
  validate,
  verifyCircleMembership,
  careCircleController.getCareCircleDetails
);

/**
 * @route   POST /api/care-circles/:circleId/invitations
 * @desc    Create a single-use, role-specific invitation for a Care Circle
 * @access  Private (Main Caretaker Only)
 */
router.post(
  "/:circleId/invitations",
  authenticate,
  circleIdParamValidationRules,
  createInvitationValidationRules,
  validate,
  verifyCircleMembership,
  requireMainCaretaker,
  invitationController.createInvitation
);

/**
 * @route   GET /api/care-circles/:circleId/invitations
 * @desc    List all invitations for a Care Circle
 * @access  Private (Main Caretaker Only)
 */
router.get(
  "/:circleId/invitations",
  authenticate,
  circleIdParamValidationRules,
  validate,
  verifyCircleMembership,
  requireMainCaretaker,
  invitationController.getCircleInvitations
);

/**
 * @route   DELETE /api/care-circles/:circleId/invitations/:invitationId
 * @desc    Revoke a pending Care Circle invitation
 * @access  Private (Main Caretaker Only)
 */
router.delete(
  "/:circleId/invitations/:invitationId",
  authenticate,
  circleIdParamValidationRules,
  invitationIdParamValidationRules,
  validate,
  verifyCircleMembership,
  requireMainCaretaker,
  invitationController.revokeInvitation
);

module.exports = router;
