import { render, screen } from '@testing-library/react';
import Login from '../frontend/src/components/ui/Login'; // Adjust the import based on actual file path

describe('Login Page', () => {
  test('renders login page with beige background', () => {
    render(<Login />);
    const loginPage = screen.getByTestId('login-page'); // Assuming this test ID exists
    expect(loginPage).toHaveStyle('background-color: beige');
  });

  test('displays Ground Foreman persona on top after login', () => {
    render(<Login />);
    // Simulate login and persona display
    // Assume we have a method that logs in and sets the persona
    login('ground_foreman_user'); // This is a placeholder for actual login implementation
    const personaDisplay = screen.getByText('Ground Foreman');
    expect(personaDisplay).toBeInTheDocument();
  });
});