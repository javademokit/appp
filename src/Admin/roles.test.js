import { getPortalPathForRoles, HOSPITAL_WORKSPACE_ROLES, normalizeRoles, ROLES, STAFF_PORTAL_ROLES } from './roles';

test.each([
  [['DOCTOR'], '/DoctorDashboard'],
  [['nurse'], '/HospitalDashboard'],
  [['RECEPTIONIST'], '/HospitalDashboard'],
  [['ROLE_lab_technician'], '/HospitalDashboard'],
  [['BILLING_EXECUTIVE'], '/HospitalDashboard'],
  [['CLINIC_ADMIN'], '/AdminDashboard'],
  [['PATIENT'], '/PatientPortal'],
  [['unknown-role'], null],
])('routes role set %j to the appropriate portal', (roles, expectedPath) => {
  expect(getPortalPathForRoles(roles)).toBe(expectedPath);
});

test('staff dashboard accepts every configured staff role', () => {
  expect(STAFF_PORTAL_ROLES).toContain(ROLES.PHARMACIST);
  expect(STAFF_PORTAL_ROLES).toContain(ROLES.CRM_EXECUTIVE);
  expect(HOSPITAL_WORKSPACE_ROLES).not.toContain(ROLES.DOCTOR);
  expect(HOSPITAL_WORKSPACE_ROLES).toContain(ROLES.RECEPTIONIST);
  expect(normalizeRoles([' role_doctor ', null])).toEqual(['DOCTOR']);
});
