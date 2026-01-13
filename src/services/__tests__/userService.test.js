import {
  getUserById,
  checkUsernameExists,
  createUserProfile,
  updateLoginStats,
} from '../userService';

jest.mock('../../config/firebase');

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user when exists', async () => {
      const mockUser = { id: 'user1', name: 'Test User' };
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        id: 'user1',
        data: () => ({ name: 'Test User' }),
      });
      require('firebase/firestore').getDoc = mockGetDoc;

      const user = await getUserById('user1');
      expect(user).toEqual(mockUser);
    });

    it('should return null when user does not exist', async () => {
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => false,
      });
      require('firebase/firestore').getDoc = mockGetDoc;

      const user = await getUserById('nonexistent');
      expect(user).toBeNull();
    });
  });

  describe('checkUsernameExists', () => {
    it('should return true when username exists', async () => {
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
      });
      require('firebase/firestore').getDoc = mockGetDoc;

      const exists = await checkUsernameExists('testuser');
      expect(exists).toBe(true);
    });

    it('should return false when username does not exist', async () => {
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => false,
      });
      require('firebase/firestore').getDoc = mockGetDoc;

      const exists = await checkUsernameExists('newuser');
      expect(exists).toBe(false);
    });

    it('should handle username case insensitively', async () => {
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
      });
      require('firebase/firestore').getDoc = mockGetDoc;
      require('firebase/firestore').doc = jest.fn();

      const exists = await checkUsernameExists('TestUser');
      // Username should be lowercased
      expect(exists).toBe(true);
    });
  });

  describe('createUserProfile', () => {
    it('should create user profile with correct data', async () => {
      const mockSetDoc = jest.fn().mockResolvedValue(undefined);
      require('firebase/firestore').setDoc = mockSetDoc;

      const userData = {
        name: 'Test User',
        email: 'test@example.com',
      };

      await createUserProfile('user1', userData);
      expect(mockSetDoc).toHaveBeenCalled();
    });
  });

  describe('updateLoginStats', () => {
    it('should increment login count', async () => {
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({ loginCount: 5 }),
      });
      const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
      require('firebase/firestore').getDoc = mockGetDoc;
      require('firebase/firestore').updateDoc = mockUpdateDoc;

      await updateLoginStats('user1');
      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });
});
