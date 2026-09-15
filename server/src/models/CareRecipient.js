const mongoose = require("mongoose");
const { BLOOD_GROUPS, GENDERS } = require("../constants/roles");

/**
 * CareRecipient Model
 *
 * Represents the person receiving care.
 * A CareRecipient is NOT a User and does not possess login credentials.
 * Kept focused on genuinely required MVP fields and cleanly extensible.
 */
const careRecipientSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Recipient full name is required"],
      trim: true,
      minlength: [2, "Recipient name must be at least 2 characters"],
      maxlength: [100, "Recipient name cannot exceed 100 characters"],
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: {
        values: GENDERS,
        message: "Invalid gender specified: {VALUE}",
      },
      default: "prefer_not_to_say",
    },
    bloodGroup: {
      type: String,
      enum: {
        values: BLOOD_GROUPS,
        message: "Invalid blood group specified: {VALUE}",
      },
      default: "unknown",
    },
    knownConditions: {
      type: [String],
      default: [],
    },
    allergies: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
        default: null,
      },
      relationship: {
        type: String,
        trim: true,
        default: null,
      },
      phone: {
        type: String,
        trim: true,
        default: null,
      },
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator user ID is required"],
      index: true,
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

module.exports = mongoose.model("CareRecipient", careRecipientSchema);
