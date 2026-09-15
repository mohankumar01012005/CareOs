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
};
