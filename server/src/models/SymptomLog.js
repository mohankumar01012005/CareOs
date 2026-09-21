const mongoose = require("mongoose");
const {
  ALL_SYMPTOM_CATEGORIES,
  ALL_SYMPTOM_SEVERITIES,
  SYMPTOM_SEVERITIES,
} = require("../constants/roles");

/**
 * SymptomLog Model
 *
 * Represents an observed or reported symptom for a care recipient.
 */
const symptomLogSchema = new mongoose.Schema(
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
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recording user reference is required"],
      index: true,
    },
    symptomCategory: {
      type: String,
      enum: {
        values: ALL_SYMPTOM_CATEGORIES,
        message: "Invalid symptom category: {VALUE}",
      },
      required: [true, "Symptom category is required"],
      index: true,
    },
    symptomName: {
      type: String,
      required: [true, "Symptom name is required"],
      trim: true,
      minlength: [2, "Symptom name must be at least 2 characters"],
      maxlength: [200, "Symptom name cannot exceed 200 characters"],
    },
    severity: {
      type: String,
      enum: {
        values: ALL_SYMPTOM_SEVERITIES,
        message: "Invalid symptom severity: {VALUE}",
      },
      default: SYMPTOM_SEVERITIES.MILD,
      index: true,
    },
    severityScore: {
      type: Number,
      min: [1, "Severity score must be at least 1"],
      max: [10, "Severity score cannot exceed 10"],
      default: null,
    },
    onsetTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    durationHours: {
      type: Number,
      min: [0, "Duration hours cannot be negative"],
      default: null,
    },
    isOngoing: {
      type: Boolean,
      default: true,
      index: true,
    },
    bodyLocation: {
      type: String,
      trim: true,
      maxlength: [200, "Body location cannot exceed 200 characters"],
      default: null,
    },
    triggers: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
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

symptomLogSchema.index({ careCircle: 1, onsetTime: -1 });
symptomLogSchema.index({ careCircle: 1, symptomCategory: 1 });
symptomLogSchema.index({ careCircle: 1, isOngoing: 1 });

module.exports = mongoose.model("SymptomLog", symptomLogSchema);
