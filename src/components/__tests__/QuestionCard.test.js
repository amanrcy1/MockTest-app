import { render, screen, fireEvent } from '@testing-library/react';
import QuestionCard from '../test/QuestionCard';

describe('QuestionCard', () => {
  const mockQuestion = {
    id: '1',
    questionText: 'What is the capital of France?',
    options: {
      A: 'London',
      B: 'Paris',
      C: 'Berlin',
      D: 'Madrid',
    },
    correctAnswer: 'B',
    subject: 'Geography',
    topic: 'European Capitals',
    solution: 'Paris is the capital of France.',
  };

  const defaultProps = {
    question: mockQuestion,
    questionNumber: 1,
    totalQuestions: 10,
    selectedAnswer: null,
    onAnswerSelect: jest.fn(),
    showFeedback: false,
    isCorrect: false,
    marksPerQuestion: 1,
    negativeMarking: -0.33,
    isBookmarked: false,
    onBookmark: jest.fn(),
    onReport: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render question text', () => {
    render(<QuestionCard {...defaultProps} />);
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
  });

  it('should render all options', () => {
    render(<QuestionCard {...defaultProps} />);
    expect(screen.getByText(/London/)).toBeInTheDocument();
    expect(screen.getByText(/Paris/)).toBeInTheDocument();
    expect(screen.getByText(/Berlin/)).toBeInTheDocument();
    expect(screen.getByText(/Madrid/)).toBeInTheDocument();
  });

  it('should call onAnswerSelect when option is clicked', () => {
    render(<QuestionCard {...defaultProps} />);
    const optionB = screen.getByRole('radio', { name: /Option B/ });
    fireEvent.click(optionB);
    expect(defaultProps.onAnswerSelect).toHaveBeenCalledWith('B');
  });

  it('should show selected answer', () => {
    render(<QuestionCard {...defaultProps} selectedAnswer="B" />);
    const optionB = screen.getByRole('radio', { name: /Option B/ });
    expect(optionB).toHaveAttribute('aria-checked', 'true');
  });

  it('should show feedback when enabled', () => {
    render(
      <QuestionCard 
        {...defaultProps} 
        selectedAnswer="B" 
        showFeedback={true}
        isCorrect={true}
      />
    );
    expect(screen.getByText(/Correct!/)).toBeInTheDocument();
  });

  it('should show solution in feedback', () => {
    render(
      <QuestionCard 
        {...defaultProps} 
        selectedAnswer="B" 
        showFeedback={true}
        isCorrect={true}
      />
    );
    expect(screen.getByText(/Paris is the capital of France/)).toBeInTheDocument();
  });

  it('should call onBookmark when bookmark button is clicked', () => {
    render(<QuestionCard {...defaultProps} />);
    const bookmarkBtn = screen.getByRole('button', { name: /Add bookmark/ });
    fireEvent.click(bookmarkBtn);
    expect(defaultProps.onBookmark).toHaveBeenCalled();
  });

  it('should show bookmarked state', () => {
    render(<QuestionCard {...defaultProps} isBookmarked={true} />);
    expect(screen.getByRole('button', { name: /Remove bookmark/ })).toBeInTheDocument();
  });

  it('should disable options when disabled prop is true', () => {
    render(<QuestionCard {...defaultProps} disabled={true} />);
    const options = screen.getAllByRole('radio');
    options.forEach(option => {
      expect(option).toBeDisabled();
    });
  });

  it('should display marks information', () => {
    render(<QuestionCard {...defaultProps} />);
    expect(screen.getByTitle(/Marks: \+1\.00 for correct, -0\.33 for wrong/)).toBeInTheDocument();
  });
});
