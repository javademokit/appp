import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:8080/api' });

// Get all wards
export const fetchWards = () => API.get('/wards');

// Get all nurses
export const fetchNurses = () => API.get('/nurses');

// Assign nurse to patient
export const assignNurse = (data) => API.post('/assign-nurse', data);

// Log patient care
export const logPatientCare = (data) => API.post('/care-log', data);

// Get patient care logs
export const getCareLogs = () => API.get('/care-log');
