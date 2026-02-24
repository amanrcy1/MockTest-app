import { memo, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";

/**
 * Reusable Question Card component
 */
const QuestionCard = memo(({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  showFeedback = false,
  isCorrect,
  marksPerQuestion,
  negativeMarking,
  isBookmarked,
  onBookmark,
  onReport,
  disabled = false,
}) => {
  const options = useMemo(() => ["A", "B", "C", "D"], []);
  const optionRefs = useRef({});

  const moveSelection = useCallback((offset) => {
    if (disabled) return;
    const currentIndex = Math.max(options.indexOf(selectedAnswer), 0);
    const nextIndex = (currentIndex + offset + options.length) % options.length;
    const nextOption = options[nextIndex];
    onAnswerSelect(nextOption);
    optionRefs.current[nextOption]?.focus();
  }, [disabled, onAnswerSelect, options, selectedAnswer]);

  const handleOptionKeyDown = useCallback((event, option) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      moveSelection(1);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection(-1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      onAnswerSelect(options[0]);
      optionRefs.current[options[0]]?.focus();
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      onAnswerSelect(options[options.length - 1]);
      optionRefs.current[options[options.length - 1]]?.focus();
      return;
    }
    if ((event.key === " " || event.key === "Enter") && option !== selectedAnswer) {
      event.preventDefault();
      onAnswerSelect(option);
    }
  }, [disabled, moveSelection, onAnswerSelect, options, selectedAnswer]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Question Header - Compact */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span 
            className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-semibold px-2.5 py-1 rounded"
            aria-label={`Question ${questionNumber} of ${totalQuestions}`}
          >
            {questionNumber}/{totalQuestions}
          </span>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">{question.subject}</span>
            {question.topic && <span className="ml-1">• {question.topic}</span>}
          </div>
        </div>
        <div className="flex gap-1.5">
          {marksPerQuestion !== undefined && (
            <span 
              className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded font-medium"
              title={`Marks: +${Number(marksPerQuestion).toFixed(2)} for correct, ${Number(negativeMarking || 0).toFixed(2)} for wrong`}
            >
              +{Number(marksPerQuestion).toFixed(2)}/{Number(negativeMarking || 0).toFixed(2)}
            </span>
          )}
          {onBookmark && (
            <button
              onClick={onBookmark}
              className={`p-1.5 rounded transition-colors ${
                isBookmarked
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400"
              }`}
              aria-pressed={isBookmarked}
              aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <svg className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          )}
          {onReport && (
            <button
              onClick={onReport}
              className="p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              aria-label="Report an error with this question"
              title="Report error"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Question Text */}
      <div className="mb-6">
        <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
          {question.questionText}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3" role="radiogroup" aria-label="Answer options">
        {options.map((option) => {
          const isSelected = selectedAnswer === option;
          const isCorrectOption = question.correctAnswer === option;
          const showCorrect = showFeedback && isCorrectOption;
          const showWrong = showFeedback && isSelected && !isCorrectOption;

          return (
            <button
              key={option}
              ref={(node) => {
                optionRefs.current[option] = node;
              }}
              onClick={() => !disabled && onAnswerSelect(option)}
              onKeyDown={(event) => handleOptionKeyDown(event, option)}
              disabled={disabled}
              tabIndex={
                selectedAnswer
                  ? isSelected ? 0 : -1
                  : option === options[0] ? 0 : -1
              }
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                showCorrect
                  ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                  : showWrong
                    ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                    : isSelected
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
              role="radio"
              aria-checked={isSelected}
              aria-label={`Option ${option}: ${question.options?.[option] || "Option missing"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{option}.</span>{" "}
                  <span className="text-gray-800 dark:text-gray-200">
                    {question.options?.[option] || "Option missing"}
                  </span>
                </div>
                {showCorrect && (
                  <span className="text-green-600 font-semibold ml-2 flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Correct</span>
                )}
                {showWrong && (
                  <span className="text-red-600 font-semibold ml-2 flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>Wrong</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback Section */}
      {showFeedback && selectedAnswer && (
        <div
          className={`mt-6 p-4 rounded-lg border-l-4 ${
            isCorrect
              ? "bg-green-50 dark:bg-green-900/30 border-green-500"
              : "bg-red-50 dark:bg-red-900/30 border-red-500"
          }`}
          role="alert"
        >
          <div className="flex items-start gap-3 mb-3">
            {isCorrect ? (
              <>
                <svg className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-bold text-green-800 dark:text-green-300">Correct!</h4>
                  <p className="text-green-700 dark:text-green-400 text-sm">Well done!</p>
                </div>
              </>
            ) : (
              <>
                <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-bold text-red-800 dark:text-red-300">Incorrect</h4>
                  <p className="text-red-700 dark:text-red-400 text-sm">
                    The correct answer is <span className="font-bold">{question.correctAnswer}</span>
                  </p>
                </div>
              </>
            )}
          </div>

          {question.solution && (
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg mt-3">
              <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Explanation:</h5>
              <p className="text-gray-700 dark:text-gray-300 text-sm">{question.solution}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

QuestionCard.displayName = 'QuestionCard';

QuestionCard.propTypes = {
  question: PropTypes.shape({
    questionText: PropTypes.string.isRequired,
    optionA: PropTypes.string.isRequired,
    optionB: PropTypes.string.isRequired,
    optionC: PropTypes.string.isRequired,
    optionD: PropTypes.string.isRequired,
    correctAnswer: PropTypes.string,
    solution: PropTypes.string,
    subject: PropTypes.string,
    topic: PropTypes.string,
  }).isRequired,
  questionNumber: PropTypes.number.isRequired,
  totalQuestions: PropTypes.number.isRequired,
  selectedAnswer: PropTypes.string,
  onAnswerSelect: PropTypes.func.isRequired,
  showFeedback: PropTypes.bool,
  isCorrect: PropTypes.bool,
  marksPerQuestion: PropTypes.number,
  negativeMarking: PropTypes.number,
  isBookmarked: PropTypes.bool,
  onBookmark: PropTypes.func,
  onReport: PropTypes.func,
  disabled: PropTypes.bool,
};

export default QuestionCard;
