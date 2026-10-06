import { request, jsonOptions } from './hrRequest';

export const getOvertimeAllowances = (month, canApprove) => request(
  canApprove ? `/overtime-allowances?month=${encodeURIComponent(month)}` : '/overtime-allowances/mine',
);
export const requestOvertimeAllowance = (payload) => request(
  '/overtime-allowances',
  jsonOptions('POST', payload),
);
export const decideOvertimeAllowance = (requestRecord, decision, approvedAmount) => request(
  `/overtime-allowances/${requestRecord.id}/${decision}`,
  jsonOptions('PUT', decision === 'approve' ? { approvedAmount: String(approvedAmount) } : {}),
);
