import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import HomePage from './homePage';

jest.mock('react-router-dom', () => {
  const React = jest.requireActual('react');
  return {
    Link: ({ to, ...props }) => React.createElement('a', { ...props, href: to }),
  };
}, { virtual: true });

test('presents Medora AI and links visitors to the feature modules and hospital portals', () => {
  render(<HomePage />);

  expect(screen.getByRole('heading', { name: 'Run your hospital smarter with AI' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start free trial' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/HospitalLogin');
  expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '#care-services');
  expect(screen.getByRole('link', { name: 'Modules' })).toHaveAttribute('href', '#modules');
  expect(screen.getByRole('button', { name: /Book a demo/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'See features' })).toHaveAttribute('href', '#care-services');
  expect(screen.getByRole('heading', { name: 'Core modules' })).toBeInTheDocument();
  ['Patient CRM', 'Appointments', 'Patient monitoring', 'Medicine timetable'].forEach((name) => {
    expect(screen.getByRole('heading', { name })).toBeInTheDocument();
  });
  expect(screen.getByText('128')).toBeInTheDocument();
  expect(screen.getByText('34')).toBeInTheDocument();
  expect(screen.getByText('3 patients need a medicine check')).toBeInTheDocument();
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
