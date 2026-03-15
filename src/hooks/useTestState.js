import { useReducer, useCallback, useRef, useEffect } from 'react';

/**
 * Test state actions
 */
const TEST_ACTIONS = {
  SET_QUESTIONS: 'SET_QUESTIONS',
  SET_SECTIONS: 'SET_SECTIONS',
  SET_CURRENT_SECTION: 'SET_CURRENT_SECTION',
  SET_CURRENT_QUESTION: 'SET_CURRENT_QUESTION',
  UPDATE_RESPONSE: 'UPDATE_RESPONSE',
  SET_TIME_REMAINING: 'SET_TIME_REMAINING',
  SET_SECTION_TIME: 'SET_SECTION_TIME',
  TOGGLE_BOOKMARK: 'TOGGLE_BOOKMARK',
  LOAD_SESSION: 'LOAD_SESSION',
  RESET: 'RESET',
};

/**
 * Initial test state
 */
const initialState = {
  questions: [],
  sections: [],
  responses: [],
  currentSectionIndex: 0,
  currentQuestionIndex: 0,
  timeRemaining: 0,
  sectionTimeRemaining: 0,
  bookmarkMap: {},
};

/**
 * Test state reducer
 */
function testReducer(state, action) {
  switch (action.type) {
    case TEST_ACTIONS.SET_QUESTIONS:
      return { ...state, questions: action.payload };

    case TEST_ACTIONS.SET_SECTIONS:
      return { ...state, sections: action.payload };

    case TEST_ACTIONS.SET_CURRENT_SECTION:
      return { ...state, currentSectionIndex: action.payload };

    case TEST_ACTIONS.SET_CURRENT_QUESTION:
      return { ...state, currentQuestionIndex: action.payload };

    case TEST_ACTIONS.UPDATE_RESPONSE: {
      const { index, updates } = action.payload;
      const newResponses = [...state.responses];
      newResponses[index] = { ...newResponses[index], ...updates };
      return { ...state, responses: newResponses };
    }

    case TEST_ACTIONS.SET_TIME_REMAINING:
      return { ...state, timeRemaining: action.payload };

    case TEST_ACTIONS.SET_SECTION_TIME:
      return { ...state, sectionTimeRemaining: action.payload };

    case TEST_ACTIONS.TOGGLE_BOOKMARK: {
      const { questionId, bookmarkId } = action.payload;
      const newBookmarkMap = { ...state.bookmarkMap };
      if (bookmarkId) {
        newBookmarkMap[questionId] = bookmarkId;
      } else {
        delete newBookmarkMap[questionId];
      }
      return { ...state, bookmarkMap: newBookmarkMap };
    }

    case TEST_ACTIONS.LOAD_SESSION:
      return { ...state, ...action.payload };

    case TEST_ACTIONS.RESET:
      return initialState;

    default:
      return state;
  }
}

/**
 * Custom hook for managing test state
 */
export const useTestState = () => {
  const [state, dispatch] = useReducer(testReducer, initialState);
  const questionStartRef = useRef(null);
  const lastQuestionIndexRef = useRef(null);

  // Record time spent on current question
  const recordTimeSpent = useCallback(() => {
    if (questionStartRef.current === null || lastQuestionIndexRef.current === null) {
      return;
    }

    const delta = Math.floor((Date.now() - questionStartRef.current) / 1000);
    if (delta <= 0) {
      questionStartRef.current = Date.now();
      return;
    }

    const indexToUpdate = lastQuestionIndexRef.current;
    dispatch({
      type: TEST_ACTIONS.UPDATE_RESPONSE,
      payload: {
        index: indexToUpdate,
        updates: {
          timeTaken: (state.responses[indexToUpdate]?.timeTaken || 0) + delta,
        },
      },
    });

    questionStartRef.current = Date.now();
  }, [state.responses]);

  // Track question changes
  useEffect(() => {
    if (lastQuestionIndexRef.current !== null) {
      recordTimeSpent();
    }
    lastQuestionIndexRef.current = state.currentQuestionIndex;
    questionStartRef.current = Date.now();
  }, [state.currentQuestionIndex, recordTimeSpent]);

  // Actions
  const actions = {
    setQuestions: useCallback((questions) => {
      dispatch({ type: TEST_ACTIONS.SET_QUESTIONS, payload: questions });
    }, []),

    setSections: useCallback((sections) => {
      dispatch({ type: TEST_ACTIONS.SET_SECTIONS, payload: sections });
    }, []),

    setCurrentSection: useCallback((index) => {
      dispatch({ type: TEST_ACTIONS.SET_CURRENT_SECTION, payload: index });
    }, []),

    setCurrentQuestion: useCallback((index) => {
      dispatch({ type: TEST_ACTIONS.SET_CURRENT_QUESTION, payload: index });
    }, []),

    updateResponse: useCallback((index, updates) => {
      dispatch({ type: TEST_ACTIONS.UPDATE_RESPONSE, payload: { index, updates } });
    }, []),

    setTimeRemaining: useCallback((time) => {
      dispatch({ type: TEST_ACTIONS.SET_TIME_REMAINING, payload: time });
    }, []),

    setSectionTime: useCallback((time) => {
      dispatch({ type: TEST_ACTIONS.SET_SECTION_TIME, payload: time });
    }, []),

    toggleBookmark: useCallback((questionId, bookmarkId) => {
      dispatch({ type: TEST_ACTIONS.TOGGLE_BOOKMARK, payload: { questionId, bookmarkId } });
    }, []),

    loadSession: useCallback((sessionData) => {
      dispatch({ type: TEST_ACTIONS.LOAD_SESSION, payload: sessionData });
    }, []),

    reset: useCallback(() => {
      dispatch({ type: TEST_ACTIONS.RESET });
    }, []),

    recordTimeSpent,
  };

  return { state, actions };
};

export default useTestState;
