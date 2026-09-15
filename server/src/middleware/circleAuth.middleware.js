const CareCircle = require("../models/CareCircle");
const CareCircleMember = require("../models/CareCircleMember");
const { CIRCLE_STATUS, MEMBERSHIP_STATUS, CAREOS_ROLES } = require("../constants/roles");

/**
 * Circle Membership Authorization Middleware
 *
 * Verifies that the authenticated user is an ACTIVE member of the requested Care Circle.
 * Decouples user identity from circle-specific membership/role.
 *
 * Checks:
 * 1. Care Circle exists and is ACTIVE (not ARCHIVED). (404 CIRCLE_NOT_FOUND)
 * 2. User has a membership record in this circle. (403 FORBIDDEN)
 * 3. User's membershipStatus is ACTIVE. (403 FORBIDDEN)
 *
 * Attaches to req:
 * - req.careCircle: The populated CareCircle document
 * - req.circleMembership: The CareCircleMember document
 * - req.userCircleRole: The role string of the user in this circle
 *
 * Preconditions:
 * - Must run after `authenticate` middleware (req.userId exists)
 * - Circle ID extracted from req.params.circleId or req.params.id
 */
const verifyCircleMembership = async (req, res, next) => {
  try {
    const circleId = req.params.circleId || req.params.id;
    const userId = req.userId;

    if (!circleId) {
      return res.status(400).json({
        success: false,
        message: "Care Circle ID parameter is required.",
        code: "CIRCLE_ID_REQUIRED",
      });
    }

    // 1. Check if the Care Circle exists and is ACTIVE
    const careCircle = await CareCircle.findById(circleId).populate("careRecipient");

    if (!careCircle || careCircle.status === CIRCLE_STATUS.ARCHIVED) {
      return res.status(404).json({
        success: false,
        message: "Care Circle not found or has been archived.",
        code: "CIRCLE_NOT_FOUND",
      });
    }

    // 2. Retrieve user's membership in this circle
    const membership = await CareCircleMember.findOne({
      careCircle: circleId,
      user: userId,
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not an active member of this Care Circle.",
        code: "FORBIDDEN",
      });
    }

    // 3. Enforce ACTIVE membership status
    if (membership.membershipStatus !== MEMBERSHIP_STATUS.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not an active member of this Care Circle.",
        code: "FORBIDDEN",
      });
    }

    // Attach verified circle and membership to request object
    req.careCircle = careCircle;
    req.circleMembership = membership;
    req.userCircleRole = membership.role;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Authorization Middleware Factory
 *
 * Restricts access to members holding one of the specified roles in the Care Circle.
 * Supports variadic role arguments or array of roles:
 * e.g.,
 *   requireCircleRole("MAIN_CARETAKER")
 *   requireCircleRole("MAIN_CARETAKER", "SUB_CARETAKER")
 *   requireCircleRole(CARETAKER_ROLES)
 *
 * Composable: If `verifyCircleMembership` was not already run in the route chain,
 * `requireCircleRole` automatically executes membership verification first.
 */
const requireCircleRole = (...roles) => {
  const allowedRoles = roles.flat().filter(Boolean);

  return async (req, res, next) => {
    try {
      // If circle membership has not yet been verified on this request, verify it first
      if (!req.circleMembership || !req.careCircle) {
        return verifyCircleMembership(req, res, (err) => {
          if (err) return next(err);
          checkRolePermission(req, res, next, allowedRoles);
        });
      }

      checkRolePermission(req, res, next, allowedRoles);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Helper to validate user role against allowed roles
 */
const checkRolePermission = (req, res, next, allowedRoles) => {
  if (!req.circleMembership || req.circleMembership.membershipStatus !== MEMBERSHIP_STATUS.ACTIVE) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You are not an active member of this Care Circle.",
      code: "FORBIDDEN",
    });
  }

  // If specific roles are required, verify that user's membership role matches
  if (allowedRoles.length > 0 && !allowedRoles.includes(req.circleMembership.role)) {
    const isMainOnly = allowedRoles.length === 1 && allowedRoles[0] === CAREOS_ROLES.MAIN_CARETAKER;
    const message = isMainOnly
      ? "Access denied. Only the Main Caretaker can manage invitations for this Care Circle."
      : `Access denied. Role '${req.circleMembership.role}' does not have permission to perform this action.`;

    return res.status(403).json({
      success: false,
      message,
      code: "FORBIDDEN",
    });
  }

  next();
};

/**
 * Helper to verify if a given role is in an allowed role list
 */
const hasCircleRole = (role, allowedRoles = []) => {
  const flattened = Array.isArray(allowedRoles) ? allowedRoles.flat() : [allowedRoles];
  return flattened.includes(role);
};

/**
 * Backward compatibility: Require Main Caretaker Middleware
 */
const requireMainCaretaker = requireCircleRole(CAREOS_ROLES.MAIN_CARETAKER);

module.exports = {
  verifyCircleMembership,
  requireCircleRole,
  requireMainCaretaker,
  hasCircleRole,
};
