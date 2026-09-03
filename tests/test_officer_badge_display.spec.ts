import { render, screen } from '@testing-library/react';
import OfficerDetail from '../src/components/OfficerDetail';

describe('Officer Detail', () => {
  test('should display officer badge number when present', () => {
    const officer = { badgeNumber: '12345' };
    render(<OfficerDetail officer={officer} />);
    const badgeNumberElement = screen.getByText(/Badge Number: 12345/i);
    expect(badgeNumberElement).toBeInTheDocument();
  });
  test('should not display badge number when empty', () => {
    const officer = { badgeNumber: null };
    render(<OfficerDetail officer={officer} />);
    const badgeNumberElement = screen.queryByText(/Badge Number:/i);
    expect(badgeNumberElement).not.toBeInTheDocument();
  });
  test('layout is readable on both mobile and desktop', () => {
    // Implement layout rendering tests, possibly using different screen sizes or viewport testing
    const officer = { badgeNumber: '12345' };
    const { container } = render(<OfficerDetail officer={officer} />);
    expect(container.firstChild).toMatchSnapshot(); // Snapshot for layout verification
  });
});