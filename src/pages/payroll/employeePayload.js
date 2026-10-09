const optionalEmployeeFields = ['managerId', 'doctorConsultationFee'];

export function omitBlankOptionalEmployeeFields(values) {
  return Object.fromEntries(Object.entries(values).filter(([key, value]) => (
    !optionalEmployeeFields.includes(key)
    || (value != null && (typeof value !== 'string' || value.trim() !== ''))
  )));
}
