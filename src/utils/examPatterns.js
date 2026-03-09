// Exam pattern configurations for UPSC exams

export const EXAM_PATTERNS = {
  CDS: {
    name: "CDS - Combined Defence Services",
    code: "CDS",
    multiPaper: true, // Each section is a separate paper with its own timer
    sections: [
      {
        id: "cds_english",
        name: "English",
        shortName: "Paper I",
        shift: "Morning (9:00 AM - 11:00 AM)",
        totalQuestions: 120,
        totalMarks: 100,
        duration: 120, // minutes
        negativeMarking: -1 / 3,
        marksPerQuestion: 100 / 120,
      },
      {
        id: "cds_gk",
        name: "General Knowledge",
        shortName: "Paper II",
        shift: "Afternoon (12:00 PM - 2:00 PM)",
        totalQuestions: 120,
        totalMarks: 100,
        duration: 120,
        negativeMarking: -1 / 3,
        marksPerQuestion: 100 / 120,
      },
      {
        id: "cds_math",
        name: "Elementary Mathematics",
        shortName: "Paper III",
        shift: "Evening (3:00 PM - 5:00 PM)",
        totalQuestions: 100,
        totalMarks: 100,
        duration: 120,
        negativeMarking: -1 / 3,
        marksPerQuestion: 1,
      },
    ],
  },
  CSAT: {
    name: "CSAT - Civil Services Aptitude Test",
    code: "CSAT",
    sections: [
      {
        id: "csat_comprehension",
        name: "Comprehension",
        totalQuestions: 80,
        totalMarks: 200,
        duration: 120,
        negativeMarking: -1 / 3,
        marksPerQuestion: 2.5,
      },
    ],
    topics: [
      "Comprehension",
      "Interpersonal Skills",
      "Logical Reasoning",
      "Analytical Ability",
      "Decision Making",
      "Problem Solving",
      "Basic Numeracy",
      "Data Interpretation",
    ],
  },
  "IAS-GS": {
    name: "IAS Prelims - General Studies",
    code: "IAS-GS",
    sections: [
      {
        id: "ias_gs",
        name: "General Studies",
        totalQuestions: 100,
        totalMarks: 200,
        duration: 120,
        negativeMarking: -1 / 3,
        marksPerQuestion: 2,
      },
    ],
    subjects: [
      "History of India",
      "Indian National Movement",
      "Indian and World Geography",
      "Indian Polity and Governance",
      "Economic and Social Development",
      "Environmental Ecology",
      "General Science",
      "Current Events",
    ],
  },
  "IAS-CSAT": {
    name: "IAS Prelims - CSAT",
    code: "IAS-CSAT",
    sections: [
      {
        id: "ias_csat",
        name: "CSAT",
        totalQuestions: 80,
        totalMarks: 200,
        duration: 120,
        negativeMarking: -1 / 3,
        marksPerQuestion: 2.5,
      },
    ],
    topics: [
      "Comprehension",
      "Logical Reasoning",
      "Analytical Ability",
      "Decision Making",
      "Problem Solving",
      "Basic Numeracy",
      "Data Interpretation",
    ],
  },
};

// Subject organization for question categorization
export const SUBJECTS = {
  // CDS Subjects
  English: {
    name: "English",
    examTypes: ["CDS"],
    topics: [
      "Grammar",
      "Vocabulary",
      "Comprehension",
      "Sentence Correction",
      "Fill in the Blanks",
      "Synonyms and Antonyms",
      "Idioms and Phrases",
    ],
  },
  "General Knowledge": {
    name: "General Knowledge",
    examTypes: ["CDS"],
    topics: [
      "History",
      "Geography",
      "Polity",
      "Economy",
      "Science",
      "Current Affairs",
      "Defence",
      "Awards and Honors",
    ],
  },
  "Elementary Mathematics": {
    name: "Elementary Mathematics",
    examTypes: ["CDS"],
    topics: [
      "Arithmetic",
      "Algebra",
      "Geometry",
      "Trigonometry",
      "Mensuration",
      "Statistics",
    ],
  },

  // IAS GS Subjects
  "History of India": {
    name: "History of India",
    examTypes: ["IAS-GS"],
    topics: [
      "Ancient India",
      "Medieval India",
      "Modern India",
      "Art and Culture",
      "Freedom Struggle",
    ],
  },
  "Indian National Movement": {
    name: "Indian National Movement",
    examTypes: ["IAS-GS"],
    topics: [
      "Early Nationalist Movement",
      "Gandhian Era",
      "Revolutionary Movement",
      "Post-Independence",
    ],
  },
  "Indian and World Geography": {
    name: "Indian and World Geography",
    examTypes: ["IAS-GS"],
    topics: [
      "Physical Geography",
      "Indian Geography",
      "World Geography",
      "Economic Geography",
      "Resources and Industries",
    ],
  },
  "Indian Polity and Governance": {
    name: "Indian Polity and Governance",
    examTypes: ["IAS-GS"],
    topics: [
      "Constitution",
      "Fundamental Rights",
      "Directive Principles",
      "Government Structure",
      "Local Government",
      "Public Policy",
      "Governance Issues",
    ],
  },
  "Economic and Social Development": {
    name: "Economic and Social Development",
    examTypes: ["IAS-GS"],
    topics: [
      "Indian Economy",
      "Economic Development",
      "Social Issues",
      "Poverty and Unemployment",
      "Government Schemes",
    ],
  },
  "Environmental Ecology": {
    name: "Environmental Ecology",
    examTypes: ["IAS-GS"],
    topics: [
      "Ecology",
      "Biodiversity",
      "Climate Change",
      "Environmental Pollution",
      "Conservation",
    ],
  },
  "General Science": {
    name: "General Science",
    examTypes: ["IAS-GS"],
    topics: ["Physics", "Chemistry", "Biology", "Technology", "Space Science"],
  },
  "Current Events": {
    name: "Current Events",
    examTypes: ["IAS-GS", "CDS"],
    topics: [
      "National Affairs",
      "International Affairs",
      "Sports",
      "Science and Technology",
      "Economy",
    ],
  },

  // CSAT Subjects
  Aptitude: {
    name: "Aptitude",
    examTypes: ["CSAT", "IAS-CSAT"],
    topics: [
      "Comprehension",
      "Logical Reasoning",
      "Analytical Ability",
      "Decision Making",
      "Problem Solving",
      "Basic Numeracy",
      "Data Interpretation",
    ],
  },
};

// Difficulty levels
export const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];

// Get subjects by exam type
export const getSubjectsByExam = (examType) => {
  return Object.entries(SUBJECTS)
    .filter(([_, subject]) => subject.examTypes.includes(examType))
    .map(([key, subject]) => ({ value: key, label: subject.name }));
};

// Get topics by subject
export const getTopicsBySubject = (subjectName) => {
  return SUBJECTS[subjectName]?.topics || [];
};
