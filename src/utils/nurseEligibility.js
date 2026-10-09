export const isAssignableNurse = (nurse) => nurse.employmentActive
  && (nurse.profileComplete ? nurse.status === 'ACTIVE' : Boolean(nurse.accountId || nurse.walkIn));
