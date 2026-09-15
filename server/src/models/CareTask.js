const mongoose = require("mongoose");
const {
  TASK_STATUS,
  ALL_TASK_STATUSES,
  TASK_PRIORITY,
  ALL_TASK_PRIORITIES,
  TASK_CATEGORIES,
  TASK_TIME_SLOTS,
} = require("../constants/roles");

/**
 * CareTask Model
 *
 * Represents an actionable task, vital check, errand, appointment,
 * exercise session, or caregiving routine within a Care Circle.
 */
const careTaskSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [2, "Task title must be at least 2 characters"],
      maxlength: [200, "Task title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: null,
      maxlength: [1000, "Task description cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      enum: {
        values: TASK_CATEGORIES,
        message: "Invalid task category: {VALUE}",
      },
      default: "GENERAL",
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: ALL_TASK_PRIORITIES,
        message: "Invalid task priority: {VALUE}",
      },
      default: TASK_PRIORITY.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ALL_TASK_STATUSES,
        message: "Invalid task status: {VALUE}",
      },
      default: TASK_STATUS.PENDING,
      index: true,
    },
    dueDate: {
      type: String,
      required: [true, "Due date (YYYY-MM-DD) is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format"],
      index: true,
    },
    timeSlot: {
      type: String,
      enum: {
        values: TASK_TIME_SLOTS,
        message: "Invalid time slot: {VALUE}",
      },
      default: "morning",
      index: true,
    },
    exactTime: {
      type: String,
      trim: true,
      default: null, // e.g. "08:00", "14:00", "18:30"
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null represents "Shared / Anyone Available"
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: null, // e.g., "Cabinet B1", "Apollo Branch 4", "Living room recliner"
      maxlength: [100, "Location cannot exceed 100 characters"],
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completionNotes: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, "Completion notes cannot exceed 500 characters"],
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

module.exports = mongoose.model("CareTask", careTaskSchema);
