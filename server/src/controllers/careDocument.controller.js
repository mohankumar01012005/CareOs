const CareDocument = require("../models/CareDocument");
const {
  CAREOS_ROLES,
  CARETAKER_ROLES,
  DOCUMENT_ACCESS_ROLES_MAP,
  DOCUMENT_PRIVACY_LEVELS,
} = require("../constants/roles");

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
 */
const canUserAccessDocument = (doc, userRole, userId) => {
  if (doc.uploadedBy.toString() === userId.toString()) {
    return true;
  }
  const allowedRoles = DOCUMENT_ACCESS_ROLES_MAP[doc.privacyLevel] || [];
  return allowedRoles.includes(userRole);
};

/**
 * 1. Upload / Create a new document in the vault
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

    const document = new CareDocument({
      careCircle: circleId,
      careRecipient: careRecipientId,
      uploadedBy: req.userId,
      title,
      description: description || null,
      category: category || "OTHER",
      privacyLevel: privacyLevel || DOCUMENT_PRIVACY_LEVELS.CIRCLE_WIDE,
      fileUrl,
      fileName: fileName || null,
      fileType: fileType || "application/octet-stream",
      fileSizeBytes: fileSizeBytes || 0,
      documentNumber: documentNumber || null,
      issuedDate: issuedDate || null,
      expiryDate: expiryDate || null,
      isEmergencyAccessible: Boolean(isEmergencyAccessible),
      tags: Array.isArray(tags) ? tags : [],
      version: version || 1,
      auditLogs: [
        {
          user: req.userId,
          action: "UPDATE",
          performedAt: new Date(),
          details: "Document uploaded to vault",
        },
      ],
    });

    await document.save();
    await document.populate("uploadedBy", "name email profilePhoto");

    res.status(201).json({
      success: true,
      message: "Document uploaded to vault successfully.",
      data: {
        document,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. List documents with role-based privacy filtering, category, search & pagination
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

    const allowedLevels = getAllowedPrivacyLevelsForRole(userRole);

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
      // Must be allowed to view this privacy level
      if (
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
      filter.$and = [
        {
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { documentNumber: searchRegex },
            { tags: searchRegex },
          ],
        },
      ];
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
 * 3. Get Emergency Quick-Access documents (accessible to all circle members in crisis)
 */
const getEmergencyDocuments = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;

    const documents = await CareDocument.find({
      careCircle: circleId,
      isArchived: false,
      $or: [
        { isEmergencyAccessible: true },
        { privacyLevel: DOCUMENT_PRIVACY_LEVELS.EMERGENCY_SOS },
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
 * 4. Get Expiring & Expired Documents Telemetry
 */
const getExpiringDocuments = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const userRole = req.circleMembership.role;
    const userId = req.userId;
    const daysAhead = Number(req.query.days || 30);

    const today = getTodayDateString();
    const cutoffDate = getFutureDateString(daysAhead);

    const allowedLevels = getAllowedPrivacyLevelsForRole(userRole);

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
 * 5. Get single document by ID with role-based privacy check & VIEW audit log
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

    // Role-based privacy check
    if (!canUserAccessDocument(document, userRole, userId)) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You do not have permission to view this document.",
        code: "DOCUMENT_ACCESS_RESTRICTED",
      });
    }

    // Audit log this VIEW access
    document.auditLogs.push({
      user: userId,
      action: "VIEW",
      performedAt: new Date(),
      details: "Viewed document metadata and details",
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
 * 6. Update document metadata (Author or Caretakers only)
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

    const isAuthor = document.uploadedBy.toString() === userId.toString();
    const isCaretaker = CARETAKER_ROLES.includes(userRole);

    if (!isAuthor && !isCaretaker) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only the uploader or circle caretakers can update this document.",
        code: "FORBIDDEN",
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
        document[field] = req.body[field];
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
 * 7. Delete document (Author or Caretakers only)
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

    const isAuthor = document.uploadedBy.toString() === userId.toString();
    const isCaretaker = CARETAKER_ROLES.includes(userRole);

    if (!isAuthor && !isCaretaker) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only the uploader or circle caretakers can delete this document.",
        code: "FORBIDDEN",
      });
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
 * 8. Get Document Access Audit Logs (Caretakers only)
 */
const getDocumentAuditLogs = async (req, res, next) => {
  try {
    const { circleId, docId } = req.params;
    const userRole = req.circleMembership.role;

    if (!CARETAKER_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only caretakers can inspect document audit logs.",
        code: "FORBIDDEN",
      });
    }

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
  createDocument,
  getCircleDocuments,
  getEmergencyDocuments,
  getExpiringDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentAuditLogs,
};
