const mongoose = require("mongoose");
const CareDocument = require("../models/CareDocument");
const {
  CAREOS_ROLES,
  CARETAKER_ROLES,
  DOCUMENT_ACCESS_ROLES_MAP,
  DOCUMENT_PRIVACY_LEVELS,
  STORAGE_PROVIDERS,
  DOCUMENT_SCAN_STATUS,
} = require("../constants/roles");
const {
  S3_DOCUMENT_BUCKET,
  DEFAULT_PRESIGNED_URL_EXPIRES_SECONDS,
  EMERGENCY_PRESIGNED_URL_EXPIRES_SECONDS,
  buildS3ObjectKey,
  validateFileForUpload,
  uploadFileToS3,
  getPresignedDownloadUrl,
  deleteFileFromS3,
} = require("../utils/s3.util");

/**
 * Helper to get current date in YYYY-MM-DD format
 */
const getTodayDateString = () => {
  return new Date().toISOString().split("T")[0];
};

/**
 * Helper to calculate future date string (YYYY-MM-DD)
 */
const getFutureDateString = (daysAhead = 30) => {
  const d = new Date();
  d.setDate(d.getDate() + Number(daysAhead));
  return d.toISOString().split("T")[0];
};

/**
 * Helper to get list of allowed privacy levels for a user role
 */
const getAllowedPrivacyLevelsForRole = (userRole) => {
  const allowed = [];
  for (const [privacyLevel, roles] of Object.entries(DOCUMENT_ACCESS_ROLES_MAP)) {
    if (roles.includes(userRole)) {
      allowed.push(privacyLevel);
    }
  }
  return allowed;
};

/**
 * Helper to check if a user has access to a document
 * Strict PERSONAL privacy: only uploader can access.
 */
const canUserAccessDocument = (doc, userRole, userId) => {
  if (!doc || !userId) return false;

  const uploaderId = doc.uploadedBy?._id || doc.uploadedBy?.id || doc.uploadedBy;
  const isUploader = Boolean(uploaderId && uploaderId.toString() === userId.toString());

  // If document is marked PERSONAL, strictly uploader only
  if (doc.privacyLevel === DOCUMENT_PRIVACY_LEVELS.PERSONAL) {
    return isUploader;
  }

  // Uploader can always access their own documents
  if (isUploader) {
    return true;
  }

  // Otherwise check role mapping
  const allowedRoles = DOCUMENT_ACCESS_ROLES_MAP[doc.privacyLevel] || [];
  return allowedRoles.includes(userRole);
};

/**
 * 1. Upload a real file to S3 with KMS encryption and create document record
 * @route POST /api/care-circles/:circleId/documents/upload
 */
const uploadDocumentFile = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const careRecipientId =
      req.careCircle.careRecipient._id || req.careCircle.careRecipient;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file was uploaded. Please attach a file.",
        code: "FILE_REQUIRED",
      });
    }

    // 1. Validate file (size, extensions, magic numbers)
    const fileValidation = validateFileForUpload(req.file);
    if (!fileValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: fileValidation.message,
        code: fileValidation.code,
      });
    }

    const {
      title,
      description,
      category,
      privacyLevel,
      documentNumber,
      issuedDate,
      expiryDate,
      isEmergencyAccessible,
      tags,
      version,
    } = req.body;

    const chosenPrivacyLevel =
      privacyLevel || DOCUMENT_PRIVACY_LEVELS.CIRCLE_WIDE;
    const emergencyFlag =
      isEmergencyAccessible === "true" || isEmergencyAccessible === true;

    // 2. Reject contradiction between PERSONAL and Emergency
    if (
      chosenPrivacyLevel === DOCUMENT_PRIVACY_LEVELS.PERSONAL &&
      emergencyFlag
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A document with PERSONAL (Uploader-Only) privacy cannot be flagged as Emergency Accessible.",
        code: "INVALID_PRIVACY_COMBINATION",
      });
    }

    // 3. Generate unique ObjectId and S3 Object Key
    const docId = new mongoose.Types.ObjectId();
    const s3Key = buildS3ObjectKey({
      circleId,
      recipientId: careRecipientId,
      docId,
      originalFileName: req.file.originalname,
    });

    // 4. Upload buffer to S3 with SSE-KMS
    const uploadResult = await uploadFileToS3({
      bucket: S3_DOCUMENT_BUCKET,
      key: s3Key,
      buffer: req.file.buffer,
      contentType: fileValidation.mimeType,
      metadata: {
        circleId: String(circleId),
        recipientId: String(careRecipientId),
        docId: String(docId),
        uploadedBy: String(req.userId),
      },
    });

    const parsedTags = Array.isArray(tags)
      ? tags
      : typeof tags === "string" && tags.trim()
      ? tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    // 5. Create CareDocument in MongoDB
    const document = new CareDocument({
      _id: docId,
      careCircle: circleId,
      careRecipient: careRecipientId,
      uploadedBy: req.userId,
      title: title.trim(),
      description: description ? description.trim() : null,
      category: category || "OTHER",
      privacyLevel: chosenPrivacyLevel,
      storageProvider: STORAGE_PROVIDERS.S3,
      s3Bucket: S3_DOCUMENT_BUCKET,
      s3Key,
      s3Region: process.env.AWS_REGION || "ap-south-1",
      s3VersionId: uploadResult.versionId,
      s3Etag: uploadResult.eTag,
      originalFileName: req.file.originalname,
      fileName: fileValidation.sanitizedFileName,
      fileType: fileValidation.mimeType,
      mimeType: fileValidation.mimeType,
      fileSizeBytes: fileValidation.fileSize,
      fileUrl: `/api/care-circles/${circleId}/documents/${docId}/download`,
      documentNumber: documentNumber ? documentNumber.trim() : null,
      issuedDate: issuedDate || null,
      expiryDate: expiryDate || null,
      isEmergencyAccessible: emergencyFlag,
      tags: parsedTags,
      version: Number(version) || 1,
      scanStatus: DOCUMENT_SCAN_STATUS.CLEAN,
      auditLogs: [
        {
          user: req.userId,
          action: "UPLOAD",
          performedAt: new Date(),
          details: `Uploaded encrypted file '${fileValidation.sanitizedFileName}' (${fileValidation.fileSize} bytes) to S3 vault`,
        },
      ],
    });

    await document.save();
    await document.populate("uploadedBy", "name email profilePhoto");

    res.status(201).json({
      success: true,
      message: "Document uploaded and encrypted in vault successfully.",
      data: {
        document,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Create a new document in the vault (URL or reference based)
 * @route POST /api/care-circles/:circleId/documents
 */
const createDocument = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const careRecipientId =
      req.careCircle.careRecipient._id || req.careCircle.careRecipient;

    const {
      title,
      description,
      category,
      privacyLevel,
      fileUrl,
      fileName,
      fileType,
      fileSizeBytes,
      documentNumber,
      issuedDate,
      expiryDate,
      isEmergencyAccessible,
      tags,
      version,
    } = req.body;

    const chosenPrivacyLevel =
      privacyLevel || DOCUMENT_PRIVACY_LEVELS.CIRCLE_WIDE;
    const emergencyFlag = Boolean(isEmergencyAccessible);

    if (
      chosenPrivacyLevel === DOCUMENT_PRIVACY_LEVELS.PERSONAL &&
      emergencyFlag
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A document with PERSONAL (Uploader-Only) privacy cannot be flagged as Emergency Accessible.",
        code: "INVALID_PRIVACY_COMBINATION",
      });
    }

    const document = new CareDocument({
      careCircle: circleId,
      careRecipient: careRecipientId,
      uploadedBy: req.userId,
      title,
      description: description || null,
      category: category || "OTHER",
      privacyLevel: chosenPrivacyLevel,
      storageProvider: STORAGE_PROVIDERS.EXTERNAL_URL,
      fileUrl,
      fileName: fileName || null,
      fileType: fileType || "application/octet-stream",
      fileSizeBytes: fileSizeBytes || 0,
      documentNumber: documentNumber || null,
      issuedDate: issuedDate || null,
      expiryDate: expiryDate || null,
      isEmergencyAccessible: emergencyFlag,
      tags: Array.isArray(tags) ? tags : [],
      version: version || 1,
      scanStatus: DOCUMENT_SCAN_STATUS.NOT_APPLICABLE,
      auditLogs: [
        {
          user: req.userId,
          action: "UPDATE",
          performedAt: new Date(),
          details: "Document reference created in vault",
        },
      ],
    });

    await document.save();
    await document.populate("uploadedBy", "name email profilePhoto");

    res.status(201).json({
      success: true,
      message: "Document created in vault successfully.",
      data: {
        document,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. List documents with role-based privacy filtering, category, search & pagination
 * Enforces strict PERSONAL privacy filter.
 * @route GET /api/care-circles/:circleId/documents
 */
const getCircleDocuments = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const userRole = req.circleMembership.role;
    const userId = req.userId;

    const {
      category,
      privacyLevel,
      search,
      tags,
      isEmergencyAccessible,
      page = 1,
      limit = 50,
    } = req.query;

    const allowedLevels = getAllowedPrivacyLevelsForRole(userRole).filter(
      (lvl) => lvl !== DOCUMENT_PRIVACY_LEVELS.PERSONAL
    );

    const filter = {
      careCircle: circleId,
      isArchived: false,
      $or: [
        { privacyLevel: { $in: allowedLevels } },
        { uploadedBy: userId },
      ],
    };

    if (category) filter.category = category;

    if (privacyLevel) {
      if (privacyLevel === DOCUMENT_PRIVACY_LEVELS.PERSONAL) {
        filter.privacyLevel = DOCUMENT_PRIVACY_LEVELS.PERSONAL;
        filter.uploadedBy = userId;
        delete filter.$or;
      } else if (
        allowedLevels.includes(privacyLevel) ||
        CARETAKER_ROLES.includes(userRole)
      ) {
        filter.privacyLevel = privacyLevel;
      } else {
        return res.json({
          success: true,
          count: 0,
          total: 0,
          data: { documents: [] },
        });
      }
    }

    if (isEmergencyAccessible !== undefined) {
      filter.isEmergencyAccessible =
        isEmergencyAccessible === "true" || isEmergencyAccessible === true;
    }

    if (tags) {
      const tagList = Array.isArray(tags)
        ? tags
        : tags.split(",").map((t) => t.trim().toLowerCase());
      filter.tags = { $in: tagList };
    }

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      const searchCondition = {
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { documentNumber: searchRegex },
          { tags: searchRegex },
          { fileName: searchRegex },
          { originalFileName: searchRegex },
        ],
      };

      if (filter.$or) {
        filter.$and = [searchCondition];
      } else {
        filter.$and = [searchCondition];
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const documents = await CareDocument.find(filter)
      .populate("uploadedBy", "name email profilePhoto")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await CareDocument.countDocuments(filter);

    res.json({
      success: true,
      count: documents.length,
      total,
      data: {
        documents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get Emergency Quick-Access documents
 * Explicitly excludes PERSONAL documents of other users.
 * @route GET /api/care-circles/:circleId/documents/emergency
 */
const getEmergencyDocuments = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const userId = req.userId;

    const documents = await CareDocument.find({
      careCircle: circleId,
      isArchived: false,
      $or: [
        { isEmergencyAccessible: true, privacyLevel: { $ne: DOCUMENT_PRIVACY_LEVELS.PERSONAL } },
        { privacyLevel: DOCUMENT_PRIVACY_LEVELS.EMERGENCY_SOS },
        { isEmergencyAccessible: true, uploadedBy: userId },
      ],
    })
      .populate("uploadedBy", "name email profilePhoto")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: documents.length,
      data: {
        documents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get Expiring & Expired Documents Telemetry
 * Respects PERSONAL privacy.
 * @route GET /api/care-circles/:circleId/documents/expiring
 */
const getExpiringDocuments = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const userRole = req.circleMembership.role;
    const userId = req.userId;
    const daysAhead = Number(req.query.days || 30);

    const today = getTodayDateString();
    const cutoffDate = getFutureDateString(daysAhead);

    const allowedLevels = getAllowedPrivacyLevelsForRole(userRole).filter(
      (lvl) => lvl !== DOCUMENT_PRIVACY_LEVELS.PERSONAL
    );

    const baseFilter = {
      careCircle: circleId,
      isArchived: false,
      $or: [
        { privacyLevel: { $in: allowedLevels } },
        { uploadedBy: userId },
      ],
    };

    const expiringFilter = {
      ...baseFilter,
      expiryDate: { $ne: null, $gte: today, $lte: cutoffDate },
    };

    const expiredFilter = {
      ...baseFilter,
      expiryDate: { $ne: null, $lt: today },
    };

    const [expiringDocuments, expiredDocuments] = await Promise.all([
      CareDocument.find(expiringFilter)
        .populate("uploadedBy", "name email profilePhoto")
        .sort({ expiryDate: 1 }),
      CareDocument.find(expiredFilter)
        .populate("uploadedBy", "name email profilePhoto")
        .sort({ expiryDate: -1 }),
    ]);

    res.json({
      success: true,
      data: {
        windowDays: daysAhead,
        expiringCount: expiringDocuments.length,
        expiredCount: expiredDocuments.length,
        expiringDocuments,
        expiredDocuments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get single document by ID with role-based and PERSONAL privacy check & VIEW audit log
 * @route GET /api/care-circles/:circleId/documents/:docId
 */
const getDocumentById = async (req, res, next) => {
  try {
    const { circleId, docId } = req.params;
    const userRole = req.circleMembership.role;
    const userId = req.userId;

    const document = await CareDocument.findOne({
      _id: docId,
      careCircle: circleId,
      isArchived: false,
    }).populate("uploadedBy", "name email profilePhoto");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found in this Care Circle.",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    // Role-based and strict PERSONAL privacy check
    if (!canUserAccessDocument(document, userRole, userId)) {
      return res.status(403).json({
        success: false,
        message:
          document.privacyLevel === DOCUMENT_PRIVACY_LEVELS.PERSONAL
            ? "Access denied. This document is marked as Personal (Uploader Only)."
            : "Access denied. You do not have permission to view this document.",
        code: "DOCUMENT_ACCESS_RESTRICTED",
      });
    }

    // Audit log this VIEW access
    document.auditLogs.push({
      user: userId,
      action: "VIEW",
      performedAt: new Date(),
      details: "Viewed document metadata and dossier details",
    });

    await document.save();

    res.json({
      success: true,
      data: {
        document,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Authorize and generate a secure presigned download / preview URL
 * @route GET /api/care-circles/:circleId/documents/:docId/download
 */
const getDocumentDownloadUrl = async (req, res, next) => {
  try {
    const { circleId, docId } = req.params;
    const userRole = req.circleMembership.role;
    const userId = req.userId;
    const isInline = req.query.inline === "true";

    const document = await CareDocument.findOne({
      _id: docId,
      careCircle: circleId,
      isArchived: false,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found in this Care Circle.",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    // Authorization & PERSONAL check
    if (!canUserAccessDocument(document, userRole, userId)) {
      // Log unauthorized attempt
      document.auditLogs.push({
        user: userId,
        action: "DOWNLOAD_DENIED",
        performedAt: new Date(),
        details: `Unauthorized download attempt by role ${userRole}`,
      });
      await document.save();

      return res.status(403).json({
        success: false,
        message:
          document.privacyLevel === DOCUMENT_PRIVACY_LEVELS.PERSONAL
            ? "Access denied. This document is marked as Personal (Uploader Only)."
            : "Access denied. You do not have permission to download this document.",
        code: "DOCUMENT_ACCESS_RESTRICTED",
      });
    }

    // Check malware quarantine status
    if (document.scanStatus === DOCUMENT_SCAN_STATUS.INFECTED) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. This document has been quarantined due to a security scan.",
        code: "DOCUMENT_QUARANTINED",
      });
    }

    let downloadUrl = document.fileUrl;
    let expiresInSeconds = null;
    let expiresAt = null;

    if (
      document.storageProvider === STORAGE_PROVIDERS.S3 ||
      Boolean(document.s3Key)
    ) {
      const isEmergency =
        document.isEmergencyAccessible ||
        document.privacyLevel === DOCUMENT_PRIVACY_LEVELS.EMERGENCY_SOS;

      const duration = isEmergency
        ? EMERGENCY_PRESIGNED_URL_EXPIRES_SECONDS
        : DEFAULT_PRESIGNED_URL_EXPIRES_SECONDS;

      const presignedResult = await getPresignedDownloadUrl({
        bucket: document.s3Bucket || S3_DOCUMENT_BUCKET,
        key: document.s3Key,
        expiresInSeconds: duration,
        originalFileName: document.originalFileName || document.fileName,
        contentType: document.mimeType || document.fileType,
        isInline,
      });

      downloadUrl = presignedResult.downloadUrl;
      expiresInSeconds = presignedResult.expiresInSeconds;
      expiresAt = presignedResult.expiresAt;
    }

    // Record DOWNLOAD audit log
    document.auditLogs.push({
      user: userId,
      action: "DOWNLOAD",
      performedAt: new Date(),
      details:
        document.storageProvider === STORAGE_PROVIDERS.S3
          ? `Generated encrypted presigned ${isInline ? "preview" : "download"} URL (valid for ${expiresInSeconds}s)`
          : "Accessed external document URL",
    });

    await document.save();

    res.json({
      success: true,
      message: "Document download authorized.",
      data: {
        downloadUrl,
        expiresInSeconds,
        expiresAt,
        storageProvider: document.storageProvider,
        fileName: document.fileName || document.originalFileName,
        contentType: document.mimeType || document.fileType,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Update document metadata
 * Author or Caretakers (for non-PERSONAL docs).
 * For PERSONAL documents: ONLY author can update.
 * @route PATCH /api/care-circles/:circleId/documents/:docId
 */
const updateDocument = async (req, res, next) => {
  try {
    const { circleId, docId } = req.params;
    const userRole = req.circleMembership.role;
    const userId = req.userId;

    const document = await CareDocument.findOne({
      _id: docId,
      careCircle: circleId,
      isArchived: false,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found in this Care Circle.",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    const uploaderId = document.uploadedBy?._id || document.uploadedBy?.id || document.uploadedBy;
    const isAuthor = Boolean(uploaderId && uploaderId.toString() === userId.toString());
    const isCaretaker = CARETAKER_ROLES.includes(userRole);

    // If document is PERSONAL, ONLY the uploader can update
    if (document.privacyLevel === DOCUMENT_PRIVACY_LEVELS.PERSONAL) {
      if (!isAuthor) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. Only the uploader can update a Personal document.",
          code: "FORBIDDEN",
        });
      }
    } else if (!isAuthor && !isCaretaker) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only the uploader or circle caretakers can update this document.",
        code: "FORBIDDEN",
      });
    }

    // Validate PERSONAL + Emergency contradiction
    const targetPrivacy = req.body.privacyLevel || document.privacyLevel;
    const targetEmergency =
      req.body.isEmergencyAccessible !== undefined
        ? req.body.isEmergencyAccessible === true ||
          req.body.isEmergencyAccessible === "true"
        : document.isEmergencyAccessible;

    if (
      targetPrivacy === DOCUMENT_PRIVACY_LEVELS.PERSONAL &&
      targetEmergency
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A document with PERSONAL (Uploader-Only) privacy cannot be flagged as Emergency Accessible.",
        code: "INVALID_PRIVACY_COMBINATION",
      });
    }

    const updatableFields = [
      "title",
      "description",
      "category",
      "privacyLevel",
      "fileUrl",
      "fileName",
      "fileType",
      "fileSizeBytes",
      "documentNumber",
      "issuedDate",
      "expiryDate",
      "isEmergencyAccessible",
      "tags",
      "version",
      "isArchived",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "isEmergencyAccessible") {
          document[field] =
            req.body[field] === true || req.body[field] === "true";
        } else {
          document[field] = req.body[field];
        }
      }
    });

    // Record UPDATE audit log
    document.auditLogs.push({
      user: userId,
      action: "UPDATE",
      performedAt: new Date(),
      details: "Document metadata updated",
    });

    await document.save();
    await document.populate("uploadedBy", "name email profilePhoto");

    res.json({
      success: true,
      message: "Document updated successfully.",
      data: {
        document,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Delete document from vault and S3 storage
 * Author or Caretakers (for non-PERSONAL docs).
 * For PERSONAL documents: ONLY author can delete.
 * @route DELETE /api/care-circles/:circleId/documents/:docId
 */
const deleteDocument = async (req, res, next) => {
  try {
    const { circleId, docId } = req.params;
    const userRole = req.circleMembership.role;
    const userId = req.userId;

    const document = await CareDocument.findOne({
      _id: docId,
      careCircle: circleId,
      isArchived: false,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found in this Care Circle.",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    const uploaderId = document.uploadedBy?._id || document.uploadedBy?.id || document.uploadedBy;
    const isAuthor = Boolean(uploaderId && uploaderId.toString() === userId.toString());
    const isCaretaker = CARETAKER_ROLES.includes(userRole);

    // If document is PERSONAL, ONLY the uploader can delete
    if (document.privacyLevel === DOCUMENT_PRIVACY_LEVELS.PERSONAL) {
      if (!isAuthor) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. Only the uploader can delete a Personal document.",
          code: "FORBIDDEN",
        });
      }
    } else if (!isAuthor && !isCaretaker) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only the uploader or circle caretakers can delete this document.",
        code: "FORBIDDEN",
      });
    }

    // If document is stored in S3, delete the S3 object
    if (
      document.storageProvider === STORAGE_PROVIDERS.S3 &&
      document.s3Key
    ) {
      try {
        await deleteFileFromS3({
          bucket: document.s3Bucket || S3_DOCUMENT_BUCKET,
          key: document.s3Key,
        });
      } catch (s3Err) {
        console.warn(
          `Failed to delete S3 object ${document.s3Key}:`,
          s3Err.message
        );
      }
    }

    await document.deleteOne();

    res.json({
      success: true,
      message: "Document deleted successfully.",
      data: {
        documentId: docId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. Get Document Access Audit Logs (Caretakers only, or uploader for PERSONAL)
 * @route GET /api/care-circles/:circleId/documents/:docId/audit-logs
 */
const getDocumentAuditLogs = async (req, res, next) => {
  try {
    const { circleId, docId } = req.params;
    const userRole = req.circleMembership.role;
    const userId = req.userId;

    const document = await CareDocument.findOne({
      _id: docId,
      careCircle: circleId,
    }).populate("auditLogs.user", "name email role");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found in this Care Circle.",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    const uploaderId = document.uploadedBy?._id || document.uploadedBy?.id || document.uploadedBy;
    const isAuthor = Boolean(uploaderId && uploaderId.toString() === userId.toString());
    const isCaretaker = CARETAKER_ROLES.includes(userRole);

    // If PERSONAL document, ONLY the uploader can inspect audit logs
    if (document.privacyLevel === DOCUMENT_PRIVACY_LEVELS.PERSONAL) {
      if (!isAuthor) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. Audit logs for Personal documents are restricted to the uploader.",
          code: "FORBIDDEN",
        });
      }
    } else if (!isCaretaker && !isAuthor) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only caretakers can inspect document audit logs.",
        code: "FORBIDDEN",
      });
    }

    res.json({
      success: true,
      count: document.auditLogs.length,
      data: {
        documentId: docId,
        title: document.title,
        auditLogs: document.auditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocumentFile,
  createDocument,
  getCircleDocuments,
  getEmergencyDocuments,
  getExpiringDocuments,
  getDocumentById,
  getDocumentDownloadUrl,
  updateDocument,
  deleteDocument,
  getDocumentAuditLogs,
};
