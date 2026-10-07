import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NurseAssignmentPortal from './NurseAssignmentPortal';
import { apiFetch } from '../API/api';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

const jsonResponse = (data) => ({ ok: true, json: async () => data });

describe('NurseAssignmentPortal', () => {
  beforeEach(() => {
    apiFetch.mockImplementation((path) => {
      if (path === '/users/me') return Promise.resolve(jsonResponse({ roles: ['NURSE'] }));
      if (path === '/nursing/nurses') return Promise.resolve(jsonResponse([
        {
          id: 'nurse-account-1',
          name: 'Anita Sharma',
          employeeCode: 'NUR-12345678',
          mobileNo: '555-0100',
          employmentActive: true,
        },
      ]));
      if (path === '/nursing/nurses/nurse-account-1/assignments') {
        return Promise.resolve(jsonResponse([{
          assignment: { id: 'assignment-1', patientId: 'PT-100', shift: 'MORNING', role: 'PRIMARY' },
          patient: {
            patientId: 'PT-100',
            patientName: 'Riya Shah',
            patientmobileNo: '555-0199',
            patientAdmitdate: '2026-10-07',
          },
          ward: { name: 'ICU' },
          bed: { bedNumber: 'B-12' },
        }]));
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('searches by nurse employee ID and shows selected nurse assignments', async () => {
    render(<NurseAssignmentPortal />);

    const search = await screen.findByRole('searchbox', { name: /search by nurse id/i });
    fireEvent.change(search, { target: { value: 'NUR-123' } });
    fireEvent.change(screen.getByLabelText('Select nurse'), { target: { value: 'nurse-account-1' } });

    expect(await screen.findByText('Riya Shah')).toBeInTheDocument();
    expect(screen.getByText('NUR-12345678 · 555-0100')).toBeInTheDocument();
    expect(screen.getByText('ICU')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/nursing/nurses/nurse-account-1/assignments');
  });
});
