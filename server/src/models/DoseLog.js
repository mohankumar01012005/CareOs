const mongoose = require("mongoose");
const { DOSE_STATUS, ALL_DOSE_STATUSES, TIME_SLOTS } = require("../constants/roles");

/**
 * DoseLog Model
 *
 * Represents an administration event (or skip/miss) of a medication dose.
 * Captures caregiver attribution, exact time, health observations/notes, and stock deduction.
 */
const doseLogSchema = new mongoose.Schema(
  {
    careCircle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareCircle",
      required: [true, "Care Circle reference is required"],
      index: true,
    },
    careRecipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareRecipient",
      required: [true, "Care Recipient reference is required"],
      index: true,
    },
    medication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medication",
      required: [true, "Medication reference is required"],
      index: true,
    },
    scheduledDate: {
      type: String,
      required: [true, "Scheduled date (YYYY-MM-DD) is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Scheduled date must be in YYYY-MM-DD format"],
      index: true,
    },
    slot: {
      type: String,
      enum: {
        values: TIME_SLOTS,
        message: "Invalid time slot: {VALUE}",
      },
      required: [true, "Dose slot is required"],
      index: true,
    },
    scheduledTime: {
      type: String,
      trim: true,
      default: null, // e.g. "08:00"
    },
    status: {
      type: String,
      enum: {
        values: ALL_DOSE_STATUSES,
        message: "Invalid dose status: {VALUE}",
      },
      default: DOSE_STATUS.TAKEN,
      index: true,
    },
    administeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Administering user is required"],
      index: true,
    },
    administeredAt: {
      type: Date,
      default: Date.now,
    },
    quantityTaken: {
      type: Number,
      default: 1,
      min: [0, "Quantity taken cannot be negative"],
    },
    notes: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    skipReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, "Skip reason cannot exceed 500 characters"],
    },
    stockDeducted: {
      type: Boolean,
      default: false,
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

// Compound unique index for scheduled slots to prevent double-logging the same slot on the same day
doseLogSchema.index(
  { medication: 1, scheduledDate: 1, slot: 1 },
  {
    unique: true,
    partialFilterExpression: { slot: { $ne: "as_needed" } },
  }
);

module.exports = mongoose.model("DoseLog", doseLogSchema);
