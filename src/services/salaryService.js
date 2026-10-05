import { request, jsonOptions } from './hrRequest';

export const getSalaryComponents = () => request('/salary/components');
export const getSalaryStructures = () => request('/salary/structures');
export const createSalaryComponent = (payload) => request('/salary/components', jsonOptions('POST', payload));
export const createSalaryStructure = (payload) => request('/salary/structures', jsonOptions('POST', payload));
export const saveSalaryRecord = (kind, payload) => request(
  kind === 'component' ? '/salary/components' : '/salary/structures',
  jsonOptions('POST', payload),
);
