const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../models/User");
const CareCircle = require("../models/CareCircle");
const CareCircleMember = require("../models/CareCircleMember");
const CareCircleInvitation = require("../models/CareCircleInvitation");
const RefreshToken = require("../models/RefreshToken");

const {
  CIRCLE_STATUS,
  MEMBERSHIP_STATUS,
  INVITATION_STATUS,
  DEFAULT_INVITATION_EXPIRY_HOURS,
} = require("../constants/roles");

const {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiryDate,
  ACCESS_TOKEN_EXPIRES_IN,
} = require("../utils/token.util");

/**
 * Helper to compute SHA-256 hash of a raw token string
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Helper to get invitation expiration date
 */
const getInvitationExpiryDate = () => {
  const hours =
    parseInt(process.env.INVITATION_EXPIRES_IN_HOURS, 10) || DEFAULT_INVITATION_EXPIRY_HOURS;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

/**
 * Create a new Care Circle invitation
 * POST /api/care-circles/:circleId/invitations
 *
 * Authorization:
 * Only an active MAIN_CARETAKER of the specified Care Circle can create invitations.
 *
 * Security:
 * - Generates a 256-bit cryptographically secure random token.
 * - Stores ONLY the SHA-256 hash in MongoDB.
 * - The raw token is returned once in the response for dispatch/testing.
 */
const createInvitation = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const circleId = req.careCircle._id;
    const inviterId = req.userId;

    // Check if a user with this email is already an active member of this circle
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const existingMembership = await CareCircleMember.findOne({
        careCircle: circleId,
        user: existingUser._id,
        membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
      });

      if (existingMembership) {
        return res.status(409).json({
          success: false,
          message: "A user with this email address is already an active member of this Care Circle.",
          code: "MEMBERSHIP_ALREADY_EXISTS",
        });
      }
    }

    // Revoke any prior pending invitations for this email and circle
    await CareCircleInvitation.updateMany(
      {
        careCircle: circleId,
        email: normalizedEmail,
        status: INVITATION_STATUS.PENDING,
      },
      {
        status: INVITATION_STATUS.REVOKED,
      }
    );

    // Generate random token and hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = getInvitationExpiryDate();

    const invitation = await CareCircleInvitation.create({
      careCircle: circleId,
      invitedBy: inviterId,
      email: normalizedEmail,
      role,
      tokenHash,
      expiresAt,
      status: INVITATION_STATUS.PENDING,
    });

    return res.status(201).json({
      success: true,
      message: "Invitation created successfully.",
      data: {
        invitation: invitation.toJSON(),
        token: rawToken, // Returned once in creation response for delivery/testing
        expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all invitations for a Care Circle
 * GET /api/care-circles/:circleId/invitations
 *
 * Authorization:
 * Only an active MAIN_CARETAKER can view the circle's invitations.
 */
const getCircleInvitations = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;

    const invitations = await CareCircleInvitation.find({
      careCircle: circleId,
    })
      .populate("invitedBy", "name email")
      .populate("acceptedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: invitations.length,
      data: invitations.map((inv) => inv.toJSON()),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke a pending invitation
 * DELETE /api/care-circles/:circleId/invitations/:invitationId
 *
 * Authorization:
 * Only an active MAIN_CARETAKER can revoke invitations.
 */
const revokeInvitation = async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const circleId = req.careCircle._id;

    const invitation = await CareCircleInvitation.findOne({
      _id: invitationId,
      careCircle: circleId,
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found.",
        code: "INVITATION_NOT_FOUND",
      });
    }

    if (invitation.status === INVITATION_STATUS.ACCEPTED) {
      return res.status(400).json({
        success: false,
        message: "Cannot revoke an invitation that has already been accepted.",
        code: "INVITATION_ALREADY_USED",
      });
    }

    invitation.status = INVITATION_STATUS.REVOKED;
    await invitation.save();

    return res.status(200).json({
      success: true,
      message: "Invitation revoked successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify invitation token (Public)
 * GET /api/invitations/:token
 *
 * Security:
 * Returns safe metadata only. Does not expose internal IDs or hashes.
 */
const verifyInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;
    const tokenHash = hashToken(token);

    const invitation = await CareCircleInvitation.findOne({ tokenHash })
      .populate("careCircle", "name status")
      .populate("invitedBy", "name email");

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found.",
        code: "INVITATION_NOT_FOUND",
      });
    }

    if (invitation.status === INVITATION_STATUS.ACCEPTED) {
      return res.status(400).json({
        success: false,
        message: "This invitation has already been accepted.",
        code: "INVITATION_ALREADY_USED",
      });
    }

    if (invitation.status === INVITATION_STATUS.REVOKED) {
      return res.status(400).json({
        success: false,
        message: "This invitation has been revoked.",
        code: "INVITATION_REVOKED",
      });
    }

    if (invitation.status === INVITATION_STATUS.EXPIRED || new Date() > invitation.expiresAt) {
      if (invitation.status === INVITATION_STATUS.PENDING) {
        invitation.status = INVITATION_STATUS.EXPIRED;
        await invitation.save();
      }
      return res.status(400).json({
        success: false,
        message: "This invitation has expired.",
        code: "INVITATION_EXPIRED",
      });
    }

    if (!invitation.careCircle || invitation.careCircle.status !== CIRCLE_STATUS.ACTIVE) {
      return res.status(400).json({
        success: false,
        message: "The Care Circle is no longer active.",
        code: "CIRCLE_NOT_ACTIVE",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        valid: true,
        circleName: invitation.careCircle.name,
        email: invitation.email,
        role: invitation.role,
        inviterName: invitation.invitedBy?.name || "Care Circle Admin",
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept invitation for an existing authenticated user
 * POST /api/invitations/:token/accept
 *
 * Authorization:
 * - Requires Bearer token.
 * - Authenticated user's email MUST match invitation email.
 * - Role is strictly determined by the invitation.
 */
const acceptInvitation = async (req, res, next) => {
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const { token } = req.params;
      const tokenHash = hashToken(token);
      const user = req.user;

      const invitation = await CareCircleInvitation.findOne({ tokenHash }).session(session);

      if (!invitation) {
        const err = new Error("Invitation not found.");
        err.statusCode = 404;
        err.code = "INVITATION_NOT_FOUND";
        throw err;
      }

      if (invitation.status === INVITATION_STATUS.ACCEPTED) {
        const err = new Error("This invitation has already been accepted.");
        err.statusCode = 400;
        err.code = "INVITATION_ALREADY_USED";
        throw err;
      }

      if (invitation.status === INVITATION_STATUS.REVOKED) {
        const err = new Error("This invitation has been revoked.");
        err.statusCode = 400;
        err.code = "INVITATION_REVOKED";
        throw err;
      }

      if (invitation.status === INVITATION_STATUS.EXPIRED || new Date() > invitation.expiresAt) {
        invitation.status = INVITATION_STATUS.EXPIRED;
        await invitation.save({ session });
        const err = new Error("This invitation has expired.");
        err.statusCode = 400;
        err.code = "INVITATION_EXPIRED";
        throw err;
      }

      // Check circle status
      const careCircle = await CareCircle.findById(invitation.careCircle).session(session);
      if (!careCircle || careCircle.status !== CIRCLE_STATUS.ACTIVE) {
        const err = new Error("The Care Circle is no longer active.");
        err.statusCode = 400;
        err.code = "CIRCLE_NOT_ACTIVE";
        throw err;
      }

      // Email matching check: Authenticated user email must match invited email
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        const err = new Error("You can only accept invitations sent to your registered email address.");
        err.statusCode = 403;
        err.code = "INVITATION_EMAIL_MISMATCH";
        throw err;
      }

      // Check if user is already an active member
      const existingMembership = await CareCircleMember.findOne({
        careCircle: invitation.careCircle,
        user: user._id,
        membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
      }).session(session);

      if (existingMembership) {
        const err = new Error("You are already an active member of this Care Circle.");
        err.statusCode = 409;
        err.code = "MEMBERSHIP_ALREADY_EXISTS";
        throw err;
      }

      // 1. Create CareCircleMember with role strictly from invitation
      const [membership] = await CareCircleMember.create(
        [
          {
            careCircle: invitation.careCircle,
            user: user._id,
            role: invitation.role,
            membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
            joinedAt: new Date(),
          },
        ],
        { session }
      );

      // 2. Mark invitation as ACCEPTED
      invitation.status = INVITATION_STATUS.ACCEPTED;
      invitation.acceptedBy = user._id;
      invitation.acceptedAt = new Date();
      await invitation.save({ session });

      result = {
        membership: membership.toJSON(),
        role: invitation.role,
        careCircleId: invitation.careCircle,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Invitation accepted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

/**
 * Accept invitation and register a new user account (Onboarding)
 * POST /api/invitations/:token/accept-and-register
 *
 * Flow:
 * - Public endpoint.
 * - User email and role are derived strictly from the invitation.
 * - Registers new user, creates circle membership, accepts invite, and returns JWT tokens.
 */
const acceptAndRegister = async (req, res, next) => {
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const { token } = req.params;
      const { name, password, phone, profilePhoto } = req.body;
      const tokenHash = hashToken(token);

      const invitation = await CareCircleInvitation.findOne({ tokenHash }).session(session);

      if (!invitation) {
        const err = new Error("Invitation not found.");
        err.statusCode = 404;
        err.code = "INVITATION_NOT_FOUND";
        throw err;
      }

      if (invitation.status === INVITATION_STATUS.ACCEPTED) {
        const err = new Error("This invitation has already been accepted.");
        err.statusCode = 400;
        err.code = "INVITATION_ALREADY_USED";
        throw err;
      }

      if (invitation.status === INVITATION_STATUS.REVOKED) {
        const err = new Error("This invitation has been revoked.");
        err.statusCode = 400;
        err.code = "INVITATION_REVOKED";
        throw err;
      }

      if (invitation.status === INVITATION_STATUS.EXPIRED || new Date() > invitation.expiresAt) {
        invitation.status = INVITATION_STATUS.EXPIRED;
        await invitation.save({ session });
        const err = new Error("This invitation has expired.");
        err.statusCode = 400;
        err.code = "INVITATION_EXPIRED";
        throw err;
      }

      // Check circle status
      const careCircle = await CareCircle.findById(invitation.careCircle).session(session);
      if (!careCircle || careCircle.status !== CIRCLE_STATUS.ACTIVE) {
        const err = new Error("The Care Circle is no longer active.");
        err.statusCode = 400;
        err.code = "CIRCLE_NOT_ACTIVE";
        throw err;
      }

      // Check if an account with this invited email already exists
      const existingUser = await User.findOne({ email: invitation.email }).session(session);
      if (existingUser) {
        const err = new Error(
          "An account with this email already exists. Please log in to accept the invitation."
        );
        err.statusCode = 409;
        err.code = "USER_ALREADY_EXISTS";
        throw err;
      }

      // 1. Hash password
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      // 2. Create new user (Email taken strictly from invitation)
      const [newUser] = await User.create(
        [
          {
            name: name.trim(),
            email: invitation.email,
            phone: phone ? phone.trim() : null,
            passwordHash,
            profilePhoto: profilePhoto || null,
            accountStatus: "active",
            lastLoginAt: new Date(),
          },
        ],
        { session }
      );

      // 3. Create CareCircleMember with role strictly from invitation
      const [membership] = await CareCircleMember.create(
        [
          {
            careCircle: invitation.careCircle,
            user: newUser._id,
            role: invitation.role,
            membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
            joinedAt: new Date(),
          },
        ],
        { session }
      );

      // 4. Mark invitation as ACCEPTED
      invitation.status = INVITATION_STATUS.ACCEPTED;
      invitation.acceptedBy = newUser._id;
      invitation.acceptedAt = new Date();
      await invitation.save({ session });

      // 5. Generate authentication tokens
      const accessToken = generateAccessToken(newUser);
      const refreshToken = generateRefreshToken(newUser);

      // 6. Save RefreshToken session
      await RefreshToken.create(
        [
          {
            token: refreshToken,
            userId: newUser._id,
            expiresAt: getRefreshTokenExpiryDate(),
            userAgent: req.headers["user-agent"] || null,
            ipAddress: req.ip || null,
          },
        ],
        { session }
      );

      result = {
        user: newUser.toJSON(),
        membership: membership.toJSON(),
        role: invitation.role,
        careCircleId: invitation.careCircle,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        },
      };
    });

    return res.status(201).json({
      success: true,
      message: "User registered and joined Care Circle successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createInvitation,
  getCircleInvitations,
  revokeInvitation,
  verifyInvitation,
  acceptInvitation,
  acceptAndRegister,
};
