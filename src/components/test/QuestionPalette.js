import { useMemo, memo } from 'react';
import { getQuestionStatus, getStatusColor } from '../../utils/testUtils';

/**
 * Reusable Question Palette component for test navigation
 */
const QuestionPalette = memo(
  ({
    questions,
    responses,
    currentIndex,
    onQuestionClick,
    sectionMeta = [],
    currentSectionIndex,
    maxHeight = 'max-h-96',
  }) => {
    // Memoize section bounds calculation
    const { start, end } = useMemo(() => {
      if (sectionMeta.length > 0 && currentSectionIndex !== undefined) {
        const section = sectionMeta[currentSectionIndex];
        if (section) {
          return {
            start: section.startIndex,
            end: section.endIndex,
          };
        }
      }
      return { start: 0, end: questions.length - 1 };
    }, [sectionMeta, currentSectionIndex, questions.length]);

    // Memoize status counts calculation
    const statusCounts = useMemo(
      () => ({
        answered: responses.filter((r) => r.selectedAnswer && !r.markedForReview).length,
        notAnswered: responses.filter((r) => r.visited && !r.selectedAnswer && !r.markedForReview)
          .length,
        marked: responses.filter((r) => r.markedForReview && !r.selectedAnswer).length,
        answeredMarked: responses.filter((r) => r.selectedAnswer && r.markedForReview).length,
        notVisited: responses.filter((r) => !r.visited).length,
      }),
      [responses]
    );

    const handleClick = (index) => {
      // Only allow clicking questions in current section if sections exist
      if (sectionMeta.length > 0) {
        if (index < start || index > end) return;
      }
      onQuestionClick(index);
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sticky top-24">
        <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-3">Questions</h3>

        {/* Status Summary - Compact */}
        <div className="grid grid-cols-2 gap-1.5 mb-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-green-500 rounded" aria-hidden="true" />
            <span className="text-gray-600 dark:text-gray-400">{statusCounts.answered}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-500 rounded" aria-hidden="true" />
            <span className="text-gray-600 dark:text-gray-400">{statusCounts.notAnswered}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-purple-500 rounded" aria-hidden="true" />
            <span className="text-gray-600 dark:text-gray-400">{statusCounts.marked}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded" aria-hidden="true" />
            <span className="text-gray-600 dark:text-gray-400">{statusCounts.notVisited}</span>
          </div>
        </div>

        {/* Question Grid */}
        <div
          className={`grid grid-cols-5 gap-1.5 ${maxHeight} overflow-y-auto`}
          role="navigation"
          aria-label="Question navigation"
        >
          {questions.map((_, index) => {
            const status = getQuestionStatus(responses[index]);
            const isInSection = sectionMeta.length === 0 || (index >= start && index <= end);
            const isCurrent = index === currentIndex;

            return (
              <button
                key={index}
                onClick={() => handleClick(index)}
                disabled={!isInSection}
                className={`w-full aspect-square rounded flex items-center justify-center font-semibold text-xs transition-all ${getStatusColor(status)} ${
                  isCurrent ? 'ring-2 ring-offset-1 ring-blue-600 dark:ring-offset-gray-800' : ''
                } ${!isInSection ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'}`}
                aria-label={`Question ${index + 1}, ${status.replace('-', ' ')}`}
                aria-current={isCurrent ? 'true' : undefined}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        {/* Keyboard Shortcuts - Collapsible */}
        <details className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 font-medium">
            Shortcuts
          </summary>
          <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>1-4: Option</span>
            <span>N: Next</span>
            <span>P: Previous</span>
            <span>M: Mark</span>
          </div>
        </details>
      </div>
    );
  }
);

QuestionPalette.displayName = 'QuestionPalette';

export default QuestionPalette;
