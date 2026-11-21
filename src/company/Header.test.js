import { render, screen } from '@testing-library/react';
import Header from './Header';

test('shows 24/7 care and a bold digital date and time display', () => {
  const { container } = render(<Header />);

  expect(screen.getByText('24/7 Care')).toBeInTheDocument();
  expect(container.querySelector('.header-date-label')).toBeInstanceOf(HTMLElement);
  expect(container.querySelector('.header-date-label')?.tagName).toBe('STRONG');
  expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeInTheDocument();
  expect(screen.getByLabelText(/^Current local date and time:/)).toBeInTheDocument();
});
