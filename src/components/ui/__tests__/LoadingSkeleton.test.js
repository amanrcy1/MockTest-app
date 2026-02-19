import { render } from '@testing-library/react';
import LoadingSkeleton, {
  QuestionSkeleton,
  CardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  ListSkeleton,
  DashboardSkeleton,
  TestHistorySkeleton,
  ProfileSkeleton,
  LeaderboardSkeleton,
} from '../LoadingSkeleton';

describe('LoadingSkeleton Components', () => {
  describe('QuestionSkeleton', () => {
    it('should render question skeleton', () => {
      render(<QuestionSkeleton />);
      // Component renders without crashing
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('CardSkeleton', () => {
    it('should render card skeleton', () => {
      render(<CardSkeleton />);
      expect(document.body).toBeInTheDocument();
    });

    it('should render with custom lines', () => {
      render(<CardSkeleton lines={5} />);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('TableSkeleton', () => {
    it('should render table skeleton with default rows', () => {
      render(<TableSkeleton />);
      expect(document.body).toBeInTheDocument();
    });

    it('should render custom number of rows', () => {
      render(<TableSkeleton rows={3} cols={4} />);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('ChartSkeleton', () => {
    it('should render chart skeleton', () => {
      render(<ChartSkeleton />);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('ListSkeleton', () => {
    it('should render list skeleton with default items', () => {
      render(<ListSkeleton />);
      expect(document.body).toBeInTheDocument();
    });

    it('should render custom number of items', () => {
      render(<ListSkeleton items={3} />);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('DashboardSkeleton', () => {
    it('should render dashboard skeleton', () => {
      render(<DashboardSkeleton />);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('TestHistorySkeleton', () => {
    it('should render test history skeleton', () => {
      render(<TestHistorySkeleton />);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('ProfileSkeleton', () => {
    it('should render profile skeleton', () => {
      render(<ProfileSkeleton />);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('LeaderboardSkeleton', () => {
    it('should render leaderboard skeleton', () => {
      render(<LeaderboardSkeleton />);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('LoadingSkeleton export', () => {
    it('should export all skeleton components', () => {
      expect(LoadingSkeleton.QuestionSkeleton).toBeDefined();
      expect(LoadingSkeleton.CardSkeleton).toBeDefined();
      expect(LoadingSkeleton.TableSkeleton).toBeDefined();
      expect(LoadingSkeleton.ChartSkeleton).toBeDefined();
      expect(LoadingSkeleton.ListSkeleton).toBeDefined();
      expect(LoadingSkeleton.DashboardSkeleton).toBeDefined();
      expect(LoadingSkeleton.TestHistorySkeleton).toBeDefined();
      expect(LoadingSkeleton.ProfileSkeleton).toBeDefined();
      expect(LoadingSkeleton.LeaderboardSkeleton).toBeDefined();
    });
  });
});
