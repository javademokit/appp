import { omitBlankOptionalEmployeeFields } from './employeePayload';

describe('omitBlankOptionalEmployeeFields', () => {
  test('omits an empty reporting manager and consultation fee', () => {
    expect(omitBlankOptionalEmployeeFields({
      firstName: 'Asha',
      managerId: '',
      doctorConsultationFee: null,
    })).toEqual({ firstName: 'Asha' });
  });

  test('preserves selected managers and zero consultation fees', () => {
    expect(omitBlankOptionalEmployeeFields({
      managerId: 'manager-1',
      doctorConsultationFee: 0,
    })).toEqual({
      managerId: 'manager-1',
      doctorConsultationFee: 0,
    });
  });
});
