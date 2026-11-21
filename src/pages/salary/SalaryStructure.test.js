import { render, screen } from '@testing-library/react';
import SalaryStructure from './SalaryStructure';

test('shows monthly and annual CTC for the standard salary template', () => {
  const components = [
    { id: 'basic', type: 'EARNING' },
    { id: 'hra', type: 'EARNING' },
    { id: 'special', type: 'EARNING' },
    { id: 'pf', type: 'EMPLOYER_CONTRIBUTION' },
    { id: 'bonus', type: 'EARNING' },
  ];
  const structures = [{
    id: 'structure-1',
    employeeName: 'Aadi raj',
    employeeCode: 'DT-2036E73D',
    effectiveFrom: '2026-12-01',
    effectiveTo: '2026-12-31',
    status: 'ACTIVE',
    components: [
      { componentId: 'basic', amount: 40000, units: 1 },
      { componentId: 'hra', amount: 20000, units: 1 },
      { componentId: 'special', amount: 25000, units: 1 },
      { componentId: 'pf', amount: 4800, units: 1 },
      { componentId: 'bonus', amount: 1000, units: 1 },
    ],
  }];

  render(<SalaryStructure structures={structures} components={components} onAssign={() => {}} />);

  expect(screen.getByText('Monthly CTC')).toBeInTheDocument();
  expect(screen.getByText('Annual CTC')).toBeInTheDocument();
  expect(screen.getByText('₹90,800')).toBeInTheDocument();
  expect(screen.getByText('₹10,89,600')).toBeInTheDocument();
});
