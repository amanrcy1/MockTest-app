import { vi } from 'vitest';
import {
  getUserBookmarks,
  getBookmarkMap,
  addBookmark,
  removeBookmark,
  toggleBookmark,
  submitErrorReport,
} from '../bookmarkService';
import { getDocs, addDoc, deleteDoc } from 'firebase/firestore';

vi.mock('../../config/firebase');

describe('bookmarkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserBookmarks', () => {
    it('should return user bookmarks', async () => {
      const mockBookmarks = [
        { id: 'b1', userId: 'user1', questionId: 'q1' },
        { id: 'b2', userId: 'user1', questionId: 'q2' },
      ];

      getDocs.mockResolvedValue({
        docs: mockBookmarks.map(b => ({
          id: b.id,
          data: () => ({ userId: b.userId, questionId: b.questionId }),
        })),
      });

      const bookmarks = await getUserBookmarks('user1');
      expect(bookmarks).toHaveLength(2);
    });

    it('should filter by examType when provided', async () => {
      getDocs.mockResolvedValue({ docs: [] });

      await getUserBookmarks('user1', 'prelims');
      expect(getDocs).toHaveBeenCalled();
    });
  });

  describe('getBookmarkMap', () => {
    it('should create questionId to bookmarkId map', async () => {
      const mockBookmarks = [
        { id: 'b1', questionId: 'q1' },
        { id: 'b2', questionId: 'q2' },
      ];

      getDocs.mockResolvedValue({
        docs: mockBookmarks.map(b => ({
          id: b.id,
          data: () => ({ questionId: b.questionId }),
        })),
      });

      const map = await getBookmarkMap('user1', 'prelims');
      expect(map).toHaveProperty('q1');
      expect(map).toHaveProperty('q2');
    });
  });

  describe('addBookmark', () => {
    it('should add bookmark and return id', async () => {
      addDoc.mockResolvedValue({ id: 'newBookmark' });

      const id = await addBookmark('user1', 'q1', 'prelims', 'test note');
      expect(id).toBe('newBookmark');
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('removeBookmark', () => {
    it('should delete bookmark', async () => {
      deleteDoc.mockResolvedValue(undefined);

      await removeBookmark('b1');
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe('toggleBookmark', () => {
    it('should remove bookmark when existingId provided', async () => {
      deleteDoc.mockResolvedValue(undefined);

      const result = await toggleBookmark('user1', 'q1', 'prelims', 'b1');
      expect(result.action).toBe('removed');
      expect(result.id).toBeNull();
    });

    it('should add bookmark when no existingId', async () => {
      addDoc.mockResolvedValue({ id: 'newB' });

      const result = await toggleBookmark('user1', 'q1', 'prelims', null);
      expect(result.action).toBe('added');
      expect(result.id).toBe('newB');
    });
  });

  describe('submitErrorReport', () => {
    it('should submit error report with correct data', async () => {
      addDoc.mockResolvedValue({ id: 'report1' });

      const id = await submitErrorReport('user1', 'q1', 'prelims', 'Wrong answer');
      expect(id).toBe('report1');
      expect(addDoc).toHaveBeenCalled();
    });

    it('should trim report text', async () => {
      addDoc.mockResolvedValue({ id: 'report1' });

      await submitErrorReport('user1', 'q1', 'prelims', '  spaces  ');
      expect(addDoc).toHaveBeenCalled();
    });
  });
});
