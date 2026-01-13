import {
  EXAM_PATTERNS,
  SUBJECTS,
  DIFFICULTY_LEVELS,
  getSubjectsByExam,
  getTopicsBySubject,
} from '../examPatterns';

describe('examPatterns', () => {
  describe('EXAM_PATTERNS', () => {
    it('should have CDS pattern defined', () => {
      expect(EXAM_PATTERNS.CDS).toBeDefined();
      expect(EXAM_PATTERNS.CDS.name).toBe('CDS - Combined Defence Services');
      expect(EXAM_PATTERNS.CDS.sections).toHaveLength(3);
    });

    it('should have CSAT pattern defined', () => {
      expect(EXAM_PATTERNS.CSAT).toBeDefined();
      expect(EXAM_PATTERNS.CSAT.sections).toHaveLength(1);
    });

    it('should have IAS-GS pattern defined', () => {
      expect(EXAM_PATTERNS['IAS-GS']).toBeDefined();
      expect(EXAM_PATTERNS['IAS-GS'].sections[0].totalQuestions).toBe(100);
    });

    it('should have correct negative marking for all patterns', () => {
      Object.values(EXAM_PATTERNS).forEach(pattern => {
        pattern.sections.forEach(section => {
          expect(section.negativeMarking).toBeLessThan(0);
        });
      });
    });
  });

  describe('SUBJECTS', () => {
    it('should have English subject', () => {
      expect(SUBJECTS.English).toBeDefined();
      expect(SUBJECTS.English.examTypes).toContain('CDS');
    });

    it('should have topics for each subject', () => {
      Object.values(SUBJECTS).forEach(subject => {
        expect(Array.isArray(subject.topics)).toBe(true);
        expect(subject.topics.length).toBeGreaterThan(0);
      });
    });

    it('should have valid exam types', () => {
      const validExamTypes = ['CDS', 'CSAT', 'IAS-GS', 'IAS-CSAT'];
      Object.values(SUBJECTS).forEach(subject => {
        subject.examTypes.forEach(examType => {
          expect(validExamTypes).toContain(examType);
        });
      });
    });
  });

  describe('DIFFICULTY_LEVELS', () => {
    it('should have three difficulty levels', () => {
      expect(DIFFICULTY_LEVELS).toHaveLength(3);
      expect(DIFFICULTY_LEVELS).toContain('Easy');
      expect(DIFFICULTY_LEVELS).toContain('Medium');
      expect(DIFFICULTY_LEVELS).toContain('Hard');
    });
  });

  describe('getSubjectsByExam', () => {
    it('should return subjects for CDS', () => {
      const subjects = getSubjectsByExam('CDS');
      expect(subjects.length).toBeGreaterThan(0);
      expect(subjects[0]).toHaveProperty('value');
      expect(subjects[0]).toHaveProperty('label');
    });

    it('should return subjects for IAS-GS', () => {
      const subjects = getSubjectsByExam('IAS-GS');
      expect(subjects.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid exam type', () => {
      const subjects = getSubjectsByExam('INVALID');
      expect(subjects).toEqual([]);
    });

    it('should not return subjects from other exams', () => {
      const cdsSubjects = getSubjectsByExam('CDS');
      const iasSubjects = getSubjectsByExam('IAS-GS');
      
      const cdsValues = cdsSubjects.map(s => s.value);
      const iasValues = iasSubjects.map(s => s.value);
      
      // Should have different subjects
      expect(cdsValues).not.toEqual(iasValues);
    });
  });

  describe('getTopicsBySubject', () => {
    it('should return topics for English', () => {
      const topics = getTopicsBySubject('English');
      expect(topics.length).toBeGreaterThan(0);
      expect(topics).toContain('Grammar');
    });

    it('should return topics for History of India', () => {
      const topics = getTopicsBySubject('History of India');
      expect(topics).toContain('Ancient India');
    });

    it('should return empty array for invalid subject', () => {
      const topics = getTopicsBySubject('Invalid Subject');
      expect(topics).toEqual([]);
    });

    it('should return empty array for undefined subject', () => {
      const topics = getTopicsBySubject();
      expect(topics).toEqual([]);
    });
  });
});
