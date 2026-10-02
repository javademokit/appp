import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import LabsDiagnosticsPage from './LabsDiagnosticsPage';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

const makeResponse = (data = {}) => ({
  ok: true,
  json: async () => data,
});

const makeOrder = () => ({
  id: 'lab-order-123456',
  patientId: 'PT-123456',
  patientName: 'Ada Patient',
  age: 45,
  gender: 'Female',
  testType: 'CBC',
  orderDate: '2026-10-02',
  status: 'ORDERED',
});

function mockWorkflowApi({ failFirstReportUpload = false } = {}) {
  let order = makeOrder();
  let shouldFailReportUpload = failFirstReportUpload;

  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/medical-tests' && !options.method) return makeResponse([order]);
    if (path === '/patients') return makeResponse([{ patientId: 'PT-123456', patientName: 'Ada Patient' }]);
    if (path === '/medical-tests' && options.method === 'POST') {
      order = { ...JSON.parse(options.body), id: 'lab-order-new', status: 'ORDERED' };
      return makeResponse(order);
    }
    if (path.endsWith('/sample')) {
      order = { ...order, status: 'IN_PROGRESS' };
      return makeResponse();
    }
    if (path.endsWith('/result')) {
      order = { ...order, resultSummary: JSON.parse(options.body).resultSummary, status: 'RESULT_READY' };
      return makeResponse();
    }
    if (path.endsWith('/review')) {
      order = { ...order, status: 'REVIEWED' };
      return makeResponse();
    }
    if (path.endsWith('/report')) {
      if (shouldFailReportUpload) {
        shouldFailReportUpload = false;
        throw new Error('Upload unavailable');
      }
      order = { ...order, reportFileId: 'report-1' };
      return makeResponse();
    }
    throw new Error(`Unexpected request: ${path}`);
  });
}

afterEach(() => {
  jest.clearAllMocks();
});

test('creates a diagnostic order against an existing Patient ID', async () => {
  mockWorkflowApi();
  render(<LabsDiagnosticsPage />);
  fireEvent.click(await screen.findByRole('button', { name: /New test order/ }));
  fireEvent.change(await screen.findByLabelText('Patient'), { target: { value: 'PT-123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create test order' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/medical-tests', expect.objectContaining({
    method: 'POST',
    body: expect.stringContaining('"patientId":"PT-123456"'),
  })));
});

test('moves a diagnostic order from sample collection through doctor review', async () => {
  mockWorkflowApi();
  render(<LabsDiagnosticsPage />);

  await screen.findByText('Ada Patient');
  fireEvent.click(screen.getByRole('button', { name: 'Collect sample' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Record result' }));
  fireEvent.change(screen.getByLabelText('Result summary'), { target: { value: 'CBC findings recorded' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save result' }));

  fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
  fireEvent.change(screen.getByLabelText('Review notes'), { target: { value: 'Reviewed by clinician' } });
  fireEvent.click(screen.getByRole('button', { name: 'Approve result' }));

  await waitFor(() => expect(screen.getByText('Reviewed')).toBeInTheDocument());
  expect(apiFetch).toHaveBeenCalledWith('/medical-tests/lab-order-123456/result', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ resultSummary: 'CBC findings recorded' }),
  }));
});

test('keeps a saved result and allows retrying a failed report upload', async () => {
  mockWorkflowApi({ failFirstReportUpload: true });
  render(<LabsDiagnosticsPage />);

  await screen.findByText('Ada Patient');
  fireEvent.click(screen.getByRole('button', { name: 'Collect sample' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Record result' }));
  fireEvent.change(screen.getByLabelText('Result summary'), { target: { value: 'CBC findings recorded' } });
  fireEvent.change(screen.getByLabelText(/Attach report/), {
    target: { files: [new File(['report'], 'cbc.txt', { type: 'text/plain' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save result' }));
  expect(await screen.findByText('Report must be a PDF, PNG, or JPEG file.')).toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalledWith('/medical-tests/lab-order-123456/result', expect.anything());

  fireEvent.change(screen.getByLabelText(/Attach report/), {
    target: { files: [new File(['report'], 'cbc.pdf', { type: 'application/pdf' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save result' }));

  expect(await screen.findByText(/Result recorded, but the report could not be uploaded/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Attach report' }));
  fireEvent.change(screen.getByLabelText(/Report \(PDF/), {
    target: { files: [new File(['report'], 'cbc.pdf', { type: 'application/pdf' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Upload report' }));

  await waitFor(() => expect(screen.getByRole('button', { name: 'View report' })).toBeInTheDocument());
});
