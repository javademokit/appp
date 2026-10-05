export function doctorDepartment(doctor) {
  return doctor?.departmentName || doctor?.department || doctor?.doctorDestination || '';
}

export function doctorOptionLabel(doctor) {
  return [doctor?.doctorName, doctor?.doctorSpecialistName, doctorDepartment(doctor)]
    .filter(Boolean)
    .join(' · ');
}

export function findDoctorDepartment(doctor, departments) {
  const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const values = [doctor?.departmentId, doctor?.departmentName, doctor?.department, doctor?.doctorDestination]
    .map(normalize).filter(Boolean);
  const candidates = (Array.isArray(departments) ? departments : []).map((department) => ({
    department,
    values: [department.id, department.name, department.code].map(normalize).filter(Boolean),
  }));

  const exactMatches = candidates.filter(({ values: departmentValues }) =>
    values.some((value) => departmentValues.includes(value)));
  if (exactMatches.length === 1) return exactMatches[0].department;
  if (exactMatches.length > 1) return null;

  const partialMatches = candidates.filter(({ values: departmentValues }) =>
    values.some((profileValue) => departmentValues.some((departmentValue) =>
      Math.min(profileValue.length, departmentValue.length) >= 4
      && (profileValue.includes(departmentValue) || departmentValue.includes(profileValue)))));
  return partialMatches.length === 1 ? partialMatches[0].department : null;
}
