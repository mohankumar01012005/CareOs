const mongoose = require("mongoose");
const {
  ALL_VITAL_TYPES,
  VITAL_TYPES,
  ALL_SUGAR_MEAL_CONTEXTS,
  ALL_VITAL_ALERT_SEVERITIES,
  VITAL_ALERT_SEVERITIES,
} = require("../constants/roles");

/**
 * VitalReading Model
 *
 * Represents an individual clinical vital sign measurement recorded within a Care Circle.
 */
const vitalReadingSchema = new mongoose.Schema(
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
    vitalType: {
      type: String,
      enum: {
        values: ALL_VITAL_TYPES,
        message: "Invalid vital type: {VALUE}",
      },
      required: [true, "Vital type is required"],
      index: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    measurements: {
      // For BLOOD_PRESSURE
      systolic: {
        type: Number,
        min: [30, "Systolic BP must be >= 30"],
        max: [300, "Systolic BP must be <= 300"],
        default: null,
      },
      diastolic: {
        type: Number,
        min: [20, "Diastolic BP must be >= 20"],
        max: [200, "Diastolic BP must be <= 200"],
        default: null,
      },
      pulse: {
        type: Number,
        min: [20, "Pulse must be >= 20"],
        max: [300, "Pulse must be <= 300"],
        default: null,
      },

      // For BLOOD_SUGAR
      sugarLevel: {
        type: Number,
        min: [10, "Blood sugar must be >= 10"],
        max: [1000, "Blood sugar must be <= 1000"],
        default: null,
      },
      mealContext: {
        type: String,
        enum: {
          values: [...ALL_SUGAR_MEAL_CONTEXTS, null],
          message: "Invalid sugar meal context: {VALUE}",
        },
        default: null,
      },

      // For HEART_RATE
      bpm: {
        type: Number,
        min: [20, "Heart rate must be >= 20"],
        max: [300, "Heart rate must be <= 300"],
        default: null,
      },

      // For OXYGEN_SATURATION
      spO2: {
        type: Number,
        min: [40, "SpO2 must be >= 40%"],
        max: [100, "SpO2 must be <= 100%"],
        default: null,
      },

      // For TEMPERATURE
      temperature: {
        type: Number,
        min: [80, "Temperature must be >= 80°"],
        max: [115, "Temperature must be <= 115°"],
        default: null,
      },
      temperatureUnit: {
        type: String,
        enum: ["F", "C"],
        default: "F",
      },

      // For WEIGHT
      weight: {
        type: Number,
        min: [1, "Weight must be >= 1"],
        max: [500, "Weight must be <= 500"],
        default: null,
      },
      weightUnit: {
        type: String,
        enum: ["kg", "lbs"],
        default: "kg",
      },

      // For RESPIRATORY_RATE
      respiratoryRate: {
        type: Number,
        min: [4, "Respiratory rate must be >= 4"],
        max: [80, "Respiratory rate must be <= 80"],
        default: null,
      },
    },
    isAbnormal: {
      type: Boolean,
      default: false,
      index: true,
    },
    alertSeverity: {
      type: String,
      enum: {
        values: ALL_VITAL_ALERT_SEVERITIES,
        message: "Invalid alert severity: {VALUE}",
      },
      default: VITAL_ALERT_SEVERITIES.NORMAL,
      index: true,
    },
    abnormalReasons: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      default: null,
    },
    deviceSource: {
      type: String,
      trim: true,
      default: "manual",
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

// Compound indexes for performant retrieval and sorting
vitalReadingSchema.index({ careCircle: 1, recordedAt: -1 });
vitalReadingSchema.index({ careCircle: 1, vitalType: 1, recordedAt: -1 });
vitalReadingSchema.index({ careCircle: 1, isAbnormal: 1, alertSeverity: 1 });

module.exports = mongoose.model("VitalReading", vitalReadingSchema);
