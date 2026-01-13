import { render, screen, fireEvent } from '@testing-library/react';
// Import directly, not from the barrel (which is mocked in setupTests)
import ErrorBoundary from '../ErrorBoundary';

const ThrowError = () => { throw new Error('Test error'); };
const WorkingComponent = () => <div>Working</div>;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Working')).toBeInTheDocument();
  });

  it('should show fallback UI on error', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('should show try again button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should show go to dashboard button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
  });

  it('should recover when try again is clicked', () => {
    // Use a component that can be toggled to throw or not
    let shouldThrow = true;
    const MaybeThrow = () => {
      if (shouldThrow) throw new Error('Test error');
      return <div>Working</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    
    // Stop throwing before clicking retry
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    
    // After retry with no error, should show working content
    rerender(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Working')).toBeInTheDocument();
  });
});
