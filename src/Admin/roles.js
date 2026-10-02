// roles.js
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HOSPITAL_ADMIN: 'HOSPITAL_ADMIN',
  CLINIC_ADMIN: 'CLINIC_ADMIN',
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  RECEPTIONIST: 'RECEPTIONIST',
  CRM_EXECUTIVE: 'CRM_EXECUTIVE',
  BILLING_EXECUTIVE: 'BILLING_EXECUTIVE',
  PHARMACIST: 'PHARMACIST',
  LAB_TECHNICIAN: 'LAB_TECHNICIAN',
  PATIENT: 'PATIENT',
};

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.CLINIC_ADMIN];
const STAFF_ROLES = [
  ROLES.DOCTOR,
  ROLES.NURSE,
  ROLES.RECEPTIONIST,
  ROLES.CRM_EXECUTIVE,
  ROLES.BILLING_EXECUTIVE,
  ROLES.PHARMACIST,
  ROLES.LAB_TECHNICIAN,
];

export const normalizeRoles = (roles) => (Array.isArray(roles) ? roles : [])
  .filter((role) => typeof role === 'string')
  .map((role) => role.trim().toUpperCase().replace(/^ROLE_/, ''));

export const getPortalPathForRoles = (roles) => {
  const normalizedRoles = normalizeRoles(roles);
  if (normalizedRoles.some((role) => ADMIN_ROLES.includes(role))) return '/AdminDashboard';
  if (normalizedRoles.includes(ROLES.DOCTOR)) return '/DoctorDashboard';
  if (normalizedRoles.some((role) => STAFF_ROLES.includes(role))) return '/HospitalDashboard';
  if (normalizedRoles.includes(ROLES.PATIENT)) return '/PatientPortal';
  return null;
};

export const STAFF_PORTAL_ROLES = [...ADMIN_ROLES, ...STAFF_ROLES];
export const HOSPITAL_WORKSPACE_ROLES = STAFF_PORTAL_ROLES.filter((role) => role !== ROLES.DOCTOR);
  