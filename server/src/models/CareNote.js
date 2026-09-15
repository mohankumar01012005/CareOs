const mongoose = require("mongoose");
const {
  NOTE_CATEGORIES,
  NOTE_SHIFTS,
  NOTE_URGENCY,
  ALL_NOTE_URGENCIES,
  APPETITE_LEVELS,
  MOOD_LEVELS,
  BOWEL_MOVEMENT_STATUS,
} = require("../constants/roles");

/**
 * CareNote Model
 *
 * Represents an observation, shift handover note, vital/diet log,
 * incident report, or clinical note within a Care Circle.
 */
const careNoteSchema = new mongoose.Schema(
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
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author user ID is required"],
      index: true,
    },
    category: {
      type: String,
      enum: {
        values: NOTE_CATEGORIES,
        message: "Invalid note category: {VALUE}",
      },
      default: "GENERAL",
      index: true,
    },
    shift: {
      type: String,
      enum: {
        values: NOTE_SHIFTS,
        message: "Invalid shift: {VALUE}",
      },
      default: "none",
      index: true,
    },
    noteDate: {
      type: String,
      required: [true, "Note date (YYYY-MM-DD) is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Note date must be in YYYY-MM-DD format"],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: null,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Note content is required"],
      trim: true,
      minlength: [2, "Content must be at least 2 characters"],
      maxlength: [3000, "Content cannot exceed 3000 characters"],
    },
    urgency: {
      type: String,
      enum: {
        values: ALL_NOTE_URGENCIES,
        message: "Invalid urgency: {VALUE}",
      },
      default: NOTE_URGENCY.NORMAL,
      index: true,
    },
    vitalsSnapshot: {
      bpSystolic: {
        type: Number,
        min: [40, "Systolic BP must be >= 40"],
        max: [300, "Systolic BP must be <= 300"],
        default: null,
      },
      bpDiastolic: {
        type: Number,
        min: [30, "Diastolic BP must be >= 30"],
        max: [200, "Diastolic BP must be <= 200"],
        default: null,
      },
      heartRate: {
        type: Number,
        min: [30, "Heart rate must be >= 30"],
        max: [250, "Heart rate must be <= 250"],
        default: null,
      },
      bloodSugar: {
        type: Number,
        min: [20, "Blood sugar must be >= 20"],
        max: [800, "Blood sugar must be <= 800"],
        default: null,
      },
      temperature: {
        type: Number,
        min: [90, "Temperature must be >= 90°F"],
        max: [110, "Temperature must be <= 110°F"],
        default: null,
      },
      spO2: {
        type: Number,
        min: [50, "SpO2 must be >= 50%"],
        max: [100, "SpO2 must be <= 100%"],
        default: null,
      },
    },
    dietMood: {
      appetite: {
        type: String,
        enum: {
          values: [...APPETITE_LEVELS, null],
          message: "Invalid appetite level: {VALUE}",
        },
        default: null,
      },
      mood: {
        type: String,
        enum: {
          values: [...MOOD_LEVELS, null],
          message: "Invalid mood level: {VALUE}",
        },
        default: null,
      },
      bowelMovement: {
        type: String,
        enum: {
          values: [...BOWEL_MOVEMENT_STATUS, null],
          message: "Invalid bowel movement status: {VALUE}",
        },
        default: null,
      },
    },
    acknowledgedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        acknowledgedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
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
careNoteSchema.index({ careCircle: 1, noteDate: -1, isPinned: -1 });
careNoteSchema.index({ careCircle: 1, category: 1 });
careNoteSchema.index({ careCircle: 1, urgency: 1 });

module.exports = mongoose.model("CareNote", careNoteSchema);
