const CareTask = require("../models/CareTask");
const CareCircleMember = require("../models/CareCircleMember");
const {
  TASK_STATUS,
  CAREOS_ROLES,
  MEMBERSHIP_STATUS,
} = require("../constants/roles");

/**
 * Helper to get current date in YYYY-MM-DD
 */
const getTodayDateString = () => {
  return new Date().toISOString().split("T")[0];
};

/**
 * 1. Create a new care task
 */
const createTask = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const careRecipientId =
      req.careCircle.careRecipient._id || req.careCircle.careRecipient;

    const {
      title,
      description,
      category,
      priority,
      dueDate,
      timeSlot,
      exactTime,
      assignedTo,
      location,
    } = req.body;

    // If assignedTo is provided, verify assignee is an ACTIVE member of this care circle
    if (assignedTo) {
      const isMember = await CareCircleMember.findOne({
        careCircle: circleId,
        user: assignedTo,
        membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
      });

      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: "Assigned user is not an active member of this Care Circle.",
          code: "ASSIGNEE_NOT_MEMBER",
        });
      }
    }

    const task = new CareTask({
      careCircle: circleId,
      careRecipient: careRecipientId,
      title,
      description: description || null,
      category: category || "GENERAL",
      priority: priority || "MEDIUM",
      status: TASK_STATUS.PENDING,
      dueDate: dueDate || getTodayDateString(),
      timeSlot: timeSlot || "morning",
      exactTime: exactTime || null,
      assignedTo: assignedTo || null,
      location: location || null,
      createdBy: req.userId,
    });

    await task.save();
    await task.populate("assignedTo", "name email");
    await task.populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Care task created successfully.",
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. List tasks for a Care Circle with tab and filter support
 */
const getCircleTasks = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const {
      tab,
      date,
      assignedTo,
      category,
      priority,
      status,
      timeSlot,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = { careCircle: circleId };
    const today = getTodayDateString();

    // Tab-based view filters
    if (tab === "today") {
      filter.dueDate = today;
    } else if (tab === "upcoming") {
      filter.dueDate = { $gte: today };
      filter.status = { $ne: TASK_STATUS.COMPLETED };
    } else if (tab === "completed") {
      filter.status = TASK_STATUS.COMPLETED;
    }

    // Explicit query parameter filters
    if (date) {
      filter.dueDate = date;
    }
    if (assignedTo) {
      if (assignedTo === "unassigned") {
        filter.assignedTo = null;
      } else {
        filter.assignedTo = assignedTo;
      }
    }
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (status && !tab) filter.status = status;
    if (timeSlot) filter.timeSlot = timeSlot;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const tasks = await CareTask.find(filter)
      .populate("assignedTo", "name email")
      .populate("completedBy", "name email")
      .populate("createdBy", "name email")
      .sort({ dueDate: 1, exactTime: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await CareTask.countDocuments(filter);

    res.json({
      success: true,
      count: tasks.length,
      total,
      data: {
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get single task by ID
 */
const getTaskById = async (req, res, next) => {
  try {
    const { circleId, taskId } = req.params;

    const task = await CareTask.findOne({
      _id: taskId,
      careCircle: circleId,
    })
      .populate("assignedTo", "name email")
      .populate("completedBy", "name email")
      .populate("createdBy", "name email");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found in this Care Circle.",
        code: "TASK_NOT_FOUND",
      });
    }

    res.json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update task details
 */
const updateTask = async (req, res, next) => {
  try {
    const { circleId, taskId } = req.params;

    const task = await CareTask.findOne({
      _id: taskId,
      careCircle: circleId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found in this Care Circle.",
        code: "TASK_NOT_FOUND",
      });
    }

    // If assignedTo is being updated, verify new assignee belongs to circle
    if (req.body.assignedTo) {
      const isMember = await CareCircleMember.findOne({
        careCircle: circleId,
        user: req.body.assignedTo,
        membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
      });

      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: "Assigned user is not an active member of this Care Circle.",
          code: "ASSIGNEE_NOT_MEMBER",
        });
      }
    }

    const updatableFields = [
      "title",
      "description",
      "category",
      "priority",
      "dueDate",
      "timeSlot",
      "exactTime",
      "assignedTo",
      "location",
      "status",
      "completionNotes",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field] === "" ? null : req.body[field];
      }
    });

    await task.save();
    await task.populate("assignedTo", "name email");
    await task.populate("completedBy", "name email");
    await task.populate("createdBy", "name email");

    res.json({
      success: true,
      message: "Task updated successfully.",
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Update task completion status
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const { circleId, taskId } = req.params;
    const { status, completionNotes } = req.body;

    const task = await CareTask.findOne({
      _id: taskId,
      careCircle: circleId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found in this Care Circle.",
        code: "TASK_NOT_FOUND",
      });
    }

    task.status = status;

    if (status === TASK_STATUS.COMPLETED) {
      task.completedBy = req.userId;
      task.completedAt = new Date();
      if (completionNotes !== undefined) {
        task.completionNotes = completionNotes;
      }
    } else if (status === TASK_STATUS.PENDING || status === TASK_STATUS.IN_PROGRESS) {
      task.completedBy = null;
      task.completedAt = null;
      if (completionNotes !== undefined) {
        task.completionNotes = completionNotes;
      }
    } else if (status === TASK_STATUS.CANCELLED) {
      if (completionNotes !== undefined) {
        task.completionNotes = completionNotes;
      }
    }

    await task.save();
    await task.populate("assignedTo", "name email");
    await task.populate("completedBy", "name email");
    await task.populate("createdBy", "name email");

    res.json({
      success: true,
      message: `Task status updated to ${status}.`,
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Delete a task (Creator or Circle Caretaker only)
 */
const deleteTask = async (req, res, next) => {
  try {
    const { circleId, taskId } = req.params;

    const task = await CareTask.findOne({
      _id: taskId,
      careCircle: circleId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found in this Care Circle.",
        code: "TASK_NOT_FOUND",
      });
    }

    // Check authorization: Must be task creator or MAIN_CARETAKER or SUB_CARETAKER
    const isCreator = task.createdBy.toString() === req.userId.toString();
    const isCaretaker =
      req.circleMembership.role === CAREOS_ROLES.MAIN_CARETAKER ||
      req.circleMembership.role === CAREOS_ROLES.SUB_CARETAKER;

    if (!isCreator && !isCaretaker) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the task creator or circle caretakers can delete tasks.",
        code: "FORBIDDEN",
      });
    }

    await task.deleteOne();

    res.json({
      success: true,
      message: "Task deleted successfully.",
      data: {
        taskId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Today's task summary & timeline breakdown
 */
const getTodayTaskSummary = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;
    const today = req.query.date || getTodayDateString();

    const tasks = await CareTask.find({
      careCircle: circleId,
      dueDate: today,
    })
      .populate("assignedTo", "name email")
      .populate("completedBy", "name email")
      .sort({ exactTime: 1, createdAt: 1 });

    const timeline = {
      morning: { slot: "morning", label: "Morning", items: [] },
      afternoon: { slot: "afternoon", label: "Afternoon", items: [] },
      evening: { slot: "evening", label: "Evening", items: [] },
      night: { slot: "night", label: "Night", items: [] },
      anytime: { slot: "anytime", label: "Anytime", items: [] },
    };

    let totalCount = tasks.length;
    let completedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    tasks.forEach((t) => {
      const slotKey = t.timeSlot || "morning";
      if (timeline[slotKey]) {
        timeline[slotKey].items.push(t);
      }

      if (t.status === TASK_STATUS.COMPLETED) {
        completedCount += 1;
      } else if (t.status === TASK_STATUS.CANCELLED) {
        cancelledCount += 1;
      } else {
        pendingCount += 1;
      }
    });

    const completionPercentage =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    res.json({
      success: true,
      data: {
        date: today,
        summary: {
          totalCount,
          completedCount,
          pendingCount,
          cancelledCount,
          completionPercentage,
        },
        timeline,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Caregiver workload distribution telemetry
 */
const getCaregiverWorkload = async (req, res, next) => {
  try {
    const circleId = req.params.circleId;

    // Get all active members of the circle
    const members = await CareCircleMember.find({
      careCircle: circleId,
      membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
    }).populate("user", "name email");

    // Get all pending and completed tasks
    const tasks = await CareTask.find({
      careCircle: circleId,
    });

    const totalActiveTasks = tasks.length;
    let unassignedCount = 0;

    const workloadMap = new Map();
    members.forEach((m) => {
      if (m.user) {
        workloadMap.set(m.user._id.toString(), {
          userId: m.user._id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          totalAssigned: 0,
          pendingTasks: 0,
          completedTasks: 0,
          percentage: 0,
        });
      }
    });

    tasks.forEach((t) => {
      if (!t.assignedTo) {
        unassignedCount += 1;
      } else {
        const uId = t.assignedTo.toString();
        if (workloadMap.has(uId)) {
          const stats = workloadMap.get(uId);
          stats.totalAssigned += 1;
          if (t.status === TASK_STATUS.COMPLETED) {
            stats.completedTasks += 1;
          } else if (t.status === TASK_STATUS.PENDING || t.status === TASK_STATUS.IN_PROGRESS) {
            stats.pendingTasks += 1;
          }
        }
      }
    });

    const workload = Array.from(workloadMap.values()).map((w) => {
      w.percentage =
        totalActiveTasks > 0
          ? Math.round((w.totalAssigned / totalActiveTasks) * 100)
          : 0;
      return w;
    });

    res.json({
      success: true,
      data: {
        totalActiveTasks,
        unassignedCount,
        workload,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getCircleTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTodayTaskSummary,
  getCaregiverWorkload,
};
