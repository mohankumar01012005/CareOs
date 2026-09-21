const mongoose = require("mongoose");
const {
  DOCUMENT_CATEGORIES,
  DOCUMENT_PRIVACY_LEVELS,
  ALL_DOCUMENT_PRIVACY_LEVELS,
  DOCUMENT_AUDIT_ACTIONS,
} = require("../constants/roles");

/**
 * CareDocument Model
 *
 * Represents medical records, prescriptions, lab reports, insurance policies,
 * government IDs, legal documents, and emergency records within a Care Circle.
 * Features granular privacy levels, emergency access flags, expiry tracking,
 * and immutable audit logging.
 */
const careDocumentSchema = new mongoose.Schema(
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
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader user ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
      minlength: [2, "Document title must be at least 2 characters"],
      maxlength: [200, "Document title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: null,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      enum: {
        values: DOCUMENT_CATEGORIES,
        message: "Invalid document category: {VALUE}",
      },
      default: "OTHER",
      index: true,
    },
    privacyLevel: {
      type: String,
      enum: {
        values: ALL_DOCUMENT_PRIVACY_LEVELS,
        message: "Invalid privacy level: {VALUE}",
      },
      default: DOCUMENT_PRIVACY_LEVELS.CIRCLE_WIDE,
      index: true,
    },
    fileUrl: {
      type: String,
      required: [true, "File URL or storage path is required"],
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
      default: null,
    },
    fileType: {
      type: String,
      trim: true,
      default: "application/octet-stream",
    },
    fileSizeBytes: {
      type: Number,
      min: [0, "File size cannot be negative"],
      default: 0,
    },
    documentNumber: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, "Document number cannot exceed 100 characters"],
    },
    issuedDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Issued date must be in YYYY-MM-DD format"],
      default: null,
    },
    expiryDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be in YYYY-MM-DD format"],
      default: null,
      index: true,
    },
    isEmergencyAccessible: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    version: {
      type: Number,
      default: 1,
      min: [1, "Document version must be at least 1"],
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    auditLogs: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        action: {
          type: String,
          enum: {
            values: DOCUMENT_AUDIT_ACTIONS,
            message: "Invalid audit action: {VALUE}",
          },
          required: true,
        },
        performedAt: {
          type: Date,
          default: Date.now,
        },
        details: {
          type: String,
          default: null,
        },
      },
    ],
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

// Compound indexes for performant querying and filtering
careDocumentSchema.index({ careCircle: 1, category: 1, isArchived: 1 });
careDocumentSchema.index({ careCircle: 1, isEmergencyAccessible: 1, isArchived: 1 });
careDocumentSchema.index({ careCircle: 1, expiryDate: 1, isArchived: 1 });
careDocumentSchema.index({ careCircle: 1, privacyLevel: 1, isArchived: 1 });
careDocumentSchema.index({ careCircle: 1, createdAt: -1 });

module.exports = mongoose.model("CareDocument", careDocumentSchema);
