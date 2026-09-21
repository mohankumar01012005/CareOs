const VitalReading = require("../models/VitalReading");
const SymptomLog = require("../models/SymptomLog");
const ClinicalBaseline = require("../models/ClinicalBaseline");
const Medication = require("../models/Medication");
const DoseLog = require("../models/DoseLog");
const CareNote = require("../models/CareNote");
const {
  CAREOS_ROLES,
  BASELINE_MANAGER_ROLES,
  DEFAULT_CLINICAL_BASELINES,
  VITAL_ALERT_SEVERITIES,
  MEDICATION_STATUS,
  DOSE_STATUS,
} = require("../constants/roles");
const { evaluateVitalDeviation } = require("../utils/vitalDeviation.util");

/**
 * =====================================================================
 * VITALS MANAGEMENT
 * =====================================================================
 */

/**
 * Log a new vital reading with automatic baseline deviation detection.
 * POST /api/care-circles/:circleId/health/vitals
 */
const createVitalReading = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const recipientId = req.careCircle.careRecipient._id || req.careCircle.careRecipient;
    const userId = req.userId;

    const {
      vitalType,
      recordedAt,
      measurements,
      notes,
      deviceSource,
    } = req.body;

    // Fetch recipient baseline (if custom configured)
    const baseline = await ClinicalBaseline.findOne({
      careCircle: circleId,
      careRecipient: recipientId,
    });

    // Evaluate normality and severity against baseline
    const { isAbnormal, alertSeverity, abnormalReasons } = evaluateVitalDeviation(
      vitalType,
      measurements,
      baseline
    );

    const vitalReading = await VitalReading.create({
      careCircle: circleId,
      careRecipient: recipientId,
      recordedBy: userId,
      vitalType,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      measurements,
      isAbnormal,
      alertSeverity,
      abnormalReasons,
      notes: notes || null,
      deviceSource: deviceSource || "manual",
    });

    await vitalReading.populate("recordedBy", "name email fullName");

    return res.status(201).json({
      success: true,
      message: isAbnormal
        ? `Vital reading logged with ${alertSeverity} alert.`
        : "Vital reading logged successfully.",
      vitalReading,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List vital readings with filters and pagination.
 * GET /api/care-circles/:circleId/health/vitals
 */
const getVitalReadings = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const {
      vitalType,
      isAbnormal,
      alertSeverity,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      careCircle: circleId,
      isArchived: false,
    };

    if (vitalType) {
      query.vitalType = vitalType;
    }

    if (isAbnormal !== undefined) {
      query.isAbnormal = isAbnormal === "true" || isAbnormal === true;
    }

    if (alertSeverity) {
      query.alertSeverity = alertSeverity;
    }

    if (startDate || endDate) {
      query.recordedAt = {};
      if (startDate) query.recordedAt.$gte = new Date(startDate);
      if (endDate) query.recordedAt.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [vitalReadings, total] = await Promise.all([
      VitalReading.find(query)
        .populate("recordedBy", "name email fullName")
        .sort({ recordedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      VitalReading.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: vitalReadings.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      vitalReadings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve single vital reading by ID.
 * GET /api/care-circles/:circleId/health/vitals/:vitalId
 */
const getVitalReadingById = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const { vitalId } = req.params;

    const vitalReading = await VitalReading.findOne({
      _id: vitalId,
      careCircle: circleId,
      isArchived: false,
    }).populate("recordedBy", "name email fullName");

    if (!vitalReading) {
      return res.status(404).json({
        success: false,
        message: "Vital reading not found.",
        code: "VITAL_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      vitalReading,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update vital reading. Restricted to author or Caretakers / Doctor.
 * PATCH /api/care-circles/:circleId/health/vitals/:vitalId
 */
const updateVitalReading = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const recipientId = req.careCircle.careRecipient._id || req.careCircle.careRecipient;
    const { vitalId } = req.params;
    const userId = req.userId;
    const userRole = req.userCircleRole;

    const vital = await VitalReading.findOne({
      _id: vitalId,
      careCircle: circleId,
      isArchived: false,
    });

    if (!vital) {
      return res.status(404).json({
        success: false,
        message: "Vital reading not found.",
        code: "VITAL_NOT_FOUND",
      });
    }

    // Auth check: Author or Manager (Main Caretaker, Sub Caretaker, Doctor)
    const isAuthor = vital.recordedBy.toString() === userId.toString();
    const isManager = BASELINE_MANAGER_ROLES.includes(userRole);

    if (!isAuthor && !isManager) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the author or Caretakers/Doctor can modify this vital reading.",
        code: "FORBIDDEN",
      });
    }

    const { measurements, notes, recordedAt } = req.body;

    if (measurements) {
      vital.measurements = {
        ...vital.measurements.toObject(),
        ...measurements,
      };

      // Re-evaluate deviation with updated measurements
      const baseline = await ClinicalBaseline.findOne({
        careCircle: circleId,
        careRecipient: recipientId,
      });

      const { isAbnormal, alertSeverity, abnormalReasons } = evaluateVitalDeviation(
        vital.vitalType,
        vital.measurements,
        baseline
      );

      vital.isAbnormal = isAbnormal;
      vital.alertSeverity = alertSeverity;
      vital.abnormalReasons = abnormalReasons;
    }

    if (notes !== undefined) vital.notes = notes;
    if (recordedAt) vital.recordedAt = new Date(recordedAt);

    await vital.save();
    await vital.populate("recordedBy", "name email fullName");

    return res.status(200).json({
      success: true,
      message: "Vital reading updated successfully.",
      vitalReading: vital,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete vital reading. Restricted to author or Caretakers / Doctor.
 * DELETE /api/care-circles/:circleId/health/vitals/:vitalId
 */
const deleteVitalReading = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const { vitalId } = req.params;
    const userId = req.userId;
    const userRole = req.userCircleRole;

    const vital = await VitalReading.findOne({
      _id: vitalId,
      careCircle: circleId,
      isArchived: false,
    });

    if (!vital) {
      return res.status(404).json({
        success: false,
        message: "Vital reading not found.",
        code: "VITAL_NOT_FOUND",
      });
    }

    const isAuthor = vital.recordedBy.toString() === userId.toString();
    const isManager = BASELINE_MANAGER_ROLES.includes(userRole);

    if (!isAuthor && !isManager) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the author or Caretakers/Doctor can delete this vital reading.",
        code: "FORBIDDEN",
      });
    }

    await VitalReading.deleteOne({ _id: vitalId });

    return res.status(200).json({
      success: true,
      message: "Vital reading deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get abnormal vital reading alerts.
 * GET /api/care-circles/:circleId/health/vitals/alerts
 */
const getAbnormalVitals = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const { severity, limit = 50 } = req.query;

    const query = {
      careCircle: circleId,
      isAbnormal: true,
      isArchived: false,
    };

    if (severity) {
      query.alertSeverity = severity;
    }

    const alerts = await VitalReading.find(query)
      .populate("recordedBy", "name email fullName")
      .sort({ recordedAt: -1 })
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Aggregated Time-Series Trends for Vitals.
 * GET /api/care-circles/:circleId/health/vitals/trends
 */
const getVitalsTrends = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const { vitalType, days = 30 } = req.query;

    if (!vitalType) {
      return res.status(400).json({
        success: false,
        message: "vitalType query parameter is required for trends analysis.",
        code: "VITAL_TYPE_REQUIRED",
      });
    }

    const daysNum = Math.max(1, parseInt(days, 10));
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    const readings = await VitalReading.find({
      careCircle: circleId,
      vitalType,
      isArchived: false,
      recordedAt: { $gte: cutoffDate },
    })
      .sort({ recordedAt: 1 })
      .lean();

    const totalReadings = readings.length;
    const abnormalCount = readings.filter((r) => r.isAbnormal).length;
    const criticalCount = readings.filter(
      (r) => r.alertSeverity === VITAL_ALERT_SEVERITIES.CRITICAL
    ).length;

    let summary = {
      totalReadings,
      abnormalCount,
      criticalCount,
    };

    if (totalReadings > 0) {
      if (vitalType === "BLOOD_PRESSURE") {
        const systolics = readings
          .map((r) => r.measurements?.systolic)
          .filter((v) => typeof v === "number");
        const diastolics = readings
          .map((r) => r.measurements?.diastolic)
          .filter((v) => typeof v === "number");
        const pulses = readings
          .map((r) => r.measurements?.pulse)
          .filter((v) => typeof v === "number");

        summary.systolic = {
          min: systolics.length ? Math.min(...systolics) : null,
          max: systolics.length ? Math.max(...systolics) : null,
          avg: systolics.length
            ? Math.round(systolics.reduce((a, b) => a + b, 0) / systolics.length)
            : null,
        };
        summary.diastolic = {
          min: diastolics.length ? Math.min(...diastolics) : null,
          max: diastolics.length ? Math.max(...diastolics) : null,
          avg: diastolics.length
            ? Math.round(diastolics.reduce((a, b) => a + b, 0) / diastolics.length)
            : null,
        };
        if (pulses.length > 0) {
          summary.pulse = {
            min: Math.min(...pulses),
            max: Math.max(...pulses),
            avg: Math.round(pulses.reduce((a, b) => a + b, 0) / pulses.length),
          };
        }
      } else if (vitalType === "BLOOD_SUGAR") {
        const sugars = readings
          .map((r) => r.measurements?.sugarLevel)
          .filter((v) => typeof v === "number");
        const fastingSugars = readings
          .filter(
            (r) =>
              r.measurements?.mealContext === "FASTING" &&
              typeof r.measurements?.sugarLevel === "number"
          )
          .map((r) => r.measurements.sugarLevel);
        const postPrandialSugars = readings
          .filter(
            (r) =>
              r.measurements?.mealContext === "POST_PRANDIAL" &&
              typeof r.measurements?.sugarLevel === "number"
          )
          .map((r) => r.measurements.sugarLevel);

        summary.sugarLevel = {
          min: sugars.length ? Math.min(...sugars) : null,
          max: sugars.length ? Math.max(...sugars) : null,
          avg: sugars.length
            ? Math.round(sugars.reduce((a, b) => a + b, 0) / sugars.length)
            : null,
        };
        if (fastingSugars.length) {
          summary.fasting = {
            min: Math.min(...fastingSugars),
            max: Math.max(...fastingSugars),
            avg: Math.round(
              fastingSugars.reduce((a, b) => a + b, 0) / fastingSugars.length
            ),
          };
        }
        if (postPrandialSugars.length) {
          summary.postPrandial = {
            min: Math.min(...postPrandialSugars),
            max: Math.max(...postPrandialSugars),
            avg: Math.round(
              postPrandialSugars.reduce((a, b) => a + b, 0) /
                postPrandialSugars.length
            ),
          };
        }
      } else if (vitalType === "HEART_RATE") {
        const bpms = readings
          .map((r) => r.measurements?.bpm)
          .filter((v) => typeof v === "number");
        summary.bpm = {
          min: bpms.length ? Math.min(...bpms) : null,
          max: bpms.length ? Math.max(...bpms) : null,
          avg: bpms.length
            ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length)
            : null,
        };
      } else if (vitalType === "OXYGEN_SATURATION") {
        const spO2s = readings
          .map((r) => r.measurements?.spO2)
          .filter((v) => typeof v === "number");
        summary.spO2 = {
          min: spO2s.length ? Math.min(...spO2s) : null,
          max: spO2s.length ? Math.max(...spO2s) : null,
          avg: spO2s.length
            ? +(spO2s.reduce((a, b) => a + b, 0) / spO2s.length).toFixed(1)
            : null,
        };
      } else if (vitalType === "TEMPERATURE") {
        const temps = readings
          .map((r) => r.measurements?.temperature)
          .filter((v) => typeof v === "number");
        summary.temperature = {
          min: temps.length ? Math.min(...temps) : null,
          max: temps.length ? Math.max(...temps) : null,
          avg: temps.length
            ? +(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
            : null,
        };
      } else if (vitalType === "WEIGHT") {
        const weights = readings
          .map((r) => r.measurements?.weight)
          .filter((v) => typeof v === "number");
        summary.weight = {
          min: weights.length ? Math.min(...weights) : null,
          max: weights.length ? Math.max(...weights) : null,
          avg: weights.length
            ? +(weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1)
            : null,
          latest: weights.length ? weights[weights.length - 1] : null,
          first: weights.length ? weights[0] : null,
          delta:
            weights.length >= 2
              ? +(weights[weights.length - 1] - weights[0]).toFixed(1)
              : 0,
        };
      } else if (vitalType === "RESPIRATORY_RATE") {
        const rates = readings
          .map((r) => r.measurements?.respiratoryRate)
          .filter((v) => typeof v === "number");
        summary.respiratoryRate = {
          min: rates.length ? Math.min(...rates) : null,
          max: rates.length ? Math.max(...rates) : null,
          avg: rates.length
            ? +(rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1)
            : null,
        };
      }
    }

    const dataPoints = readings.map((r) => ({
      id: r._id,
      recordedAt: r.recordedAt,
      measurements: r.measurements,
      isAbnormal: r.isAbnormal,
      alertSeverity: r.alertSeverity,
      abnormalReasons: r.abnormalReasons,
    }));

    return res.status(200).json({
      success: true,
      vitalType,
      timeframeDays: daysNum,
      summary,
      dataPoints,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * =====================================================================
 * SYMPTOM LOGGING
 * =====================================================================
 */

/**
 * Log a new symptom.
 * POST /api/care-circles/:circleId/health/symptoms
 */
const createSymptomLog = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const recipientId = req.careCircle.careRecipient._id || req.careCircle.careRecipient;
    const userId = req.userId;

    const {
      symptomCategory,
      symptomName,
      severity,
      severityScore,
      onsetTime,
      durationHours,
      isOngoing,
      bodyLocation,
      triggers,
      notes,
    } = req.body;

    const symptomLog = await SymptomLog.create({
      careCircle: circleId,
      careRecipient: recipientId,
      recordedBy: userId,
      symptomCategory,
      symptomName,
      severity: severity || undefined,
      severityScore: severityScore !== undefined ? severityScore : null,
      onsetTime: onsetTime ? new Date(onsetTime) : new Date(),
      durationHours: durationHours !== undefined ? durationHours : null,
      isOngoing: isOngoing !== undefined ? isOngoing : true,
      bodyLocation: bodyLocation || null,
      triggers: Array.isArray(triggers) ? triggers : [],
      notes: notes || null,
    });

    await symptomLog.populate("recordedBy", "name email fullName");

    return res.status(201).json({
      success: true,
      message: "Symptom logged successfully.",
      symptomLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List symptoms with filters and pagination.
 * GET /api/care-circles/:circleId/health/symptoms
 */
const getSymptomLogs = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const {
      category,
      severity,
      isOngoing,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      careCircle: circleId,
      isArchived: false,
    };

    if (category) {
      query.symptomCategory = category;
    }

    if (severity) {
      query.severity = severity;
    }

    if (isOngoing !== undefined) {
      query.isOngoing = isOngoing === "true" || isOngoing === true;
    }

    if (startDate || endDate) {
      query.onsetTime = {};
      if (startDate) query.onsetTime.$gte = new Date(startDate);
      if (endDate) query.onsetTime.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [symptomLogs, total] = await Promise.all([
      SymptomLog.find(query)
        .populate("recordedBy", "name email fullName")
        .sort({ onsetTime: -1 })
        .skip(skip)
        .limit(limitNum),
      SymptomLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: symptomLogs.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      symptomLogs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve single symptom log by ID.
 * GET /api/care-circles/:circleId/health/symptoms/:symptomId
 */
const getSymptomLogById = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const { symptomId } = req.params;

    const symptomLog = await SymptomLog.findOne({
      _id: symptomId,
      careCircle: circleId,
      isArchived: false,
    }).populate("recordedBy", "name email fullName");

    if (!symptomLog) {
      return res.status(404).json({
        success: false,
        message: "Symptom log not found.",
        code: "SYMPTOM_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      symptomLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update symptom log. Restricted to author or Caretakers / Doctor.
 * PATCH /api/care-circles/:circleId/health/symptoms/:symptomId
 */
const updateSymptomLog = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const { symptomId } = req.params;
    const userId = req.userId;
    const userRole = req.userCircleRole;

    const symptom = await SymptomLog.findOne({
      _id: symptomId,
      careCircle: circleId,
      isArchived: false,
    });

    if (!symptom) {
      return res.status(404).json({
        success: false,
        message: "Symptom log not found.",
        code: "SYMPTOM_NOT_FOUND",
      });
    }

    const isAuthor = symptom.recordedBy.toString() === userId.toString();
    const isManager = BASELINE_MANAGER_ROLES.includes(userRole);

    if (!isAuthor && !isManager) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the author or Caretakers/Doctor can modify this symptom log.",
        code: "FORBIDDEN",
      });
    }

    const {
      symptomCategory,
      symptomName,
      severity,
      severityScore,
      durationHours,
      isOngoing,
      bodyLocation,
      triggers,
      notes,
    } = req.body;

    if (symptomCategory) symptom.symptomCategory = symptomCategory;
    if (symptomName) symptom.symptomName = symptomName;
    if (severity) symptom.severity = severity;
    if (severityScore !== undefined) symptom.severityScore = severityScore;
    if (durationHours !== undefined) symptom.durationHours = durationHours;
    if (isOngoing !== undefined) symptom.isOngoing = isOngoing;
    if (bodyLocation !== undefined) symptom.bodyLocation = bodyLocation;
    if (triggers !== undefined) symptom.triggers = triggers;
    if (notes !== undefined) symptom.notes = notes;

    await symptom.save();
    await symptom.populate("recordedBy", "name email fullName");

    return res.status(200).json({
      success: true,
      message: "Symptom log updated successfully.",
      symptomLog: symptom,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete symptom log. Restricted to author or Caretakers / Doctor.
 * DELETE /api/care-circles/:circleId/health/symptoms/:symptomId
 */
const deleteSymptomLog = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const { symptomId } = req.params;
    const userId = req.userId;
    const userRole = req.userCircleRole;

    const symptom = await SymptomLog.findOne({
      _id: symptomId,
      careCircle: circleId,
      isArchived: false,
    });

    if (!symptom) {
      return res.status(404).json({
        success: false,
        message: "Symptom log not found.",
        code: "SYMPTOM_NOT_FOUND",
      });
    }

    const isAuthor = symptom.recordedBy.toString() === userId.toString();
    const isManager = BASELINE_MANAGER_ROLES.includes(userRole);

    if (!isAuthor && !isManager) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the author or Caretakers/Doctor can delete this symptom log.",
        code: "FORBIDDEN",
      });
    }

    await SymptomLog.deleteOne({ _id: symptomId });

    return res.status(200).json({
      success: true,
      message: "Symptom log deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * =====================================================================
 * CLINICAL BASELINE CONFIGURATION
 * =====================================================================
 */

/**
 * Get active clinical baseline for care recipient.
 * GET /api/care-circles/:circleId/health/baseline
 */
const getClinicalBaseline = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const recipientId = req.careCircle.careRecipient._id || req.careCircle.careRecipient;

    const baseline = await ClinicalBaseline.findOne({
      careCircle: circleId,
      careRecipient: recipientId,
    }).populate("configuredBy", "name email fullName");

    if (!baseline) {
      return res.status(200).json({
        success: true,
        isDefault: true,
        baseline: {
          careCircle: circleId,
          careRecipient: recipientId,
          ...DEFAULT_CLINICAL_BASELINES,
        },
      });
    }

    return res.status(200).json({
      success: true,
      isDefault: false,
      baseline,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Configure or update clinical baseline for care recipient.
 * Restricted strictly to MAIN_CARETAKER, SUB_CARETAKER, PAID_DOCTOR.
 * PUT /api/care-circles/:circleId/health/baseline
 */
const upsertClinicalBaseline = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const recipientId = req.careCircle.careRecipient._id || req.careCircle.careRecipient;
    const userId = req.userId;
    const userRole = req.userCircleRole;

    // RBAC: Only Main/Sub Caretakers and Doctors can configure clinical baselines
    if (!BASELINE_MANAGER_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Caretakers and Doctors can configure clinical baselines.",
        code: "FORBIDDEN",
      });
    }

    const {
      bpSystolicMin,
      bpSystolicMax,
      bpDiastolicMin,
      bpDiastolicMax,
      heartRateMin,
      heartRateMax,
      bloodSugarFastingMin,
      bloodSugarFastingMax,
      bloodSugarPostPrandialMin,
      bloodSugarPostPrandialMax,
      spO2Min,
      temperatureMin,
      temperatureMax,
      respiratoryRateMin,
      respiratoryRateMax,
      criticalOverrides,
      notes,
    } = req.body;

    let baseline = await ClinicalBaseline.findOne({
      careCircle: circleId,
      careRecipient: recipientId,
    });

    if (!baseline) {
      baseline = new ClinicalBaseline({
        careCircle: circleId,
        careRecipient: recipientId,
        configuredBy: userId,
      });
    } else {
      baseline.configuredBy = userId;
    }

    if (bpSystolicMin !== undefined) baseline.bpSystolicMin = bpSystolicMin;
    if (bpSystolicMax !== undefined) baseline.bpSystolicMax = bpSystolicMax;
    if (bpDiastolicMin !== undefined) baseline.bpDiastolicMin = bpDiastolicMin;
    if (bpDiastolicMax !== undefined) baseline.bpDiastolicMax = bpDiastolicMax;
    if (heartRateMin !== undefined) baseline.heartRateMin = heartRateMin;
    if (heartRateMax !== undefined) baseline.heartRateMax = heartRateMax;
    if (bloodSugarFastingMin !== undefined) baseline.bloodSugarFastingMin = bloodSugarFastingMin;
    if (bloodSugarFastingMax !== undefined) baseline.bloodSugarFastingMax = bloodSugarFastingMax;
    if (bloodSugarPostPrandialMin !== undefined) baseline.bloodSugarPostPrandialMin = bloodSugarPostPrandialMin;
    if (bloodSugarPostPrandialMax !== undefined) baseline.bloodSugarPostPrandialMax = bloodSugarPostPrandialMax;
    if (spO2Min !== undefined) baseline.spO2Min = spO2Min;
    if (temperatureMin !== undefined) baseline.temperatureMin = temperatureMin;
    if (temperatureMax !== undefined) baseline.temperatureMax = temperatureMax;
    if (respiratoryRateMin !== undefined) baseline.respiratoryRateMin = respiratoryRateMin;
    if (respiratoryRateMax !== undefined) baseline.respiratoryRateMax = respiratoryRateMax;

    if (criticalOverrides && typeof criticalOverrides === "object") {
      baseline.criticalOverrides = {
        ...baseline.criticalOverrides.toObject(),
        ...criticalOverrides,
      };
    }

    if (notes !== undefined) baseline.notes = notes;

    await baseline.save();
    await baseline.populate("configuredBy", "name email fullName");

    return res.status(200).json({
      success: true,
      message: "Clinical baseline updated successfully.",
      baseline,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * =====================================================================
 * DOCTOR'S BRIEF & CLINICAL SNAPSHOT
 * =====================================================================
 */

/**
 * Generates a comprehensive clinical dossier for doctor consultation.
 * GET /api/care-circles/:circleId/health/doctors-brief
 */
const getDoctorsBrief = async (req, res, next) => {
  try {
    const circleId = req.careCircle._id;
    const recipient = req.careCircle.careRecipient;
    const { days = 30 } = req.query;

    const daysNum = Math.max(1, parseInt(days, 10));
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    // Parallel retrieval of vitals, symptoms, medications, dose logs, and handover notes
    const [
      vitals,
      abnormalAlerts,
      activeSymptoms,
      recentSymptoms,
      medications,
      doseLogs,
      recentNotes,
      baseline,
    ] = await Promise.all([
      // Vitals in window
      VitalReading.find({
        careCircle: circleId,
        isArchived: false,
        recordedAt: { $gte: cutoffDate },
      })
        .sort({ recordedAt: -1 })
        .lean(),

      // Critical and Warning alerts in window
      VitalReading.find({
        careCircle: circleId,
        isAbnormal: true,
        isArchived: false,
        recordedAt: { $gte: cutoffDate },
      })
        .sort({ recordedAt: -1 })
        .limit(20)
        .lean(),

      // Ongoing symptoms
      SymptomLog.find({
        careCircle: circleId,
        isOngoing: true,
        isArchived: false,
      })
        .sort({ onsetTime: -1 })
        .lean(),

      // Recent symptoms in window
      SymptomLog.find({
        careCircle: circleId,
        isArchived: false,
        onsetTime: { $gte: cutoffDate },
      })
        .sort({ onsetTime: -1 })
        .lean(),

      // Active Medications
      Medication.find({
        careCircle: circleId,
        status: MEDICATION_STATUS.ACTIVE,
      }).lean(),


      // Dose logs in window for adherence calculation
      DoseLog.find({
        careCircle: circleId,
        scheduledDate: { $gte: cutoffDate.toISOString().split("T")[0] },
      }).lean(),

      // Handover/Clinical notes in window
      CareNote.find({
        careCircle: circleId,
        isArchived: false,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("author", "name fullName")
        .lean(),

      // Baseline
      ClinicalBaseline.findOne({
        careCircle: circleId,
        careRecipient: recipient._id || recipient,
      }).lean(),
    ]);

    // Calculate medication adherence
    const totalDoses = doseLogs.length;
    const takenDoses = doseLogs.filter((d) => d.status === DOSE_STATUS.TAKEN).length;
    const skippedDoses = doseLogs.filter((d) => d.status === DOSE_STATUS.SKIPPED).length;
    const missedDoses = doseLogs.filter((d) => d.status === DOSE_STATUS.MISSED).length;
    const adherenceRate = totalDoses > 0 ? +((takenDoses / totalDoses) * 100).toFixed(1) : 100;

    // Vitals summary metrics by type
    const vitalSummary = {};
    const vitalTypes = [
      "BLOOD_PRESSURE",
      "BLOOD_SUGAR",
      "HEART_RATE",
      "OXYGEN_SATURATION",
      "TEMPERATURE",
      "WEIGHT",
      "RESPIRATORY_RATE",
    ];

    vitalTypes.forEach((type) => {
      const typeReadings = vitals.filter((v) => v.vitalType === type);
      if (typeReadings.length > 0) {
        vitalSummary[type] = {
          count: typeReadings.length,
          latest: typeReadings[0].measurements,
          latestRecordedAt: typeReadings[0].recordedAt,
          abnormalCount: typeReadings.filter((v) => v.isAbnormal).length,
        };
      }
    });

    const doctorsBrief = {
      generatedAt: new Date(),
      timeframeDays: daysNum,
      careRecipient: {
        id: recipient._id || recipient,
        fullName: recipient.fullName,
        dateOfBirth: recipient.dateOfBirth,
        gender: recipient.gender,
        bloodGroup: recipient.bloodGroup,
        knownConditions: recipient.knownConditions || [],
        allergies: recipient.allergies || [],
        emergencyContact: recipient.emergencyContact,
      },
      baseline: baseline || { isDefault: true, ...DEFAULT_CLINICAL_BASELINES },
      vitalSummary,
      abnormalAlerts: abnormalAlerts.map((a) => ({
        id: a._id,
        vitalType: a.vitalType,
        recordedAt: a.recordedAt,
        measurements: a.measurements,
        alertSeverity: a.alertSeverity,
        abnormalReasons: a.abnormalReasons,
      })),
      symptoms: {
        activeCount: activeSymptoms.length,
        active: activeSymptoms.map((s) => ({
          id: s._id,
          symptomCategory: s.symptomCategory,
          symptomName: s.symptomName,
          severity: s.severity,
          severityScore: s.severityScore,
          onsetTime: s.onsetTime,
          bodyLocation: s.bodyLocation,
          notes: s.notes,
        })),
        recentTotalInWindow: recentSymptoms.length,
      },
      medications: {
        activeCount: medications.length,
        adherenceRate: `${adherenceRate}%`,
        doseMetrics: {
          totalScheduled: totalDoses,
          taken: takenDoses,
          skipped: skippedDoses,
          missed: missedDoses,
        },
        list: medications.map((m) => ({
          id: m._id,
          name: m.name,
          dosage: m.dosage,
          form: m.form,
          frequency: m.frequency,
          foodTiming: m.foodTiming,
          currentStock: m.stock?.currentQuantity ?? m.currentStock ?? 0,
        })),

      },
      recentHandoverObservations: recentNotes.slice(0, 5).map((n) => ({
        id: n._id,
        category: n.category,
        urgency: n.urgency,
        noteDate: n.noteDate,
        title: n.title,
        content: n.content,
        authorName: n.author?.name || n.author?.fullName || "Caregiver",
      })),
    };

    return res.status(200).json({
      success: true,
      timeframeDays: daysNum,
      doctorsBrief,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVitalReading,
  getVitalReadings,
  getVitalReadingById,
  updateVitalReading,
  deleteVitalReading,
  getAbnormalVitals,
  getVitalsTrends,
  createSymptomLog,
  getSymptomLogs,
  getSymptomLogById,
  updateSymptomLog,
  deleteSymptomLog,
  getClinicalBaseline,
  upsertClinicalBaseline,
  getDoctorsBrief,
};
