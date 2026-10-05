import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import HomePage from './homePage';

jest.mock('react-router-dom', () => {
  const React = jest.requireActual('react');
  return {
    Link: ({ to, ...props }) => React.createElement('a', { ...props, href: to }),
  };
}, { virtual: true });

test('shows a clear appointment action and links to each portal', () => {
  render(<HomePage />);

  expect(screen.getByRole('heading', { name: 'Ayurved Hospital Patna' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Book an appointment/ })).toHaveAttribute('href', '/PatientLogin');
  expect(screen.getByRole('link', { name: 'Patient login' })).toHaveAttribute('href', '/PatientLogin');
  expect(screen.getByRole('link', { name: 'Doctor login' })).toHaveAttribute('href', '/DoctorLogin');
  expect(screen.getByRole('link', { name: 'Hospital portal' })).toHaveAttribute('href', '/HospitalLogin');
  expect(screen.getByRole('heading', { name: 'Hospital services' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Hospital entrance' }).parentElement)
    .toHaveClass('med-home-video-scene');
  expect(screen.getByText('Book an appointment', { selector: 'strong' })).toBeInTheDocument();
});

test('offers appointment help through the home-page assistant', () => {
  render(<HomePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Open assistant for help' }));

  expect(screen.getByRole('region', { name: 'MedSuite assistance' })).toBeInTheDocument();
  expect(screen.getByText(/I can help with appointments/)).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Ask the assistant' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Appointments' }));
  expect(screen.getByText(/choose “Book an appointment”/)).toBeInTheDocument();
});
