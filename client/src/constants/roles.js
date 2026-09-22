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
