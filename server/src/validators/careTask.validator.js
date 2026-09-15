const { body, param } = require("express-validator");
const {
  ALL_TASK_STATUSES,
  ALL_TASK_PRIORITIES,
  TASK_CATEGORIES,
  TASK_TIME_SLOTS,
} = require("../constants/roles");

const taskIdParamValidationRules = [
  param("taskId")
    .isMongoId()
    .withMessage("Invalid Task ID format"),
];

const createTaskValidationRules = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Task title is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Task title must be between 2 and 200 characters"),

  body("dueDate")
    .trim()
    .notEmpty()
    .withMessage("Due date (YYYY-MM-DD) is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Due date must be in YYYY-MM-DD format (e.g. 2026-09-15)"),

  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("category")
    .optional({ nullable: true })
    .isIn(TASK_CATEGORIES)
    .withMessage(`Category must be one of: ${TASK_CATEGORIES.join(", ")}`),

  body("priority")
    .optional({ nullable: true })
    .isIn(ALL_TASK_PRIORITIES)
    .withMessage(`Priority must be one of: ${ALL_TASK_PRIORITIES.join(", ")}`),

  body("timeSlot")
    .optional({ nullable: true })
    .isIn(TASK_TIME_SLOTS)
    .withMessage(`Time slot must be one of: ${TASK_TIME_SLOTS.join(", ")}`),

  body("exactTime")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .withMessage("Exact time must be a valid string (e.g. 08:00, 14:00)"),

  body("assignedTo")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("Assigned user ID must be a valid MongoDB ID"),

  body("location")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location cannot exceed 100 characters"),
];

const updateTaskValidationRules = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Task title cannot be empty")
    .isLength({ min: 2, max: 200 })
    .withMessage("Task title must be between 2 and 200 characters"),

  body("dueDate")
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Due date must be in YYYY-MM-DD format (e.g. 2026-09-15)"),

  body("description")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("category")
    .optional()
    .isIn(TASK_CATEGORIES)
    .withMessage(`Category must be one of: ${TASK_CATEGORIES.join(", ")}`),

  body("priority")
    .optional()
    .isIn(ALL_TASK_PRIORITIES)
    .withMessage(`Priority must be one of: ${ALL_TASK_PRIORITIES.join(", ")}`),

  body("timeSlot")
    .optional()
    .isIn(TASK_TIME_SLOTS)
    .withMessage(`Time slot must be one of: ${TASK_TIME_SLOTS.join(", ")}`),

  body("exactTime")
    .optional({ nullable: true })
    .isString()
    .trim(),

  body("assignedTo")
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === "" || /^[0-9a-fA-F]{24}$/.test(val)) {
        return true;
      }
      throw new Error("Assigned user ID must be a valid MongoDB ID or null");
    }),

  body("location")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location cannot exceed 100 characters"),

  body("status")
    .optional()
    .isIn(ALL_TASK_STATUSES)
    .withMessage(`Status must be one of: ${ALL_TASK_STATUSES.join(", ")}`),
];

const updateTaskStatusValidationRules = [
  body("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required")
    .isIn(ALL_TASK_STATUSES)
    .withMessage(`Status must be one of: ${ALL_TASK_STATUSES.join(", ")}`),

  body("completionNotes")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Completion notes cannot exceed 500 characters"),
];

module.exports = {
  taskIdParamValidationRules,
  createTaskValidationRules,
  updateTaskValidationRules,
  updateTaskStatusValidationRules,
};
