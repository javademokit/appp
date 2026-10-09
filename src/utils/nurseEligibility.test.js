import { isAssignableNurse } from './nurseEligibility';

describe('isAssignableNurse', () => {
  test('allows an active nurse account whose nursing profile has not been created yet', () => {
    expect(isAssignableNurse({
      employmentActive: true,
      profileComplete: false,
      accountId: 'nurse-account-1',
      status: 'PROFILE_REQUIRED',
    })).toBe(true);
  });

  test('does not allow nurses with inactive employment, account, or profile', () => {
    expect(isAssignableNurse({
      employmentActive: false,
      profileComplete: false,
      accountId: 'nurse-account-1',
    })).toBe(false);
    expect(isAssignableNurse({
      employmentActive: true,
      profileComplete: false,
      accountId: '',
      walkIn: false,
    })).toBe(false);
    expect(isAssignableNurse({
      employmentActive: true,
      profileComplete: true,
      status: 'INACTIVE',
    })).toBe(false);
  });
});
