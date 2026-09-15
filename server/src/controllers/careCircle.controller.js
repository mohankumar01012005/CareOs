const mongoose = require("mongoose");
const CareRecipient = require("../models/CareRecipient");
const CareCircle = require("../models/CareCircle");
const CareCircleMember = require("../models/CareCircleMember");
const {
  CAREOS_ROLES,
  CIRCLE_STATUS,
  MEMBERSHIP_STATUS,
} = require("../constants/roles");

/**
 * Create a new Care Circle and Care Recipient
 * POST /api/care-circles
 *
 * Flow:
 * Authenticated User -> Creates Care Recipient -> Creates Care Circle -> Automatically becomes MAIN_CARETAKER.
 * Executes atomically within a MongoDB transaction.
 *
 * Security:
 * Client cannot select or submit their role or membership status.
 * MAIN_CARETAKER is assigned strictly by backend logic.
 */
const createCareCircle = async (req, res, next) => {
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const { name, recipient } = req.body;
      const userId = req.userId;

      // 1. Create Care Recipient document
      const [careRecipient] = await CareRecipient.create(
        [
          {
            fullName: recipient.fullName.trim(),
            dateOfBirth: recipient.dateOfBirth || null,
            gender: recipient.gender || "prefer_not_to_say",
            bloodGroup: recipient.bloodGroup || "unknown",
            knownConditions: Array.isArray(recipient.knownConditions)
              ? recipient.knownConditions.map((c) => String(c).trim()).filter(Boolean)
              : [],
            allergies: Array.isArray(recipient.allergies)
              ? recipient.allergies.map((a) => String(a).trim()).filter(Boolean)
              : [],
            emergencyContact: {
              name: recipient.emergencyContact?.name
                ? String(recipient.emergencyContact.name).trim()
                : null,
              relationship: recipient.emergencyContact?.relationship
                ? String(recipient.emergencyContact.relationship).trim()
                : null,
              phone: recipient.emergencyContact?.phone
                ? String(recipient.emergencyContact.phone).trim()
                : null,
            },
            profilePhoto: recipient.profilePhoto ? String(recipient.profilePhoto).trim() : null,
            createdBy: userId,
          },
        ],
        { session }
      );

      // 2. Create Care Circle document
      const [careCircle] = await CareCircle.create(
        [
          {
            name: name.trim(),
            careRecipient: careRecipient._id,
            status: CIRCLE_STATUS.ACTIVE,
            createdBy: userId,
          },
        ],
        { session }
      );

      // 3. Create Care Circle Member document with MAIN_CARETAKER role
      const [membership] = await CareCircleMember.create(
        [
          {
            careCircle: careCircle._id,
            user: userId,
            role: CAREOS_ROLES.MAIN_CARETAKER,
            membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
            joinedAt: new Date(),
          },
        ],
        { session }
      );

      result = {
        careCircle: careCircle.toJSON(),
        careRecipient: careRecipient.toJSON(),
        membership: membership.toJSON(),
      };
    });

    return res.status(201).json({
      success: true,
      message: "Care Circle created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

/**
 * Get all Care Circles where the authenticated user is an active member
 * GET /api/care-circles
 */
const getUserCareCircles = async (req, res, next) => {
  try {
    const userId = req.userId;

    const memberships = await CareCircleMember.find({
      user: userId,
      membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
    })
      .populate({
        path: "careCircle",
        match: { status: CIRCLE_STATUS.ACTIVE },
        populate: {
          path: "careRecipient",
          select: "fullName dateOfBirth gender bloodGroup knownConditions allergies profilePhoto",
        },
      })
      .sort({ createdAt: -1 });

    // Filter out circles that were archived or deleted
    const activeMemberships = memberships.filter((m) => m.careCircle != null);

    const circles = activeMemberships.map((m) => ({
      id: m.careCircle.id || m.careCircle._id,
      name: m.careCircle.name,
      status: m.careCircle.status,
      role: m.role,
      membershipStatus: m.membershipStatus,
      joinedAt: m.joinedAt,
      createdAt: m.careCircle.createdAt,
      careRecipient: m.careCircle.careRecipient,
    }));

    return res.status(200).json({
      success: true,
      count: circles.length,
      data: circles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get details of a single Care Circle by ID
 * GET /api/care-circles/:circleId
 *
 * Authorization:
 * Enforced by `verifyCircleMembership` middleware.
 * Only members of this circle can access its data.
 */
const getCareCircleDetails = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;

    // Retrieve all active members belonging to this circle
    const members = await CareCircleMember.find({
      careCircle: circleId,
      membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
    })
      .populate("user", "name email phone profilePhoto accountStatus")
      .sort({ joinedAt: 1 });

    const sanitizedMembers = members.map((m) => ({
      id: m.id || m._id,
      role: m.role,
      membershipStatus: m.membershipStatus,
      joinedAt: m.joinedAt,
      user: m.user ? m.user.toJSON() : null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        careCircle: req.careCircle.toJSON(),
        currentUserRole: req.circleMembership.role,
        members: sanitizedMembers,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCareCircle,
  getUserCareCircles,
  getCareCircleDetails,
};
