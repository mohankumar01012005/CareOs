const mongoose = require("mongoose");
const {
  ALL_ROLES,
  MEMBERSHIP_STATUS,
  ALL_MEMBERSHIP_STATUSES,
} = require("../constants/roles");

/**
 * CareCircleMember Model
 *
 * Represents a user's relationship and role within a specific Care Circle.
 * Decouples user identity from roles and permissions.
 *
 * Uniqueness:
 * A compound unique index prevents the same user from being added
 * multiple times to the same Care Circle.
 */
const careCircleMemberSchema = new mongoose.Schema(
  {
    careCircle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareCircle",
      required: [true, "Care Circle reference is required"],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    role: {
      type: String,
      enum: {
        values: ALL_ROLES,
        message: "Invalid CareOS role: {VALUE}",
      },
      required: [true, "Membership role is required"],
    },
    membershipStatus: {
      type: String,
      enum: {
        values: ALL_MEMBERSHIP_STATUSES,
        message: "Invalid membership status: {VALUE}",
      },
      default: MEMBERSHIP_STATUS.ACTIVE,
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index ensuring one membership record per user per care circle
careCircleMemberSchema.index({ careCircle: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("CareCircleMember", careCircleMemberSchema);
