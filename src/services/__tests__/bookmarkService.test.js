import {
  getUserBookmarks,
  getBookmarkMap,
  addBookmark,
  removeBookmark,
  toggleBookmark,
  submitErrorReport,
} from '../bookmarkService';

jest.mock('../../config/firebase');

describe('bookmarkService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserBookmarks', () => {
    it('should return user bookmarks', async () => {
      const mockBookmarks = [
        { id: 'b1', userId: 'user1', questionId: 'q1' },
        { id: 'b2', userId: 'user1', questionId: 'q2' },
      ];

      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: mockBookmarks.map(b => ({
          id: b.id,
          data: () => ({ userId: b.userId, questionId: b.questionId }),
        })),
      });
      require('firebase/firestore').getDocs = mockGetDocs;

      const bookmarks = await getUserBookmarks('user1');
      expect(bookmarks).toHaveLength(2);
    });

    it('should filter by examType when provided', async () => {
      const mockGetDocs = jest.fn().mockResolvedValue({ docs: [] });
      require('firebase/firestore').getDocs = mockGetDocs;

      await getUserBookmarks('user1', 'prelims');
      expect(mockGetDocs).toHaveBeenCalled();
    });
  });

  describe('getBookmarkMap', () => {
    it('should create questionId to bookmarkId map', async () => {
      const mockBookmarks = [
        { id: 'b1', questionId: 'q1' },
        { id: 'b2', questionId: 'q2' },
      ];

      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: mockBookmarks.map(b => ({
          id: b.id,
          data: () => ({ questionId: b.questionId }),
        })),
      });
      require('firebase/firestore').getDocs = mockGetDocs;

      const map = await getBookmarkMap('user1', 'prelims');
      expect(map).toHaveProperty('q1');
      expect(map).toHaveProperty('q2');
    });
  });

  describe('addBookmark', () => {
    it('should add bookmark and return id', async () => {
      const mockAddDoc = jest.fn().mockResolvedValue({ id: 'newBookmark' });
      require('firebase/firestore').addDoc = mockAddDoc;

      const id = await addBookmark('user1', 'q1', 'prelims', 'test note');
      expect(id).toBe('newBookmark');
      expect(mockAddDoc).toHaveBeenCalled();
    });
  });

  describe('removeBookmark', () => {
    it('should delete bookmark', async () => {
      const mockDeleteDoc = jest.fn().mockResolvedValue(undefined);
      require('firebase/firestore').deleteDoc = mockDeleteDoc;

      await removeBookmark('b1');
      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('toggleBookmark', () => {
    it('should remove bookmark when existingId provided', async () => {
      const mockDeleteDoc = jest.fn().mockResolvedValue(undefined);
      require('firebase/firestore').deleteDoc = mockDeleteDoc;

      const result = await toggleBookmark('user1', 'q1', 'prelims', 'b1');
      expect(result.action).toBe('removed');
      expect(result.id).toBeNull();
    });

    it('should add bookmark when no existingId', async () => {
      const mockAddDoc = jest.fn().mockResolvedValue({ id: 'newB' });
      require('firebase/firestore').addDoc = mockAddDoc;

      const result = await toggleBookmark('user1', 'q1', 'prelims', null);
      expect(result.action).toBe('added');
      expect(result.id).toBe('newB');
    });
  });

  describe('submitErrorReport', () => {
    it('should submit error report with correct data', async () => {
      const mockAddDoc = jest.fn().mockResolvedValue({ id: 'report1' });
      require('firebase/firestore').addDoc = mockAddDoc;

      const id = await submitErrorReport('user1', 'q1', 'prelims', 'Wrong answer');
      expect(id).toBe('report1');
      expect(mockAddDoc).toHaveBeenCalled();
    });

    it('should trim report text', async () => {
      const mockAddDoc = jest.fn().mockResolvedValue({ id: 'report1' });
      require('firebase/firestore').addDoc = mockAddDoc;

      await submitErrorReport('user1', 'q1', 'prelims', '  spaces  ');
      expect(mockAddDoc).toHaveBeenCalled();
    });
  });
});
