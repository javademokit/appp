import { render, screen } from '@testing-library/react';
import Footer from './Footer';

test('shows hospital contact details and working email and phone links', () => {
  render(<Footer />);

  expect(screen.getByText('Whitefield, Bengaluru')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '18000555422' })).toHaveAttribute('href', 'tel:18000555422');
  expect(screen.getByRole('link', { name: 'admin@medora.local' })).toHaveAttribute('href', 'mailto:admin@medora.local');
});
