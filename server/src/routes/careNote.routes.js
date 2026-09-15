const express = require("express");
const router = express.Router({ mergeParams: true });

const careNoteController = require("../controllers/careNote.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { verifyCircleMembership } = require("../middleware/circleAuth.middleware");
const validate = require("../middleware/validate.middleware");
const { circleIdParamValidationRules } = require("../validators/careCircle.validator");
const {
  noteIdParamValidationRules,
  createNoteValidationRules,
  updateNoteValidationRules,
  pinNoteValidationRules,
} = require("../validators/careNote.validator");

// Common pipeline for all circle-scoped note routes:
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
 * @route   POST /api/care-circles/:circleId/notes
 * @desc    Create a new care note or shift handover note
 * @access  Private (All Active Circle Members)
 */
router.post(
  "/",
  createNoteValidationRules,
  validate,
  careNoteController.createNote
);

/**
 * @route   GET /api/care-circles/:circleId/notes
 * @desc    List all care notes in the Care Circle with filtering & pagination
 * @access  Private (All Active Circle Members)
 */
router.get("/", careNoteController.getCircleNotes);

/**
 * @route   GET /api/care-circles/:circleId/notes/recent/handover
 * @desc    Get the latest shift handover note for quick dashboard display
 * @access  Private (All Active Circle Members)
 */
router.get("/recent/handover", careNoteController.getLatestHandover);

/**
 * @route   GET /api/care-circles/:circleId/notes/summary/daily
 * @desc    Get aggregated daily care notes summary and alerts
 * @access  Private (All Active Circle Members)
 */
router.get("/summary/daily", careNoteController.getDailyNotesSummary);

/**
 * @route   GET /api/care-circles/:circleId/notes/:noteId
 * @desc    Get a single care note by ID
 * @access  Private (All Active Circle Members)
 */
router.get(
  "/:noteId",
  noteIdParamValidationRules,
  validate,
  careNoteController.getNoteById
);

/**
 * @route   PATCH /api/care-circles/:circleId/notes/:noteId
 * @desc    Update a care note (Author or Circle Caretakers)
 * @access  Private (Author or Main/Sub Caretaker)
 */
router.patch(
  "/:noteId",
  noteIdParamValidationRules,
  updateNoteValidationRules,
  validate,
  careNoteController.updateNote
);

/**
 * @route   PATCH /api/care-circles/:circleId/notes/:noteId/pin
 * @desc    Toggle pin status for a note (Caretakers or Doctor)
 * @access  Private (Main/Sub Caretaker or Doctor)
 */
router.patch(
  "/:noteId/pin",
  noteIdParamValidationRules,
  pinNoteValidationRules,
  validate,
  careNoteController.togglePinNote
);

/**
 * @route   POST /api/care-circles/:circleId/notes/:noteId/acknowledge
 * @desc    Acknowledge reading a handover note (Incoming caregiver)
 * @access  Private (All Active Circle Members)
 */
router.post(
  "/:noteId/acknowledge",
  noteIdParamValidationRules,
  validate,
  careNoteController.acknowledgeNote
);

/**
 * @route   DELETE /api/care-circles/:circleId/notes/:noteId
 * @desc    Delete a care note (Author or Circle Caretakers)
 * @access  Private (Author or Main/Sub Caretaker)
 */
router.delete(
  "/:noteId",
  noteIdParamValidationRules,
  validate,
  careNoteController.deleteNote
);

module.exports = router;
