/**
 * CareOS Canonical Roles & Capabilities
 *
 * Six distinct roles:
 * 1. MAIN_CARETAKER - Primary family admin, creator, full control
 * 2. SUB_CARETAKER - Secondary caretaker, co-management permissions
 * 3. FAMILY_MEMBER - Relative with view & logging access
 * 4. CARE_RECEIVER - Patient / elderly individual
 * 5. PAID_DOCTOR - Licensed medical practitioner
 * 6. PAID_CARETAKER - Hired professional nurse/aide
 */

export const ROLES = {
  MAIN_CARETAKER: 'MAIN_CARETAKER',
  SUB_CARETAKER: 'SUB_CARETAKER',
  FAMILY_MEMBER: 'FAMILY_MEMBER',
  CARE_RECEIVER: 'CARE_RECEIVER',
  PAID_DOCTOR: 'PAID_DOCTOR',
  PAID_CARETAKER: 'PAID_CARETAKER',
};

export const ALL_ROLES = Object.values(ROLES);

export const ROLE_LABELS = {
  [ROLES.MAIN_CARETAKER]: 'Main Caretaker',
  [ROLES.SUB_CARETAKER]: 'Sub Caretaker',
  [ROLES.FAMILY_MEMBER]: 'Family Member',
  [ROLES.CARE_RECEIVER]: 'Care Receiver',
  [ROLES.PAID_DOCTOR]: 'Doctor',
  [ROLES.PAID_CARETAKER]: 'Care Aide / Nurse',
};

export const ROLE_BADGE_VARIANTS = {
  [ROLES.MAIN_CARETAKER]: 'primary',
  [ROLES.SUB_CARETAKER]: 'primary-dim',
  [ROLES.FAMILY_MEMBER]: 'secondary',
  [ROLES.CARE_RECEIVER]: 'tertiary',
  [ROLES.PAID_DOCTOR]: 'doctor',
  [ROLES.PAID_CARETAKER]: 'aide',
};

export const ROLE_ICONS = {
  [ROLES.MAIN_CARETAKER]: 'shield_person',
  [ROLES.SUB_CARETAKER]: 'supervised_user_circle',
  [ROLES.FAMILY_MEMBER]: 'family_restroom',
  [ROLES.CARE_RECEIVER]: 'person',
  [ROLES.PAID_DOCTOR]: 'stethoscope',
  [ROLES.PAID_CARETAKER]: 'medical_services',
};

/**
 * Role Permission Helpers
 */
export const isMainCaretaker = (role) => role === ROLES.MAIN_CARETAKER;

export const isDoctor = (role) => role === ROLES.PAID_DOCTOR;

export const canManageCircle = (role) => role === ROLES.MAIN_CARETAKER;

export const canInviteMembers = (role) => role === ROLES.MAIN_CARETAKER;

export const canManageMedications = (role) =>
  [ROLES.MAIN_CARETAKER, ROLES.SUB_CARETAKER, ROLES.PAID_DOCTOR].includes(role);

export const canSetClinicalBaselines = (role) =>
  [ROLES.MAIN_CARETAKER, ROLES.PAID_DOCTOR].includes(role);

export const canManageTasks = (role) =>
  [ROLES.MAIN_CARETAKER, ROLES.SUB_CARETAKER, ROLES.PAID_CARETAKER].includes(role);

export const canViewDocuments = (role) =>
  [ROLES.MAIN_CARETAKER, ROLES.SUB_CARETAKER, ROLES.FAMILY_MEMBER, ROLES.PAID_DOCTOR].includes(role);

export const canUploadDocuments = (role) =>
  [ROLES.MAIN_CARETAKER, ROLES.SUB_CARETAKER, ROLES.PAID_DOCTOR].includes(role);

export const canLogVitalsAndSymptoms = (_role) => true; // All circle members can log vitals and symptoms

export const canLogCareNotes = (_role) => true; // All circle members can log shift notes

export const INVITATION_ROLES = [
  ROLES.SUB_CARETAKER,
  ROLES.FAMILY_MEMBER,
  ROLES.PAID_DOCTOR,
  ROLES.PAID_CARETAKER,
];

export const INVITATION_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
};

export const ALL_INVITATION_STATUSES = Object.values(INVITATION_STATUS);

export const INVITATION_STATUS_LABELS = {
  [INVITATION_STATUS.PENDING]: 'Pending',
  [INVITATION_STATUS.ACCEPTED]: 'Accepted',
  [INVITATION_STATUS.EXPIRED]: 'Expired',
  [INVITATION_STATUS.REVOKED]: 'Revoked',
};

export const INVITATION_STATUS_BADGE_VARIANTS = {
  [INVITATION_STATUS.PENDING]: 'primary',
  [INVITATION_STATUS.ACCEPTED]: 'success',
  [INVITATION_STATUS.EXPIRED]: 'neutral',
  [INVITATION_STATUS.REVOKED]: 'error',
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.MAIN_CARETAKER]: 'Primary family administrator with full access to manage circle members, invitations, baseline vitals, and care workflows.',
  [ROLES.SUB_CARETAKER]: 'Co-caretaker who can manage medications, tasks, care notes, and shift handovers.',
  [ROLES.FAMILY_MEMBER]: 'Family relative with access to view daily care routines, log doses taken, view documents, and add care notes.',
  [ROLES.CARE_RECEIVER]: 'Patient / care recipient with access to their own daily medication schedule and health timeline.',
  [ROLES.PAID_DOCTOR]: 'Licensed medical practitioner who can prescribe medications, set clinical baseline vitals, and access medical records.',
  [ROLES.PAID_CARETAKER]: 'Professional hired nurse / aide who can manage daily tasks, record medication doses, and log shift handovers.',
};

/**
 * Task Constants & Capabilities
 */
export const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const ALL_TASK_STATUSES = Object.values(TASK_STATUS);

export const TASK_STATUS_LABELS = {
  [TASK_STATUS.PENDING]: 'Pending',
  [TASK_STATUS.IN_PROGRESS]: 'In Progress',
  [TASK_STATUS.COMPLETED]: 'Completed',
  [TASK_STATUS.CANCELLED]: 'Cancelled',
};

export const TASK_STATUS_BADGE_VARIANTS = {
  [TASK_STATUS.PENDING]: 'neutral',
  [TASK_STATUS.IN_PROGRESS]: 'primary',
  [TASK_STATUS.COMPLETED]: 'success',
  [TASK_STATUS.CANCELLED]: 'error',
};

export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

export const ALL_TASK_PRIORITIES = Object.values(TASK_PRIORITY);

export const TASK_PRIORITY_LABELS = {
  [TASK_PRIORITY.LOW]: 'Low',
  [TASK_PRIORITY.MEDIUM]: 'Medium',
  [TASK_PRIORITY.HIGH]: 'High',
  [TASK_PRIORITY.URGENT]: 'Urgent',
};

export const TASK_PRIORITY_BADGE_VARIANTS = {
  [TASK_PRIORITY.LOW]: 'neutral',
  [TASK_PRIORITY.MEDIUM]: 'primary-dim',
  [TASK_PRIORITY.HIGH]: 'warning',
  [TASK_PRIORITY.URGENT]: 'error',
};

export const TASK_CATEGORIES = [
  'MEDICATION',
  'VITALS',
  'MEALS',
  'MOBILITY',
  'APPOINTMENT',
  'ERRAND',
  'HYGIENE',
  'GENERAL',
];

export const TASK_CATEGORY_LABELS = {
  MEDICATION: 'Medication',
  VITALS: 'Vitals & Biometrics',
  MEALS: 'Meals & Nutrition',
  MOBILITY: 'Mobility & Exercise',
  APPOINTMENT: 'Doctor Appointment',
  ERRAND: 'Errand & Supplies',
  HYGIENE: 'Personal Care & Hygiene',
  GENERAL: 'General Care',
};

export const TASK_CATEGORY_ICONS = {
  MEDICATION: 'medication',
  VITALS: 'vital_signs',
  MEALS: 'restaurant',
  MOBILITY: 'directions_walk',
  APPOINTMENT: 'calendar_month',
  ERRAND: 'shopping_bag',
  HYGIENE: 'bathtub',
  GENERAL: 'task_alt',
};

export const TASK_TIME_SLOTS = [
  'morning',
  'afternoon',
  'evening',
  'night',
  'anytime',
];

export const TASK_TIME_SLOT_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
  anytime: 'Anytime',
};

export const TASK_TIME_SLOT_ICONS = {
  morning: 'wb_sunny',
  afternoon: 'light_mode',
  evening: 'wb_twilight',
  night: 'bedtime',
  anytime: 'schedule',
};

/**
 * Medication Constants & Capabilities
 */
export const MEDICATION_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DISCONTINUED: 'DISCONTINUED',
};

export const ALL_MEDICATION_STATUSES = Object.values(MEDICATION_STATUS);

export const MEDICATION_STATUS_LABELS = {
  [MEDICATION_STATUS.ACTIVE]: 'Active',
  [MEDICATION_STATUS.PAUSED]: 'Paused',
  [MEDICATION_STATUS.DISCONTINUED]: 'Discontinued',
};

export const MEDICATION_STATUS_BADGE_VARIANTS = {
  [MEDICATION_STATUS.ACTIVE]: 'success',
  [MEDICATION_STATUS.PAUSED]: 'warning',
  [MEDICATION_STATUS.DISCONTINUED]: 'neutral',
};

export const DOSE_STATUS = {
  TAKEN: 'TAKEN',
  SKIPPED: 'SKIPPED',
  MISSED: 'MISSED',
  RESCHEDULED: 'RESCHEDULED',
};

export const ALL_DOSE_STATUSES = Object.values(DOSE_STATUS);

export const DOSE_STATUS_LABELS = {
  [DOSE_STATUS.TAKEN]: 'Taken',
  [DOSE_STATUS.SKIPPED]: 'Skipped',
  [DOSE_STATUS.MISSED]: 'Missed',
  [DOSE_STATUS.RESCHEDULED]: 'Rescheduled',
  PENDING: 'Pending',
};

export const DOSE_STATUS_BADGE_VARIANTS = {
  [DOSE_STATUS.TAKEN]: 'success',
  [DOSE_STATUS.SKIPPED]: 'warning',
  [DOSE_STATUS.MISSED]: 'error',
  [DOSE_STATUS.RESCHEDULED]: 'primary-dim',
  PENDING: 'neutral',
};

export const DOSE_STATUS_ICONS = {
  [DOSE_STATUS.TAKEN]: 'check_circle',
  [DOSE_STATUS.SKIPPED]: 'do_not_disturb_on',
  [DOSE_STATUS.MISSED]: 'error',
  [DOSE_STATUS.RESCHEDULED]: 'update',
  PENDING: 'radio_button_unchecked',
};

export const MEDICATION_TIME_SLOTS = [
  'morning',
  'afternoon',
  'evening',
  'night',
  'as_needed',
];

export const MEDICATION_TIME_SLOT_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
  as_needed: 'As Needed (PRN)',
};

export const MEDICATION_TIME_SLOT_DEFAULTS = {
  morning: '08:00',
  afternoon: '14:00',
  evening: '18:00',
  night: '20:30',
  as_needed: '',
};

export const MEDICATION_TIME_SLOT_ICONS = {
  morning: 'wb_sunny',
  afternoon: 'light_mode',
  evening: 'wb_twilight',
  night: 'bedtime',
  as_needed: 'healing',
};

export const MEDICATION_FORMS = [
  'tablet',
  'capsule',
  'syrup',
  'injection',
  'drops',
  'ointment',
  'inhaler',
  'powder',
  'other',
];

export const MEDICATION_FORM_LABELS = {
  tablet: 'Tablet',
  capsule: 'Capsule',
  syrup: 'Syrup / Liquid',
  injection: 'Injection',
  drops: 'Drops',
  ointment: 'Ointment / Cream',
  inhaler: 'Inhaler / Nebulizer',
  powder: 'Powder / Sachet',
  other: 'Other Form',
};

export const MEDICATION_FORM_ICONS = {
  tablet: 'medication',
  capsule: 'pill',
  syrup: 'water_bottle',
  injection: 'vaccines',
  drops: 'opacity',
  ointment: 'clean_hands',
  inhaler: 'air',
  powder: 'grain',
  other: 'medical_services',
};

export const MEDICATION_FREQUENCIES = [
  'once_daily',
  'twice_daily',
  'thrice_daily',
  'four_times_daily',
  'as_needed',
  'every_other_day',
  'weekly',
  'custom',
];

export const MEDICATION_FREQUENCY_LABELS = {
  once_daily: 'Once Daily (1x)',
  twice_daily: 'Twice Daily (2x)',
  thrice_daily: 'Three Times Daily (3x)',
  four_times_daily: 'Four Times Daily (4x)',
  as_needed: 'As Needed (PRN)',
  every_other_day: 'Every Other Day',
  weekly: 'Weekly',
  custom: 'Custom Regimen',
};

export const FOOD_TIMINGS = [
  'with_meal',
  'before_meal',
  'after_meal',
  'empty_stomach',
  'no_restriction',
];

export const FOOD_TIMING_LABELS = {
  with_meal: 'With Meals',
  before_meal: 'Before Meals (30m prior)',
  after_meal: 'After Meals',
  empty_stomach: 'Empty Stomach (1h before / 2h after)',
  no_restriction: 'No Food Restrictions',
};

export const FOOD_TIMING_ICONS = {
  with_meal: 'restaurant',
  before_meal: 'fastfood',
  after_meal: 'dining',
  empty_stomach: 'no_meals',
  no_restriction: 'schedule',
};

/**
 * Care Note & Shift Handover Constants & Capabilities
 */
export const NOTE_CATEGORIES = [
  'GENERAL',
  'HANDOVER',
  'VITALS_DIET',
  'NIGHT_ROUTINE',
  'INCIDENT',
  'MEDICATION_OBSERVATION',
  'DOCTOR_VISIT',
];

export const NOTE_CATEGORY_LABELS = {
  GENERAL: 'General Observation',
  HANDOVER: 'Shift Handover',
  VITALS_DIET: 'Vitals & Nutrition',
  NIGHT_ROUTINE: 'Night Routine',
  INCIDENT: 'Incident Report',
  MEDICATION_OBSERVATION: 'Medication Note',
  DOCTOR_VISIT: 'Doctor Consultation',
};

export const NOTE_CATEGORY_ICONS = {
  GENERAL: 'notes',
  HANDOVER: 'published_with_changes',
  VITALS_DIET: 'monitor_heart',
  NIGHT_ROUTINE: 'bedtime',
  INCIDENT: 'warning',
  MEDICATION_OBSERVATION: 'medication',
  DOCTOR_VISIT: 'medical_services',
};

export const NOTE_CATEGORY_BADGE_VARIANTS = {
  GENERAL: 'neutral',
  HANDOVER: 'primary',
  VITALS_DIET: 'tertiary',
  NIGHT_ROUTINE: 'secondary',
  INCIDENT: 'error',
  MEDICATION_OBSERVATION: 'warning',
  DOCTOR_VISIT: 'doctor',
};

export const NOTE_SHIFTS = [
  'morning',
  'afternoon',
  'evening',
  'night',
  'none',
];

export const NOTE_SHIFT_LABELS = {
  morning: 'Morning Shift',
  afternoon: 'Afternoon Shift',
  evening: 'Evening Shift',
  night: 'Night Shift',
  none: 'No Specific Shift',
};

export const NOTE_SHIFT_ICONS = {
  morning: 'wb_sunny',
  afternoon: 'light_mode',
  evening: 'wb_twilight',
  night: 'bedtime',
  none: 'schedule',
};

export const NOTE_URGENCY = {
  NORMAL: 'NORMAL',
  IMPORTANT: 'IMPORTANT',
  URGENT: 'URGENT',
};

export const ALL_NOTE_URGENCIES = Object.values(NOTE_URGENCY);

export const NOTE_URGENCY_LABELS = {
  [NOTE_URGENCY.NORMAL]: 'Normal',
  [NOTE_URGENCY.IMPORTANT]: 'Important',
  [NOTE_URGENCY.URGENT]: 'Urgent Alert',
};

export const NOTE_URGENCY_BADGE_VARIANTS = {
  [NOTE_URGENCY.NORMAL]: 'neutral',
  [NOTE_URGENCY.IMPORTANT]: 'warning',
  [NOTE_URGENCY.URGENT]: 'error',
};

export const APPETITE_LEVELS = ['poor', 'fair', 'good', 'excellent'];

export const APPETITE_LABELS = {
  poor: 'Poor (Little/None)',
  fair: 'Fair (Half portion)',
  good: 'Good (Standard meal)',
  excellent: 'Excellent (Full & hearty)',
};

export const MOOD_LEVELS = ['calm', 'happy', 'anxious', 'irritable', 'confused', 'tired'];

export const MOOD_LABELS = {
  calm: 'Calm & Relaxed',
  happy: 'Happy & Cheerful',
  anxious: 'Anxious / Restless',
  irritable: 'Irritable / Agitated',
  confused: 'Confused / Disoriented',
  tired: 'Tired / Lethargic',
};

export const MOOD_ICONS = {
  calm: 'sentiment_satisfied',
  happy: 'sentiment_very_satisfied',
  anxious: 'sentiment_dissatisfied',
  irritable: 'mood_bad',
  confused: 'psychology_alt',
  tired: 'bedtime',
};

export const BOWEL_MOVEMENT_STATUS = ['none', 'normal', 'loose', 'constipated'];

export const BOWEL_MOVEMENT_LABELS = {
  none: 'None today',
  normal: 'Normal',
  loose: 'Loose / Diarrhea',
  constipated: 'Constipated / Hard',
};

export const canPinNotes = (role) =>
  [ROLES.MAIN_CARETAKER, ROLES.SUB_CARETAKER, ROLES.PAID_DOCTOR].includes(role);

export const canEditNote = (note, user, role) => {
  if (!note || !user) return false;
  const authorId = note.author?._id || note.author?.id || note.author;
  const userId = user._id || user.id;
  const isAuthor = String(authorId) === String(userId);
  const isCaretaker = [ROLES.MAIN_CARETAKER, ROLES.SUB_CARETAKER].includes(role);
  return isAuthor || isCaretaker;
};

export const canDeleteNote = (note, user, role) => {
  if (!note || !user) return false;
  const authorId = note.author?._id || note.author?.id || note.author;
  const userId = user._id || user.id;
  const isAuthor = String(authorId) === String(userId);
  const isCaretaker = [ROLES.MAIN_CARETAKER, ROLES.SUB_CARETAKER].includes(role);
  return isAuthor || isCaretaker;
};


