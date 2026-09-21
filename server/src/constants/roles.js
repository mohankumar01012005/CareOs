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

const TASK_STATUS = Object.freeze({
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

const ALL_TASK_STATUSES = Object.freeze(Object.values(TASK_STATUS));

const TASK_PRIORITY = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
});

const ALL_TASK_PRIORITIES = Object.freeze(Object.values(TASK_PRIORITY));

const TASK_CATEGORIES = Object.freeze([
  "MEDICATION",
  "VITALS",
  "MEALS",
  "MOBILITY",
  "APPOINTMENT",
  "ERRAND",
  "HYGIENE",
  "GENERAL",
]);

const TASK_TIME_SLOTS = Object.freeze([
  "morning",
  "afternoon",
  "evening",
  "night",
  "anytime",
]);

const NOTE_CATEGORIES = Object.freeze([
  "GENERAL",
  "HANDOVER",
  "VITALS_DIET",
  "NIGHT_ROUTINE",
  "INCIDENT",
  "MEDICATION_OBSERVATION",
  "DOCTOR_VISIT",
]);

const NOTE_SHIFTS = Object.freeze([
  "morning",
  "afternoon",
  "evening",
  "night",
  "none",
]);

const NOTE_URGENCY = Object.freeze({
  NORMAL: "NORMAL",
  IMPORTANT: "IMPORTANT",
  URGENT: "URGENT",
});

const ALL_NOTE_URGENCIES = Object.freeze(Object.values(NOTE_URGENCY));

const APPETITE_LEVELS = Object.freeze([
  "poor",
  "fair",
  "good",
  "excellent",
]);

const MOOD_LEVELS = Object.freeze([
  "calm",
  "happy",
  "anxious",
  "irritable",
  "confused",
  "tired",
]);

const BOWEL_MOVEMENT_STATUS = Object.freeze([
  "none",
  "normal",
  "loose",
  "constipated",
]);

const NOTE_PIN_ROLES = Object.freeze([
  CAREOS_ROLES.MAIN_CARETAKER,
  CAREOS_ROLES.SUB_CARETAKER,
  CAREOS_ROLES.PAID_DOCTOR,
]);

const DOCUMENT_CATEGORIES = Object.freeze([
  "INSURANCE",
  "PRESCRIPTION",
  "LAB_REPORT",
  "DISCHARGE_SUMMARY",
  "GOVERNMENT_ID",
  "LEGAL_FINANCIAL",
  "OTHER",
]);

const DOCUMENT_PRIVACY_LEVELS = Object.freeze({
  CIRCLE_WIDE: "CIRCLE_WIDE",
  FAMILY_ONLY: "FAMILY_ONLY",
  DOCTOR_AND_CARETAKERS: "DOCTOR_AND_CARETAKERS",
  CARETAKERS_ONLY: "CARETAKERS_ONLY",
  EMERGENCY_SOS: "EMERGENCY_SOS",
});

const ALL_DOCUMENT_PRIVACY_LEVELS = Object.freeze(
  Object.values(DOCUMENT_PRIVACY_LEVELS)
);

const DOCUMENT_AUDIT_ACTIONS = Object.freeze([
  "VIEW",
  "DOWNLOAD",
  "UPDATE",
  "DELETE",
  "EMERGENCY_ACCESS",
]);

const DOCUMENT_ACCESS_ROLES_MAP = Object.freeze({
  CIRCLE_WIDE: Object.freeze(ALL_ROLES),
  FAMILY_ONLY: Object.freeze(FAMILY_ROLES),
  DOCTOR_AND_CARETAKERS: Object.freeze([
    CAREOS_ROLES.MAIN_CARETAKER,
    CAREOS_ROLES.SUB_CARETAKER,
    CAREOS_ROLES.PAID_DOCTOR,
  ]),
  CARETAKERS_ONLY: Object.freeze(CARETAKER_ROLES),
  EMERGENCY_SOS: Object.freeze(ALL_ROLES),
});

const VITAL_TYPES = Object.freeze({
  BLOOD_PRESSURE: "BLOOD_PRESSURE",
  BLOOD_SUGAR: "BLOOD_SUGAR",
  HEART_RATE: "HEART_RATE",
  OXYGEN_SATURATION: "OXYGEN_SATURATION",
  TEMPERATURE: "TEMPERATURE",
  WEIGHT: "WEIGHT",
  RESPIRATORY_RATE: "RESPIRATORY_RATE",
});

const ALL_VITAL_TYPES = Object.freeze(Object.values(VITAL_TYPES));

const SUGAR_MEAL_CONTEXTS = Object.freeze([
  "FASTING",
  "POST_PRANDIAL",
  "BEFORE_MEAL",
  "AFTER_MEAL",
  "BEDTIME",
  "RANDOM",
]);

const ALL_SUGAR_MEAL_CONTEXTS = Object.freeze(SUGAR_MEAL_CONTEXTS);

const SYMPTOM_CATEGORIES = Object.freeze({
  PAIN: "PAIN",
  DIZZINESS: "DIZZINESS",
  FATIGUE: "FATIGUE",
  NAUSEA: "NAUSEA",
  BREATHING_DIFFICULTY: "BREATHING_DIFFICULTY",
  FEVER: "FEVER",
  HEADACHE: "HEADACHE",
  DIGESTIVE_ISSUE: "DIGESTIVE_ISSUE",
  MOOD_ALTERATION: "MOOD_ALTERATION",
  INSOMNIA: "INSOMNIA",
  CONFUSION: "CONFUSION",
  MOBILITY_ISSUE: "MOBILITY_ISSUE",
  OTHER: "OTHER",
});

const ALL_SYMPTOM_CATEGORIES = Object.freeze(Object.values(SYMPTOM_CATEGORIES));


const SYMPTOM_SEVERITIES = Object.freeze({
  MILD: "MILD",
  MODERATE: "MODERATE",
  SEVERE: "SEVERE",
  CRITICAL: "CRITICAL",
});

const ALL_SYMPTOM_SEVERITIES = Object.freeze(Object.values(SYMPTOM_SEVERITIES));

const VITAL_ALERT_SEVERITIES = Object.freeze({
  NORMAL: "NORMAL",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
});

const ALL_VITAL_ALERT_SEVERITIES = Object.freeze(
  Object.values(VITAL_ALERT_SEVERITIES)
);

const DEFAULT_CLINICAL_BASELINES = Object.freeze({
  bpSystolicMin: 90,
  bpSystolicMax: 140,
  bpDiastolicMin: 60,
  bpDiastolicMax: 90,
  heartRateMin: 50,
  heartRateMax: 100,
  bloodSugarFastingMin: 70,
  bloodSugarFastingMax: 130,
  bloodSugarPostPrandialMin: 80,
  bloodSugarPostPrandialMax: 180,
  spO2Min: 94,
  temperatureMin: 97.0,
  temperatureMax: 99.5,
  respiratoryRateMin: 12,
  respiratoryRateMax: 20,
  criticalOverrides: Object.freeze({
    bpSystolicCriticalHigh: 180,
    bpSystolicCriticalLow: 80,
    bpDiastolicCriticalHigh: 110,
    bpDiastolicCriticalLow: 50,
    spO2CriticalLow: 90,
    heartRateCriticalHigh: 130,
    heartRateCriticalLow: 40,
    bloodSugarCriticalHigh: 300,
    bloodSugarCriticalLow: 55,
    temperatureCriticalHigh: 102.5,
    temperatureCriticalLow: 95.0,
  }),
});

const BASELINE_MANAGER_ROLES = Object.freeze([
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
  TASK_STATUS,
  ALL_TASK_STATUSES,
  TASK_PRIORITY,
  ALL_TASK_PRIORITIES,
  TASK_CATEGORIES,
  TASK_TIME_SLOTS,
  NOTE_CATEGORIES,
  NOTE_SHIFTS,
  NOTE_URGENCY,
  ALL_NOTE_URGENCIES,
  APPETITE_LEVELS,
  MOOD_LEVELS,
  BOWEL_MOVEMENT_STATUS,
  NOTE_PIN_ROLES,
  DOCUMENT_CATEGORIES,
  DOCUMENT_PRIVACY_LEVELS,
  ALL_DOCUMENT_PRIVACY_LEVELS,
  DOCUMENT_AUDIT_ACTIONS,
  DOCUMENT_ACCESS_ROLES_MAP,
  VITAL_TYPES,
  ALL_VITAL_TYPES,
  SUGAR_MEAL_CONTEXTS,
  ALL_SUGAR_MEAL_CONTEXTS,
  SYMPTOM_CATEGORIES,
  ALL_SYMPTOM_CATEGORIES,
  SYMPTOM_SEVERITIES,
  ALL_SYMPTOM_SEVERITIES,
  VITAL_ALERT_SEVERITIES,
  ALL_VITAL_ALERT_SEVERITIES,
  DEFAULT_CLINICAL_BASELINES,
  BASELINE_MANAGER_ROLES,
};




