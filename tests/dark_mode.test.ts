import { render, screen } from '@testing-library/react';
import App from '../frontend/src/components/layout/AppLayout';

describe('Dark Mode Tests', () => {
  test('renders in dark mode for User Persona', () => {
    render(<App persona="User" />);
    const appElement = screen.getByTestId('app-container');
    expect(appElement).toHaveClass('dark-mode');
  });

  test('renders in dark mode for Admin Persona', () => {
    render(<App persona="Admin" />);
    const appElement = screen.getByTestId('app-container');
    expect(appElement).toHaveClass('dark-mode');
  });

  test('renders in dark mode for Guest Persona', () => {
    render(<App persona="Guest" />);
    const appElement = screen.getByTestId('app-container');
    expect(appElement).toHaveClass('dark-mode');
  });
});
