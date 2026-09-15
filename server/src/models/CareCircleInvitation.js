const mongoose = require("mongoose");
const {
  INVITATION_ROLES,
  INVITATION_STATUS,
  ALL_INVITATION_STATUSES,
} = require("../constants/roles");

/**
 * CareCircleInvitation Model
 *
 * Represents a secure, time-limited, single-use, role-specific invitation to join a Care Circle.
 *
 * Security:
 * - The raw secret invitation token is NEVER stored in MongoDB.
 * - Only the SHA-256 hash (`tokenHash`) is stored.
 * - `tokenHash` has `select: false` to prevent accidental inclusion in queries.
 */
const careCircleInvitationSchema = new mongoose.Schema(
  {
    careCircle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareCircle",
      required: [true, "Care Circle reference is required"],
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Inviter user ID is required"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Invitee email address is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: {
        values: INVITATION_ROLES,
        message: "Invalid invitation role: {VALUE}. Allowed roles: " + INVITATION_ROLES.join(", "),
      },
      required: [true, "Invitation role is required"],
    },
    tokenHash: {
      type: String,
      required: [true, "Token hash is required"],
      unique: true,
      index: true,
      select: false, // Prevents accidental leak in queries unless explicitly selected
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ALL_INVITATION_STATUSES,
        message: "Invalid invitation status: {VALUE}",
      },
      default: INVITATION_STATUS.PENDING,
      index: true,
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.tokenHash;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("CareCircleInvitation", careCircleInvitationSchema);
