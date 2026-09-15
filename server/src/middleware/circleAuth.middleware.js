const CareCircle = require("../models/CareCircle");
const CareCircleMember = require("../models/CareCircleMember");
const { CIRCLE_STATUS, MEMBERSHIP_STATUS, CAREOS_ROLES } = require("../constants/roles");

/**
 * Circle Membership Authorization Middleware
 *
 * Verifies that the authenticated user is an ACTIVE member of the requested Care Circle.
 * Non-members receive a 403 Forbidden error.
 * If the circle does not exist or is not active, returns a 404 Not Found error.
 *
 * Preconditions:
 * - Must run after `authenticate` middleware (req.userId exists)
 * - Must run after `circleIdParamValidationRules` + `validate` middleware (req.params.circleId is valid MongoId)
 */
const verifyCircleMembership = async (req, res, next) => {
  try {
    const { circleId } = req.params;
    const userId = req.userId;

    // Check if the Care Circle exists
    const careCircle = await CareCircle.findById(circleId).populate("careRecipient");

    if (!careCircle || careCircle.status === CIRCLE_STATUS.ARCHIVED) {
      return res.status(404).json({
        success: false,
        message: "Care Circle not found or has been archived.",
        code: "CIRCLE_NOT_FOUND",
      });
    }

    // Check if the authenticated user has an active membership in this circle
    const membership = await CareCircleMember.findOne({
      careCircle: circleId,
      user: userId,
      membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not an active member of this Care Circle.",
        code: "FORBIDDEN",
      });
    }

    // Attach verified circle and membership to request object
    req.careCircle = careCircle;
    req.circleMembership = membership;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require Main Caretaker Middleware
 *
 * Verifies that the authenticated user holds the MAIN_CARETAKER role in the target Care Circle.
 *
 * Preconditions:
 * - Must run after `verifyCircleMembership` (req.circleMembership exists)
 */
const requireMainCaretaker = (req, res, next) => {
  if (!req.circleMembership || req.circleMembership.role !== CAREOS_ROLES.MAIN_CARETAKER) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only the Main Caretaker can manage invitations for this Care Circle.",
      code: "FORBIDDEN",
    });
  }
  next();
};

module.exports = {
  verifyCircleMembership,
  requireMainCaretaker,
};
