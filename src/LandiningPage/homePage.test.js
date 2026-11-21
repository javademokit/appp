import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import HomePage from './homePage';

const originalFetch = global.fetch;

jest.mock('react-router-dom', () => {
  const React = jest.requireActual('react');
  return {
    Link: ({ to, ...props }) => React.createElement('a', { ...props, href: to }),
  };
}, { virtual: true });

afterEach(() => {
  if (originalFetch) {
    global.fetch = originalFetch;
  } else {
    delete global.fetch;
  }
});

test('presents Medora AI and links visitors to the feature modules and hospital portals', () => {
  render(<HomePage />);

  expect(screen.getByRole('heading', { name: 'Run your hospital smarter with AI' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start free trial' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/HospitalLogin');
  expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '#care-services');
  expect(screen.getByRole('link', { name: 'Modules' })).toHaveAttribute('href', '#modules');
  expect(screen.getByRole('link', { name: 'Portals' })).toHaveAttribute('href', '#workspaces');
  expect(screen.getByRole('button', { name: /Book a demo/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'See features' })).toHaveAttribute('href', '#care-services');
  expect(screen.getByRole('heading', { name: 'Core modules' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'A workspace for every care journey' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Patient sign in' })).toHaveAttribute('href', '/PatientLogin');
  expect(screen.getByRole('link', { name: 'Doctor sign in' })).toHaveAttribute('href', '/DoctorLogin');
  expect(screen.getByRole('link', { name: 'Staff sign in' })).toHaveAttribute('href', '/HospitalLogin');
  ['Patient CRM', 'Appointments', 'Patient monitoring', 'Medicine timetable'].forEach((name) => {
    expect(screen.getByRole('heading', { name })).toBeInTheDocument();
  });
  expect(screen.getByRole('img', { name: 'A bright, modern hospital reception and waiting area' })).toBeInTheDocument();
  expect(screen.queryByText('SAMPLE DASHBOARD')).not.toBeInTheDocument();
  expect(screen.queryByText('3 patients need a medicine check')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open Ask Medora chat' })).toHaveTextContent('Ask Medora');
});

test('offers appointment help through the home-page assistant', () => {
  render(<HomePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Ask Medora chat' }));

  expect(screen.getByRole('region', { name: 'Medora AI assistance' })).toBeInTheDocument();
  expect(screen.getByText(/I can help with appointments/)).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Ask the assistant' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Appointments' }));
  expect(screen.getByRole('link', { name: 'Sign in to book an appointment' })).toHaveAttribute('href', '/PatientLogin');
});

test('links typed appointment scheduling questions to the patient portal', () => {
  render(<HomePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Ask Medora chat' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Ask the assistant' }), {
    target: { value: 'Can I schedule a visit?' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

  expect(screen.getByRole('link', { name: 'Sign in to book an appointment' })).toHaveAttribute('href', '/PatientLogin');
});

test('opens Ask Medora from the demo action with demo scheduling guidance', () => {
  render(<HomePage />);
  fireEvent.click(screen.getByRole('button', { name: /Book a demo/ }));

  expect(screen.getByRole('region', { name: 'Medora AI assistance' })).toBeInTheDocument();
  expect(screen.getByText('Thanks for your interest in Medora AI. Please contact your hospital administrator to arrange a product demo.'))
    .toBeInTheDocument();
});

test('opens Ask Medora from the free trial button with trial access guidance', () => {
  render(<HomePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Start free trial' }));

  expect(screen.getByRole('region', { name: 'Medora AI assistance' })).toBeInTheDocument();
  expect(screen.getByText('Thanks for your interest in a Medora AI free trial. Please contact your hospital administrator to discuss trial access.'))
    .toBeInTheDocument();
});

test('answers open-ended product questions with the configured local Ollama model', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: 'Local model reply' } }),
  });
  render(<HomePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Ask Medora chat' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Ask the assistant' }), {
    target: { value: 'What features does Medora have?' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

  expect(await screen.findByText('Local model reply')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/api/chat', expect.objectContaining({
    method: 'POST',
    body: expect.stringContaining('"model":"llama3.2:latest"'),
  }));
  const request = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(request.messages[0].content).toContain('Use only these facts');
  expect(request.messages[0].content).toContain('Never diagnose');
  expect(screen.getByText(/Do not share health details/)).toBeInTheDocument();
});

test('shows an actionable message when local Ollama is unavailable', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('connection refused'));
  render(<HomePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Ask Medora chat' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Ask the assistant' }), {
    target: { value: 'What features does Medora have?' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

  expect(await screen.findByText(/could not get a reply from local Ollama/)).toBeInTheDocument();
});
