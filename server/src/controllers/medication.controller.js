const Medication = require("../models/Medication");
const DoseLog = require("../models/DoseLog");
const {
  MEDICATION_STATUS,
  DOSE_STATUS,
  TIME_SLOTS,
} = require("../constants/roles");

/**
 * Helper to get current date in YYYY-MM-DD
 */
const getTodayDateString = () => {
  return new Date().toISOString().split("T")[0];
};

/**
 * 1. Create a new medication
 */
const createMedication = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const careRecipientId =
      req.careCircle.careRecipient._id || req.careCircle.careRecipient;

    const {
      name,
      genericName,
      dosage,
      form,
      formDetails,
      frequency,
      schedule,
      instructions,
      foodTiming,
      prescribedBy,
      startDate,
      endDate,
      stock,
      safetyProtocols,
    } = req.body;

    const medication = new Medication({
      careCircle: circleId,
      careRecipient: careRecipientId,
      name,
      genericName,
      dosage,
      form,
      formDetails,
      frequency,
      schedule: schedule && schedule.length > 0 ? schedule : undefined,
      instructions,
      foodTiming,
      prescribedBy,
      startDate: startDate || Date.now(),
      endDate: endDate || null,
      status: MEDICATION_STATUS.ACTIVE,
      stock: stock || undefined,
      safetyProtocols: safetyProtocols || [],
      createdBy: req.userId,
    });

    await medication.save();

    res.status(201).json({
      success: true,
      message: "Medication created successfully.",
      data: {
        medication,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get all medications for a Care Circle
 */
const getCircleMedications = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const { status, search } = req.query;

    const filter = { careCircle: circleId };

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const medications = await Medication.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: medications.length,
      data: {
        medications,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get single medication dossier by ID
 */
const getMedicationById = async (req, res, next) => {
  try {
    const { circleId, medicationId } = req.params;

    const medication = await Medication.findOne({
      _id: medicationId,
      careCircle: circleId,
    }).populate("createdBy", "name email");

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: "Medication not found in this Care Circle.",
        code: "MEDICATION_NOT_FOUND",
      });
    }

    // Fetch recent 10 dose logs
    const recentDoses = await DoseLog.find({
      medication: medicationId,
      careCircle: circleId,
    })
      .populate("administeredBy", "name email")
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate daily required quantity
    const dailyDoseCount =
      medication.schedule && medication.schedule.length > 0
        ? medication.schedule.reduce(
            (sum, item) => sum + (item.doseQuantity || 1),
            0
          )
        : 1;

    const currentStock = medication.stock ? medication.stock.currentQuantity : 0;
    const daysRemaining =
      dailyDoseCount > 0 ? Math.floor(currentStock / dailyDoseCount) : 0;
    const isLowStock = medication.stock
      ? currentStock <= (medication.stock.lowStockThreshold || 10)
      : false;

    res.json({
      success: true,
      data: {
        medication,
        recentDoses,
        telemetry: {
          dailyDoseCount,
          daysRemaining,
          isLowStock,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update medication details
 */
const updateMedication = async (req, res, next) => {
  try {
    const { circleId, medicationId } = req.params;

    const medication = await Medication.findOne({
      _id: medicationId,
      careCircle: circleId,
    });

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: "Medication not found in this Care Circle.",
        code: "MEDICATION_NOT_FOUND",
      });
    }

    const updatableFields = [
      "name",
      "genericName",
      "dosage",
      "form",
      "formDetails",
      "frequency",
      "schedule",
      "instructions",
      "foodTiming",
      "prescribedBy",
      "startDate",
      "endDate",
      "status",
      "stock",
      "safetyProtocols",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "stock" && typeof req.body.stock === "object") {
          medication.stock = {
            ...medication.stock.toObject(),
            ...req.body.stock,
          };
        } else {
          medication[field] = req.body[field];
        }
      }
    });

    await medication.save();

    res.json({
      success: true,
      message: "Medication updated successfully.",
      data: {
        medication,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Discontinue / delete medication
 */
const deleteMedication = async (req, res, next) => {
  try {
    const { circleId, medicationId } = req.params;

    const medication = await Medication.findOne({
      _id: medicationId,
      careCircle: circleId,
    });

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: "Medication not found in this Care Circle.",
        code: "MEDICATION_NOT_FOUND",
      });
    }

    medication.status = MEDICATION_STATUS.DISCONTINUED;
    await medication.save();

    res.json({
      success: true,
      message: "Medication marked as discontinued successfully.",
      data: {
        medication,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Record dose administration (TAKEN / SKIPPED / MISSED)
 */
const recordDose = async (req, res, next) => {
  try {
    const { circleId, medicationId } = req.params;
    const {
      slot,
      scheduledDate,
      status = DOSE_STATUS.TAKEN,
      scheduledTime,
      administeredAt,
      quantityTaken,
      notes,
      skipReason,
    } = req.body;

    const medication = await Medication.findOne({
      _id: medicationId,
      careCircle: circleId,
    });

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: "Medication not found in this Care Circle.",
        code: "MEDICATION_NOT_FOUND",
      });
    }

    const targetDate = scheduledDate || getTodayDateString();

    // Prevent duplicate logs for fixed slots on the same day
    if (slot !== "as_needed") {
      const existingLog = await DoseLog.findOne({
        medication: medicationId,
        scheduledDate: targetDate,
        slot,
      });

      if (existingLog) {
        return res.status(409).json({
          success: false,
          message: `A dose record already exists for the ${slot} slot on ${targetDate}.`,
          code: "DOSE_ALREADY_LOGGED",
          data: {
            existingLog,
          },
        });
      }
    }

    const careRecipientId =
      medication.careRecipient ||
      req.careCircle.careRecipient._id ||
      req.careCircle.careRecipient;

    // Determine quantity to deduct from stock
    const qty = quantityTaken !== undefined ? Number(quantityTaken) : 1;
    let stockDeducted = false;

    if (status === DOSE_STATUS.TAKEN && medication.stock && medication.stock.tracked) {
      medication.stock.currentQuantity = Math.max(
        0,
        medication.stock.currentQuantity - qty
      );
      await medication.save();
      stockDeducted = true;
    }

    // Auto-resolve scheduled time from medication schedule if omitted
    let finalScheduledTime = scheduledTime;
    if (!finalScheduledTime && medication.schedule) {
      const matchedSlot = medication.schedule.find((s) => s.slot === slot);
      if (matchedSlot) finalScheduledTime = matchedSlot.time;
    }

    const doseLog = new DoseLog({
      careCircle: circleId,
      careRecipient: careRecipientId,
      medication: medicationId,
      scheduledDate: targetDate,
      slot,
      scheduledTime: finalScheduledTime || null,
      status,
      administeredBy: req.userId,
      administeredAt: administeredAt || new Date(),
      quantityTaken: qty,
      notes: notes || null,
      skipReason: skipReason || null,
      stockDeducted,
    });

    await doseLog.save();
    await doseLog.populate("administeredBy", "name email");
    await doseLog.populate("medication", "name dosage form");

    res.status(201).json({
      success: true,
      message: `Dose recorded as ${status} successfully.`,
      data: {
        doseLog,
        stockRemaining: medication.stock ? medication.stock.currentQuantity : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Get today's daily schedule & timeline
 */
const getTodaySchedule = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const targetDate = req.query.date || getTodayDateString();

    // Retrieve all active medications for this Care Circle
    const activeMedications = await Medication.find({
      careCircle: circleId,
      status: MEDICATION_STATUS.ACTIVE,
    });

    // Retrieve all logged doses for the requested date
    const dayLogs = await DoseLog.find({
      careCircle: circleId,
      scheduledDate: targetDate,
    }).populate("administeredBy", "name email");

    // Map of logs: `${medicationId}_${slot}` -> DoseLog
    const logMap = new Map();
    dayLogs.forEach((log) => {
      const key = `${log.medication.toString()}_${log.slot}`;
      logMap.set(key, log);
    });

    const timeline = {
      morning: { slot: "morning", label: "Morning", scheduledTime: "08:00", items: [], status: "PENDING" },
      afternoon: { slot: "afternoon", label: "Afternoon", scheduledTime: "14:00", items: [], status: "PENDING" },
      evening: { slot: "evening", label: "Evening", scheduledTime: "18:00", items: [], status: "PENDING" },
      night: { slot: "night", label: "Night", scheduledTime: "20:30", items: [], status: "PENDING" },
      as_needed: { slot: "as_needed", label: "As Needed", scheduledTime: null, items: [], status: "PENDING" },
    };

    let totalScheduledCount = 0;
    let totalCompletedCount = 0;
    let totalSkippedCount = 0;

    activeMedications.forEach((med) => {
      const schedules = med.schedule && med.schedule.length > 0
        ? med.schedule
        : [{ slot: "morning", time: "08:00", doseQuantity: 1, instructions: med.instructions }];

      schedules.forEach((sch) => {
        const slotKey = sch.slot || "morning";
        if (!timeline[slotKey]) return;

        totalScheduledCount += 1;
        const key = `${med._id.toString()}_${slotKey}`;
        const existingLog = logMap.get(key);

        const item = {
          medicationId: med._id,
          name: med.name,
          genericName: med.genericName,
          dosage: med.dosage,
          form: med.form,
          formDetails: med.formDetails,
          doseQuantity: sch.doseQuantity || 1,
          scheduledTime: sch.time || timeline[slotKey].scheduledTime,
          instructions: sch.instructions || med.instructions,
          foodTiming: med.foodTiming,
          safetyProtocols: med.safetyProtocols,
          stockRemaining: med.stock ? med.stock.currentQuantity : null,
          isLogged: !!existingLog,
          logStatus: existingLog ? existingLog.status : "PENDING",
          doseLog: existingLog || null,
        };

        if (existingLog) {
          if (existingLog.status === DOSE_STATUS.TAKEN) {
            totalCompletedCount += 1;
          } else if (existingLog.status === DOSE_STATUS.SKIPPED) {
            totalSkippedCount += 1;
          }
        }

        timeline[slotKey].items.push(item);
      });
    });

    // Evaluate slot aggregate statuses
    Object.keys(timeline).forEach((slotKey) => {
      const slotObj = timeline[slotKey];
      if (slotObj.items.length === 0) {
        slotObj.status = "EMPTY";
      } else {
        const allCompleted = slotObj.items.every((i) => i.logStatus === DOSE_STATUS.TAKEN);
        const anyLogged = slotObj.items.some((i) => i.isLogged);
        if (allCompleted) {
          slotObj.status = "COMPLETED";
        } else if (anyLogged) {
          slotObj.status = "PARTIAL";
        } else {
          slotObj.status = "PENDING";
        }
      }
    });

    const pendingCount = Math.max(
      0,
      totalScheduledCount - totalCompletedCount - totalSkippedCount
    );

    const adherenceRate =
      totalScheduledCount > 0
        ? Math.round((totalCompletedCount / totalScheduledCount) * 100)
        : 100;

    res.json({
      success: true,
      data: {
        date: targetDate,
        summary: {
          totalScheduledCount,
          totalCompletedCount,
          totalSkippedCount,
          pendingCount,
          adherenceRate,
        },
        timeline,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get 7-day adherence statistics
 */
const getAdherenceStats = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;

    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    const activeMedications = await Medication.find({
      careCircle: circleId,
      status: MEDICATION_STATUS.ACTIVE,
    });

    let dailyScheduledDoses = 0;
    activeMedications.forEach((med) => {
      dailyScheduledDoses += med.schedule && med.schedule.length > 0 ? med.schedule.length : 1;
    });

    const logs = await DoseLog.find({
      careCircle: circleId,
      scheduledDate: { $in: days },
    });

    const statsPerDay = days.map((dateStr) => {
      const dayLogs = logs.filter((l) => l.scheduledDate === dateStr);
      const taken = dayLogs.filter((l) => l.status === DOSE_STATUS.TAKEN).length;
      const skipped = dayLogs.filter((l) => l.status === DOSE_STATUS.SKIPPED).length;
      const scheduled = dailyScheduledDoses || (taken + skipped || 1);
      const percentage = scheduled > 0 ? Math.min(100, Math.round((taken / scheduled) * 100)) : 100;

      return {
        date: dateStr,
        scheduled,
        taken,
        skipped,
        percentage,
      };
    });

    const totalTaken = statsPerDay.reduce((sum, d) => sum + d.taken, 0);
    const totalSched = statsPerDay.reduce((sum, d) => sum + d.scheduled, 0);
    const averageAdherenceRate =
      totalSched > 0 ? Math.round((totalTaken / totalSched) * 100) : 100;

    // Calculate current streak
    let streakDays = 0;
    for (let i = statsPerDay.length - 1; i >= 0; i--) {
      if (statsPerDay[i].percentage >= 80) {
        streakDays += 1;
      } else {
        break;
      }
    }

    res.json({
      success: true,
      data: {
        averageAdherenceRate,
        streakDays,
        history: statsPerDay,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Get dose history for a medication
 */
const getMedicationDoses = async (req, res, next) => {
  try {
    const { circleId, medicationId } = req.params;
    const { limit = 30, page = 1 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const doses = await DoseLog.find({
      medication: medicationId,
      careCircle: circleId,
    })
      .populate("administeredBy", "name email")
      .sort({ administeredAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await DoseLog.countDocuments({
      medication: medicationId,
      careCircle: circleId,
    });

    res.json({
      success: true,
      count: doses.length,
      total,
      data: {
        doses,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. Get circle-wide dose logs history
 */
const getCircleDoses = async (req, res, next) => {
  try {
    const { circleId } = req.params;
    const { date, status, slot, limit = 50, page = 1 } = req.query;

    const filter = { careCircle: circleId };
    if (date) filter.scheduledDate = date;
    if (status) filter.status = status;
    if (slot) filter.slot = slot;

    const skip = (Number(page) - 1) * Number(limit);

    const doses = await DoseLog.find(filter)
      .populate("medication", "name dosage form")
      .populate("administeredBy", "name email")
      .sort({ administeredAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await DoseLog.countDocuments(filter);

    res.json({
      success: true,
      count: doses.length,
      total,
      data: {
        doses,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. Update a dose log note or reason
 */
const updateDoseLog = async (req, res, next) => {
  try {
    const { circleId, doseLogId } = req.params;
    const { notes, skipReason, status } = req.body;

    const doseLog = await DoseLog.findOne({
      _id: doseLogId,
      careCircle: circleId,
    }).populate("administeredBy", "name email");

    if (!doseLog) {
      return res.status(404).json({
        success: false,
        message: "Dose log not found in this Care Circle.",
        code: "DOSE_LOG_NOT_FOUND",
      });
    }

    if (notes !== undefined) doseLog.notes = notes;
    if (skipReason !== undefined) doseLog.skipReason = skipReason;
    if (status !== undefined) doseLog.status = status;

    await doseLog.save();

    res.json({
      success: true,
      message: "Dose log updated successfully.",
      data: {
        doseLog,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 12. Refill medication stock
 */
const refillStock = async (req, res, next) => {
  try {
    const { circleId, medicationId } = req.params;
    const { quantity, packageSize, pharmacy } = req.body;

    const medication = await Medication.findOne({
      _id: medicationId,
      careCircle: circleId,
    });

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: "Medication not found in this Care Circle.",
        code: "MEDICATION_NOT_FOUND",
      });
    }

    if (!medication.stock) {
      medication.stock = {
        tracked: true,
        currentQuantity: 0,
        unit: "tablets",
        lowStockThreshold: 10,
        packageSize: packageSize || 60,
        pharmacy: pharmacy || null,
      };
    }

    medication.stock.currentQuantity += Number(quantity);
    if (packageSize) medication.stock.packageSize = Number(packageSize);
    if (pharmacy) medication.stock.pharmacy = pharmacy;

    await medication.save();

    res.json({
      success: true,
      message: `Stock refilled by ${quantity} ${medication.stock.unit || "units"}. Current stock: ${medication.stock.currentQuantity}.`,
      data: {
        medicationId: medication._id,
        stock: medication.stock,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMedication,
  getCircleMedications,
  getMedicationById,
  updateMedication,
  deleteMedication,
  recordDose,
  getTodaySchedule,
  getAdherenceStats,
  getMedicationDoses,
  getCircleDoses,
  updateDoseLog,
  refillStock,
};
