import { render } from '@testing-library/react';
import LoadingSkeleton, {
  QuestionSkeleton,
  CardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  ListSkeleton,
} from '../LoadingSkeleton';

describe('LoadingSkeleton Components', () => {
  describe('QuestionSkeleton', () => {
    it('should render question skeleton', () => {
      const { container } = render(<QuestionSkeleton />);
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should render 4 option placeholders', () => {
      const { container } = render(<QuestionSkeleton />);
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const options = container.querySelectorAll('.h-14');
      expect(options.length).toBe(4);
    });
  });

  describe('CardSkeleton', () => {
    it('should render card skeleton', () => {
      const { container } = render(<CardSkeleton />);
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('TableSkeleton', () => {
    it('should render table skeleton with default rows', () => {
      const { container } = render(<TableSkeleton />);
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should render custom number of rows', () => {
      const { container } = render(<TableSkeleton rows={3} cols={4} />);
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      // The header has border-b too, so we check for rows with both p-4 and border-b (excluding header which has bg-gray-50)
      const dataRows = container.querySelectorAll('.p-4.border-b:not(.bg-gray-50)');
      expect(dataRows.length).toBe(3);
    });
  });

  describe('ChartSkeleton', () => {
    it('should render chart skeleton', () => {
      const { container } = render(<ChartSkeleton />);
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      expect(container.querySelector('.h-48')).toBeInTheDocument();
    });
  });

  describe('ListSkeleton', () => {
    it('should render list skeleton with default items', () => {
      const { container } = render(<ListSkeleton />);
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const items = container.querySelectorAll('.animate-pulse');
      expect(items.length).toBe(5);
    });

    it('should render custom number of items', () => {
      const { container } = render(<ListSkeleton items={3} />);
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const items = container.querySelectorAll('.animate-pulse');
      expect(items.length).toBe(3);
    });
  });

  describe('LoadingSkeleton export', () => {
    it('should export all skeleton components', () => {
      expect(LoadingSkeleton.QuestionSkeleton).toBeDefined();
      expect(LoadingSkeleton.CardSkeleton).toBeDefined();
      expect(LoadingSkeleton.TableSkeleton).toBeDefined();
      expect(LoadingSkeleton.ChartSkeleton).toBeDefined();
      expect(LoadingSkeleton.ListSkeleton).toBeDefined();
    });
  });
});
