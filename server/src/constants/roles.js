/**
 * CareOS Application Constants
 *
 * CareOS defines six application roles.
 * User identity is separated from care circle membership.
 * A single user can belong to multiple circles with different roles.
 */

const CAREOS_ROLES = Object.freeze({
  MAIN_CARETAKER: "MAIN_CARETAKER",
  SUB_CARETAKER: "SUB_CARETAKER",
  FAMILY_MEMBER: "FAMILY_MEMBER",
  CARE_RECEIVER: "CARE_RECEIVER",
  PAID_DOCTOR: "PAID_DOCTOR",
  PAID_CARETAKER: "PAID_CARETAKER",
});

const ALL_ROLES = Object.freeze(Object.values(CAREOS_ROLES));

const CARETAKER_ROLES = Object.freeze([
  CAREOS_ROLES.MAIN_CARETAKER,
  CAREOS_ROLES.SUB_CARETAKER,
]);

const CLINICAL_ROLES = Object.freeze([
  CAREOS_ROLES.PAID_DOCTOR,
  CAREOS_ROLES.PAID_CARETAKER,
]);

const FAMILY_ROLES = Object.freeze([
  CAREOS_ROLES.MAIN_CARETAKER,
  CAREOS_ROLES.SUB_CARETAKER,
  CAREOS_ROLES.FAMILY_MEMBER,
  CAREOS_ROLES.CARE_RECEIVER,
]);

const CIRCLE_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
});

const ALL_CIRCLE_STATUSES = Object.freeze(Object.values(CIRCLE_STATUS));

const MEMBERSHIP_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
});

const ALL_MEMBERSHIP_STATUSES = Object.freeze(Object.values(MEMBERSHIP_STATUS));

const BLOOD_GROUPS = Object.freeze([
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "unknown",
]);

const GENDERS = Object.freeze(["male", "female", "other", "prefer_not_to_say"]);

const INVITATION_ROLES = Object.freeze([
  CAREOS_ROLES.SUB_CARETAKER,
  CAREOS_ROLES.FAMILY_MEMBER,
  CAREOS_ROLES.PAID_DOCTOR,
  CAREOS_ROLES.PAID_CARETAKER,
]);

const INVITATION_STATUS = Object.freeze({
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
});

const ALL_INVITATION_STATUSES = Object.freeze(Object.values(INVITATION_STATUS));

const DEFAULT_INVITATION_EXPIRY_HOURS = 48;

const MEDICATION_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  DISCONTINUED: "DISCONTINUED",
});

const ALL_MEDICATION_STATUSES = Object.freeze(Object.values(MEDICATION_STATUS));

const DOSE_STATUS = Object.freeze({
  TAKEN: "TAKEN",
  SKIPPED: "SKIPPED",
  MISSED: "MISSED",
  RESCHEDULED: "RESCHEDULED",
});

const ALL_DOSE_STATUSES = Object.freeze(Object.values(DOSE_STATUS));

const TIME_SLOTS = Object.freeze([
  "morning",
  "afternoon",
  "evening",
  "night",
  "as_needed",
]);

const MEDICATION_FORMS = Object.freeze([
  "tablet",
  "capsule",
  "syrup",
  "injection",
  "drops",
  "ointment",
  "inhaler",
  "powder",
  "other",
]);

const MEDICATION_FREQUENCIES = Object.freeze([
  "once_daily",
  "twice_daily",
  "thrice_daily",
  "four_times_daily",
  "as_needed",
  "every_other_day",
  "weekly",
  "custom",
]);

const FOOD_TIMINGS = Object.freeze([
  "with_meal",
  "before_meal",
  "after_meal",
  "empty_stomach",
  "no_restriction",
]);

const MEDICATION_MANAGER_ROLES = Object.freeze([
  CAREOS_ROLES.MAIN_CARETAKER,
  CAREOS_ROLES.SUB_CARETAKER,
  CAREOS_ROLES.PAID_DOCTOR,
]);

module.exports = {
  CAREOS_ROLES,
  ALL_ROLES,
  CARETAKER_ROLES,
  CLINICAL_ROLES,
  FAMILY_ROLES,
  CIRCLE_STATUS,
  ALL_CIRCLE_STATUSES,
  MEMBERSHIP_STATUS,
  ALL_MEMBERSHIP_STATUSES,
  BLOOD_GROUPS,
  GENDERS,
  INVITATION_ROLES,
  INVITATION_STATUS,
  ALL_INVITATION_STATUSES,
  DEFAULT_INVITATION_EXPIRY_HOURS,
  MEDICATION_STATUS,
  ALL_MEDICATION_STATUSES,
  DOSE_STATUS,
  ALL_DOSE_STATUSES,
  TIME_SLOTS,
  MEDICATION_FORMS,
  MEDICATION_FREQUENCIES,
  FOOD_TIMINGS,
  MEDICATION_MANAGER_ROLES,
};

