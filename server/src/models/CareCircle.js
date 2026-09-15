const mongoose = require("mongoose");
const { CIRCLE_STATUS, ALL_CIRCLE_STATUSES } = require("../constants/roles");

/**
 * CareCircle Model
 *
 * Represents one caregiving network established around one CareRecipient.
 * Has a clear lifecycle status (ACTIVE, ARCHIVED).
 */
const careCircleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Care Circle name is required"],
      trim: true,
      minlength: [2, "Circle name must be at least 2 characters"],
      maxlength: [100, "Circle name cannot exceed 100 characters"],
    },
    careRecipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareRecipient",
      required: [true, "Care recipient reference is required"],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ALL_CIRCLE_STATUSES,
        message: "Invalid circle status: {VALUE}",
      },
      default: CIRCLE_STATUS.ACTIVE,
      index: true,
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

module.exports = mongoose.model("CareCircle", careCircleSchema);
