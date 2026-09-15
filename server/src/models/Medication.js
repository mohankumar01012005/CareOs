const mongoose = require("mongoose");
const {
  MEDICATION_STATUS,
  ALL_MEDICATION_STATUSES,
  MEDICATION_FORMS,
  MEDICATION_FREQUENCIES,
  TIME_SLOTS,
  FOOD_TIMINGS,
} = require("../constants/roles");

/**
 * Medication Model
 *
 * Represents a prescribed medicine or daily health supplement for a CareRecipient
 * within a specific CareCircle.
 */
const medicationScheduleItemSchema = new mongoose.Schema(
  {
    slot: {
      type: String,
      enum: {
        values: TIME_SLOTS,
        message: "Invalid time slot: {VALUE}",
      },
      required: [true, "Schedule slot is required (morning, afternoon, evening, night, as_needed)"],
    },
    time: {
      type: String,
      trim: true,
      default: null, // e.g., "08:00", "14:00", "20:30"
    },
    doseQuantity: {
      type: Number,
      default: 1,
      min: [0.1, "Dose quantity must be greater than 0"],
    },
    instructions: {
      type: String,
      trim: true,
      default: null, // e.g., "1 tablet with breakfast"
    },
  },
  { _id: false }
);

const medicationSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: [true, "Medication name is required"],
      trim: true,
      minlength: [2, "Medication name must be at least 2 characters"],
      maxlength: [100, "Medication name cannot exceed 100 characters"],
    },
    genericName: {
      type: String,
      trim: true,
      default: null,
      maxlength: [150, "Generic name cannot exceed 150 characters"],
    },
    dosage: {
      type: String,
      required: [true, "Dosage is required (e.g. 500mg, 5ml, 1 puff)"],
      trim: true,
      maxlength: [50, "Dosage description cannot exceed 50 characters"],
    },
    form: {
      type: String,
      enum: {
        values: MEDICATION_FORMS,
        message: "Invalid medication form: {VALUE}",
      },
      default: "tablet",
    },
    formDetails: {
      type: String,
      trim: true,
      default: null, // e.g., "White Round Tablet, Embossed M 500"
      maxlength: [100, "Form details cannot exceed 100 characters"],
    },
    frequency: {
      type: String,
      enum: {
        values: MEDICATION_FREQUENCIES,
        message: "Invalid medication frequency: {VALUE}",
      },
      default: "once_daily",
    },
    schedule: {
      type: [medicationScheduleItemSchema],
      default: [
        {
          slot: "morning",
          time: "08:00",
          doseQuantity: 1,
          instructions: "Take with breakfast",
        },
      ],
    },
    instructions: {
      type: String,
      trim: true,
      default: null, // e.g., "Take with full glass of water"
      maxlength: [500, "Instructions cannot exceed 500 characters"],
    },
    foodTiming: {
      type: String,
      enum: {
        values: FOOD_TIMINGS,
        message: "Invalid food timing: {VALUE}",
      },
      default: "no_restriction",
    },
    prescribedBy: {
      doctorName: {
        type: String,
        trim: true,
        default: null,
        maxlength: [100, "Doctor name cannot exceed 100 characters"],
      },
      specialty: {
        type: String,
        trim: true,
        default: null,
        maxlength: [100, "Specialty cannot exceed 100 characters"],
      },
      hospital: {
        type: String,
        trim: true,
        default: null,
        maxlength: [150, "Hospital name cannot exceed 150 characters"],
      },
      phone: {
        type: String,
        trim: true,
        default: null,
      },
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ALL_MEDICATION_STATUSES,
        message: "Invalid medication status: {VALUE}",
      },
      default: MEDICATION_STATUS.ACTIVE,
      index: true,
    },
    stock: {
      tracked: {
        type: Boolean,
        default: true,
      },
      currentQuantity: {
        type: Number,
        default: 0,
        min: [0, "Current quantity cannot be negative"],
      },
      unit: {
        type: String,
        trim: true,
        default: "tablets",
      },
      lowStockThreshold: {
        type: Number,
        default: 10,
        min: [0, "Low stock threshold cannot be negative"],
      },
      packageSize: {
        type: Number,
        default: 60,
        min: [1, "Package size must be at least 1"],
      },
      pharmacy: {
        type: String,
        trim: true,
        default: null,
      },
    },
    safetyProtocols: {
      type: [String],
      default: [],
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

module.exports = mongoose.model("Medication", medicationSchema);
