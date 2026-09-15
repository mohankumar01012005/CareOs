const CareNote = require("../models/CareNote");
const {
  CAREOS_ROLES,
  NOTE_PIN_ROLES,
  CARETAKER_ROLES,
} = require("../constants/roles");

/**
 * Helper to get current date in YYYY-MM-DD format
 */
const getTodayDateString = () => {
  return new Date().toISOString().split("T")[0];
};

/**
 * 1. Create a new care note / shift handover
 */
const createNote = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const careRecipientId =
      req.careCircle.careRecipient._id || req.careCircle.careRecipient;

    const {
      title,
      content,
      category,
      shift,
      noteDate,
      urgency,
      vitalsSnapshot,
      dietMood,
    } = req.body;

    const note = new CareNote({
      careCircle: circleId,
      careRecipient: careRecipientId,
      author: req.userId,
      title: title || null,
      content,
      category: category || "GENERAL",
      shift: shift || "none",
      noteDate: noteDate || getTodayDateString(),
      urgency: urgency || "NORMAL",
      vitalsSnapshot: vitalsSnapshot || {},
      dietMood: dietMood || {},
    });

    await note.save();
    await note.populate("author", "name email profilePhoto");

    res.status(201).json({
      success: true,
      message: "Care note created successfully.",
      data: {
        note,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. List all care notes in a Care Circle with filtering & pagination
 */
const getCircleNotes = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const {
      category,
      shift,
      urgency,
      author,
      date,
      isPinned,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = { careCircle: circleId, isArchived: false };

    if (category) filter.category = category;
    if (shift) filter.shift = shift;
    if (urgency) filter.urgency = urgency;
    if (author) filter.author = author;
    if (date) filter.noteDate = date;
    if (isPinned !== undefined) {
      filter.isPinned = isPinned === "true" || isPinned === true;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const notes = await CareNote.find(filter)
      .populate("author", "name email profilePhoto")
      .populate("acknowledgedBy.user", "name email")
      .sort({ isPinned: -1, noteDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await CareNote.countDocuments(filter);

    res.json({
      success: true,
      count: notes.length,
      total,
      data: {
        notes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get single note by ID
 */
const getNoteById = async (req, res, next) => {
  try {
    const { circleId, noteId } = req.params;

    const note = await CareNote.findOne({
      _id: noteId,
      careCircle: circleId,
      isArchived: false,
    })
      .populate("author", "name email profilePhoto")
      .populate("acknowledgedBy.user", "name email");

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Care note not found in this Care Circle.",
        code: "NOTE_NOT_FOUND",
      });
    }

    res.json({
      success: true,
      data: {
        note,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get the latest shift handover note for quick dashboard display
 */
const getLatestHandover = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;

    const note = await CareNote.findOne({
      careCircle: circleId,
      isArchived: false,
      $or: [
        { category: "HANDOVER" },
        { shift: { $in: ["morning", "afternoon", "evening", "night"] } },
      ],
    })
      .populate("author", "name email profilePhoto")
      .populate("acknowledgedBy.user", "name email")
      .sort({ noteDate: -1, createdAt: -1 });

    res.json({
      success: true,
      data: {
        note: note || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get daily notes summary & alerts telemetry
 */
const getDailyNotesSummary = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const targetDate = req.query.date || getTodayDateString();

    const notes = await CareNote.find({
      careCircle: circleId,
      noteDate: targetDate,
      isArchived: false,
    })
      .populate("author", "name email profilePhoto")
      .sort({ createdAt: -1 });

    let totalNotesCount = notes.length;
    let urgentNotesCount = 0;
    let handoverCount = 0;
    let vitalsLoggedCount = 0;
    let latestVitals = null;

    notes.forEach((n) => {
      if (n.urgency === "URGENT") {
        urgentNotesCount += 1;
      }
      if (n.category === "HANDOVER" || (n.shift && n.shift !== "none")) {
        handoverCount += 1;
      }
      if (
        n.vitalsSnapshot &&
        (n.vitalsSnapshot.bpSystolic ||
          n.vitalsSnapshot.heartRate ||
          n.vitalsSnapshot.bloodSugar ||
          n.vitalsSnapshot.temperature ||
          n.vitalsSnapshot.spO2)
      ) {
        vitalsLoggedCount += 1;
        if (!latestVitals) {
          latestVitals = n.vitalsSnapshot;
        }
      }
    });

    res.json({
      success: true,
      data: {
        date: targetDate,
        summary: {
          totalNotesCount,
          urgentNotesCount,
          handoverCount,
          vitalsLoggedCount,
          latestVitals,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Update a care note (Author or Caretakers only)
 */
const updateNote = async (req, res, next) => {
  try {
    const { circleId, noteId } = req.params;

    const note = await CareNote.findOne({
      _id: noteId,
      careCircle: circleId,
      isArchived: false,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Care note not found in this Care Circle.",
        code: "NOTE_NOT_FOUND",
      });
    }

    // Authorization: Must be note author or circle caretaker
    const isAuthor = note.author.toString() === req.userId.toString();
    const isCaretaker =
      req.circleMembership.role === CAREOS_ROLES.MAIN_CARETAKER ||
      req.circleMembership.role === CAREOS_ROLES.SUB_CARETAKER;

    if (!isAuthor && !isCaretaker) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the author or circle caretakers can edit this note.",
        code: "FORBIDDEN",
      });
    }

    const updatableFields = [
      "title",
      "content",
      "category",
      "shift",
      "noteDate",
      "urgency",
      "vitalsSnapshot",
      "dietMood",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        note[field] = req.body[field];
      }
    });

    await note.save();
    await note.populate("author", "name email profilePhoto");
    await note.populate("acknowledgedBy.user", "name email");

    res.json({
      success: true,
      message: "Care note updated successfully.",
      data: {
        note,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Toggle pin/unpin for a care note (Caretakers or Doctor only)
 */
const togglePinNote = async (req, res, next) => {
  try {
    const { circleId, noteId } = req.params;
    const { isPinned } = req.body;

    const note = await CareNote.findOne({
      _id: noteId,
      careCircle: circleId,
      isArchived: false,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Care note not found in this Care Circle.",
        code: "NOTE_NOT_FOUND",
      });
    }

    // Check authorization: Must be in NOTE_PIN_ROLES (MAIN_CARETAKER, SUB_CARETAKER, PAID_DOCTOR)
    const canPin = NOTE_PIN_ROLES.includes(req.circleMembership.role);

    if (!canPin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only caretakers and doctors can pin/unpin notes.",
        code: "FORBIDDEN",
      });
    }

    note.isPinned = Boolean(isPinned);
    await note.save();
    await note.populate("author", "name email profilePhoto");
    await note.populate("acknowledgedBy.user", "name email");

    res.json({
      success: true,
      message: `Note ${note.isPinned ? "pinned" : "unpinned"} successfully.`,
      data: {
        note,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Acknowledge a handover note (Incoming caregiver / circle member)
 */
const acknowledgeNote = async (req, res, next) => {
  try {
    const { circleId, noteId } = req.params;

    const note = await CareNote.findOne({
      _id: noteId,
      careCircle: circleId,
      isArchived: false,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Care note not found in this Care Circle.",
        code: "NOTE_NOT_FOUND",
      });
    }

    // Idempotent: check if current user already acknowledged
    const alreadyAcknowledged = note.acknowledgedBy.some(
      (a) => a.user.toString() === req.userId.toString()
    );

    if (!alreadyAcknowledged) {
      note.acknowledgedBy.push({
        user: req.userId,
        acknowledgedAt: new Date(),
      });
      await note.save();
    }

    await note.populate("author", "name email profilePhoto");
    await note.populate("acknowledgedBy.user", "name email");

    res.json({
      success: true,
      message: "Handover note acknowledged successfully.",
      data: {
        note,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Delete a care note (Author or Caretakers only)
 */
const deleteNote = async (req, res, next) => {
  try {
    const { circleId, noteId } = req.params;

    const note = await CareNote.findOne({
      _id: noteId,
      careCircle: circleId,
      isArchived: false,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Care note not found in this Care Circle.",
        code: "NOTE_NOT_FOUND",
      });
    }

    // Authorization: Must be note author or circle caretaker
    const isAuthor = note.author.toString() === req.userId.toString();
    const isCaretaker =
      req.circleMembership.role === CAREOS_ROLES.MAIN_CARETAKER ||
      req.circleMembership.role === CAREOS_ROLES.SUB_CARETAKER;

    if (!isAuthor && !isCaretaker) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the author or circle caretakers can delete this note.",
        code: "FORBIDDEN",
      });
    }

    await note.deleteOne();

    res.json({
      success: true,
      message: "Care note deleted successfully.",
      data: {
        noteId,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNote,
  getCircleNotes,
  getNoteById,
  getLatestHandover,
  getDailyNotesSummary,
  updateNote,
  togglePinNote,
  acknowledgeNote,
  deleteNote,
};
