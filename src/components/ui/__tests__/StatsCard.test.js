import { render, screen } from '@testing-library/react';
import StatsCard from '../StatsCard';

describe('StatsCard Component', () => {
  it('should render with title and value', () => {
    render(<StatsCard title="Total Tests" value={42} />);
    
    expect(screen.getByText('Total Tests')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render with icon when provided', () => {
    render(
      <StatsCard
        title="Score"
        value={85}
        icon={<span>🎯</span>}
      />
    );
    
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('should apply color variant classes', () => {
    const { rerender } = render(
      <StatsCard title="Test" value={100} color="green" />
    );
    
    expect(screen.getByText('100').closest('[class*="green"]')).toBeTruthy(); // eslint-disable-line testing-library/no-node-access
    
    rerender(<StatsCard title="Test" value={100} color="red" />);
    expect(screen.getByText('100').closest('[class*="red"]')).toBeTruthy(); // eslint-disable-line testing-library/no-node-access
    
    rerender(<StatsCard title="Test" value={100} color="yellow" />);
    expect(screen.getByText('100').closest('[class*="yellow"]')).toBeTruthy(); // eslint-disable-line testing-library/no-node-access
  });

  it('should handle string values', () => {
    render(<StatsCard title="Status" value="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should handle zero value', () => {
    render(<StatsCard title="Errors" value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should display trend when provided', () => {
    render(<StatsCard title="Score" value={85} trend={15} trendLabel="vs last week" />);
    expect(screen.getByText(/15%/)).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('should show positive trend with up arrow', () => {
    render(<StatsCard title="Score" value={85} trend={10} />);
    expect(screen.getByText(/↑/)).toBeInTheDocument();
  });

  it('should show negative trend with down arrow', () => {
    render(<StatsCard title="Score" value={75} trend={-5} />);
    expect(screen.getByText(/↓/)).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<StatsCard title="Test" value={100} loading={true} />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument(); // eslint-disable-line testing-library/no-node-access
  });

  it('should handle all color variants', () => {
    const colors = ['blue', 'green', 'purple', 'red', 'yellow', 'orange'];
    
    colors.forEach(color => {
      render(<StatsCard title={`Test-${color}`} value={100} color={color} />);
      expect(screen.getByText(`Test-${color}`)).toBeInTheDocument();
    });
  });

  it('should default to blue color when invalid color provided', () => {
    render(<StatsCard title="Test" value={100} color="invalid" />);
    expect(screen.getByText('100').closest('[class*="blue"]')).toBeTruthy(); // eslint-disable-line testing-library/no-node-access
  });
});
