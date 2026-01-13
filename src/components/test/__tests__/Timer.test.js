import { render, screen } from '@testing-library/react';
import Timer from '../Timer';

describe('Timer Component', () => {
  it('should render timer with time remaining', () => {
    render(<Timer timeRemaining={3600} />);
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });

  it('should display formatted time correctly', () => {
    render(<Timer timeRemaining={125} />);
    expect(screen.getByText(/2:05/)).toBeInTheDocument();
  });

  it('should show label when provided', () => {
    render(<Timer timeRemaining={3600} label="Test Timer" />);
    expect(screen.getByText('Test Timer')).toBeInTheDocument();
  });

  it('should apply warning color when below warning threshold', () => {
    render(<Timer timeRemaining={250} warningThreshold={300} />);
    expect(screen.getByText(/\d+:\d+/)).toHaveClass('text-orange-500');
  });

  it('should apply critical color when below critical threshold', () => {
    render(<Timer timeRemaining={30} criticalThreshold={60} />);
    expect(screen.getByText(/\d+:\d+/)).toHaveClass('text-red-600');
  });

  it('should apply pulse animation when critical', () => {
    render(<Timer timeRemaining={30} criticalThreshold={60} />);
    expect(screen.getByText(/\d+:\d+/)).toHaveClass('animate-pulse');
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<Timer timeRemaining={3600} size="sm" />);
    expect(screen.getByText(/\d+:\d+/)).toHaveClass('text-lg');

    rerender(<Timer timeRemaining={3600} size="lg" />);
    expect(screen.getByText(/\d+:\d+/)).toHaveClass('text-3xl');
  });

  it('should show icon when showIcon is true', () => {
    render(<Timer timeRemaining={3600} showIcon={true} />);
    const timer = screen.getByRole('timer');
    // eslint-disable-next-line testing-library/no-node-access
    expect(timer.querySelector('svg')).toBeInTheDocument();
  });

  it('should not show icon by default', () => {
    render(<Timer timeRemaining={3600} />);
    const timer = screen.getByRole('timer');
    // eslint-disable-next-line testing-library/no-node-access
    expect(timer.querySelector('svg')).not.toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<Timer timeRemaining={3600} label="Time Left" />);
    const timer = screen.getByRole('timer');
    expect(timer).toHaveAttribute('aria-live', 'polite');
    expect(timer).toHaveAttribute('aria-label');
  });

  it('should handle zero time remaining', () => {
    render(<Timer timeRemaining={0} />);
    expect(screen.getByText(/0:00/)).toBeInTheDocument();
  });

  it('should handle large time values', () => {
    render(<Timer timeRemaining={7200} />); // 2 hours
    expect(screen.getByText(/2:00:00/)).toBeInTheDocument();
  });
});
