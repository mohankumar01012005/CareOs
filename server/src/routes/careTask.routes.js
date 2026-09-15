const express = require("express");
const router = express.Router({ mergeParams: true });

const careTaskController = require("../controllers/careTask.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { verifyCircleMembership } = require("../middleware/circleAuth.middleware");
const validate = require("../middleware/validate.middleware");
const { circleIdParamValidationRules } = require("../validators/careCircle.validator");
const {
  taskIdParamValidationRules,
  createTaskValidationRules,
  updateTaskValidationRules,
  updateTaskStatusValidationRules,
} = require("../validators/careTask.validator");

// Common pipeline for all circle-scoped task routes:
// 1. authenticate (JWT)
// 2. circleIdParamValidationRules (validate circleId format)
// 3. validate (check validator result)
// 4. verifyCircleMembership (ensure user is an ACTIVE member of this care circle)
router.use(
  authenticate,
  circleIdParamValidationRules,
  validate,
  verifyCircleMembership
);

/**
 * @route   POST /api/care-circles/:circleId/tasks
 * @desc    Create a new care task
 * @access  Private (All Active Circle Members)
 */
router.post(
  "/",
  createTaskValidationRules,
  validate,
  careTaskController.createTask
);

/**
 * @route   GET /api/care-circles/:circleId/tasks
 * @desc    List all care tasks for the Care Circle with tab/filter/search support
 * @access  Private (All Active Circle Members)
 */
router.get("/", careTaskController.getCircleTasks);

/**
 * @route   GET /api/care-circles/:circleId/tasks/summary/today
 * @desc    Get today's time-slot timeline breakdown & completion summary
 * @access  Private (All Active Circle Members)
 */
router.get("/summary/today", careTaskController.getTodayTaskSummary);

/**
 * @route   GET /api/care-circles/:circleId/tasks/workload
 * @desc    Get caregiver workload balance telemetry across circle members
 * @access  Private (All Active Circle Members)
 */
router.get("/workload", careTaskController.getCaregiverWorkload);

/**
 * @route   GET /api/care-circles/:circleId/tasks/:taskId
 * @desc    Get a single task by ID
 * @access  Private (All Active Circle Members)
 */
router.get(
  "/:taskId",
  taskIdParamValidationRules,
  validate,
  careTaskController.getTaskById
);

/**
 * @route   PATCH /api/care-circles/:circleId/tasks/:taskId
 * @desc    Update task details (title, description, assignee, priority, dueDate, timeSlot, etc.)
 * @access  Private (All Active Circle Members)
 */
router.patch(
  "/:taskId",
  taskIdParamValidationRules,
  updateTaskValidationRules,
  validate,
  careTaskController.updateTask
);

/**
 * @route   PATCH /api/care-circles/:circleId/tasks/:taskId/status
 * @desc    Update task completion status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
 * @access  Private (All Active Circle Members)
 */
router.patch(
  "/:taskId/status",
  taskIdParamValidationRules,
  updateTaskStatusValidationRules,
  validate,
  careTaskController.updateTaskStatus
);

/**
 * @route   DELETE /api/care-circles/:circleId/tasks/:taskId
 * @desc    Delete a care task (Creator or Circle Caretakers only)
 * @access  Private (Task Creator or Main/Sub Caretaker)
 */
router.delete(
  "/:taskId",
  taskIdParamValidationRules,
  validate,
  careTaskController.deleteTask
);

module.exports = router;
