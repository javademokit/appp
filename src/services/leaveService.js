import { request, jsonOptions } from './hrRequest';

export const getLeaveRequests = (path = '/leaves') => request(path);
export const createLeaveRequest = (payload) => request('/leaves', jsonOptions('POST', payload));
export const decideLeaveRequest = (leave, decision) => request(
  `/leaves/${leave.id}/${decision}`,
  jsonOptions('PUT', {}),
);
