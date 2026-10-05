import { request, jsonOptions } from './hrRequest';

export const getAttendance = (month) => request(`/attendance?month=${encodeURIComponent(month)}`);
export const recordAttendance = (payload) => request('/attendance', jsonOptions('POST', payload));
