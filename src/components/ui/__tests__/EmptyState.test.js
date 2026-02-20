import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from '../EmptyState';

describe('EmptyState Component', () => {
  it('should render with title and description', () => {
    render(
      <EmptyState
        title="No Data"
        description="There is no data to display"
      />
    );
    
    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.getByText('There is no data to display')).toBeInTheDocument();
  });

  it('should render with predefined icon', () => {
    const { container } = render(
      <EmptyState
        title="No Bookmarks"
        description="You haven't bookmarked anything yet"
        icon="bookmarks"
      />
    );
    

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should render action button when provided', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        description="Nothing here"
        actionLabel="Add Item"
        onAction={handleClick}
      />
    );
    
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('should call onAction when button clicked', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        description="Nothing here"
        actionLabel="Click Me"
        onAction={handleClick}
      />
    );
    
    const button = screen.getByText('Click Me');
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not render button when no action provided', () => {
    render(
      <EmptyState
        title="Empty"
        description="Nothing here"
      />
    );
    
    const button = screen.queryByRole('button');
    expect(button).not.toBeInTheDocument();
  });

  it('should render with different variants', () => {
    const { rerender } = render(
      <EmptyState
        title="Empty"
        description="Nothing here"
        variant="default"
      />
    );
    
    expect(screen.getByText('Empty').closest('[class]')).toBeTruthy();
    
    rerender(
      <EmptyState
        title="Empty"
        description="Nothing here"
        variant="subtle"
      />
    );
    
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('should render without description', () => {
    render(
      <EmptyState
        title="Empty State"
      />
    );
    
    expect(screen.getByText('Empty State')).toBeInTheDocument();
  });

  it('should render all predefined icon types', () => {
    const icons = ['bookmarks', 'tests', 'search', 'error'];
    
    icons.forEach(icon => {
      render(
        <EmptyState
          title={`Test ${icon}`}
          icon={icon}
        />
      );
      expect(screen.getByText(`Test ${icon}`)).toBeInTheDocument();
    });
  });
});
