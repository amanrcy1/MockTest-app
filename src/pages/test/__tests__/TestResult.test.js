import { render, screen, waitFor } from '@testing-library/react';
import TestResult from '../TestResult';
import { getDocs } from 'firebase/firestore';

const routerMock = require('react-router-dom');
const mockNavigate = routerMock.__mockNavigate;

const mockQuestions = [
  { id: 'q1', questionText: 'Q1?', options: { A: 'A', B: 'B', C: 'C', D: 'D' }, correctAnswer: 'A', subject: 'English', topic: 'Grammar' },
  { id: 'q2', questionText: 'Q2?', options: { A: 'A', B: 'B', C: 'C', D: 'D' }, correctAnswer: 'B', subject: 'Math', topic: 'Algebra' },
];
const mockResponses = [
  { selectedAnswer: 'A', timeTaken: 30, marksPerQuestion: 1, negativeMarking: -0.33 },
  { selectedAnswer: 'C', timeTaken: 45, marksPerQuestion: 1, negativeMarking: -0.33 },
];

describe('TestResult Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    routerMock.__mockLocation.state = {
      questions: mockQuestions,
      responses: mockResponses,
      examType: 'CDS',
      testMode: 'mock',
    };
    getDocs.mockResolvedValue({ docs: [], forEach: jest.fn() });
  });

  it('should render results page', async () => {
    render(<TestResult />);
    await waitFor(() => {
      const body = document.body.textContent;
      expect(body).toMatch(/score|result|correct/i);
    });
  });

  it('should redirect to dashboard if no test data', async () => {
    routerMock.__mockLocation.state = {};
    render(<TestResult />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('should calculate percentile from firestore', async () => {
    render(<TestResult />);
    await waitFor(() => expect(getDocs).toHaveBeenCalled());
  });

  it('should show subject performance', async () => {
    render(<TestResult />);
    await waitFor(() => {
      const body = document.body.textContent;
      expect(body.toLowerCase()).toMatch(/english/);
    });
  });

  it('should show celebration effect', async () => {
    render(<TestResult />);
    await waitFor(() => {
      expect(screen.getByTestId('celebration-effect')).toBeInTheDocument();
    });
  });
});
