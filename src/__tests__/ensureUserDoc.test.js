import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureUserDoc } from '../auth/ensureUserDoc';

// Mock Firestore functions - create them inside the factory function
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('../firebase.js', () => ({
  db: {}, // Mock database instance
}));

// Import the mocked functions after mocking
import { doc, getDoc, setDoc } from 'firebase/firestore';

describe('ensureUserDoc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console.log to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('throws error if user is null', async () => {
    await expect(ensureUserDoc(null)).rejects.toThrow('User object with uid required');
  });

  it('throws error if user has no uid', async () => {
    await expect(ensureUserDoc({})).rejects.toThrow('User object with uid required');
  });

  it('creates new user document when document does not exist', async () => {
    const mockUser = {
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg'
    };

    const mockUserRef = { id: mockUser.uid };
    const mockUserDoc = {
      exists: () => false,
      data: () => null
    };

    doc.mockReturnValue(mockUserRef);
    getDoc.mockResolvedValue(mockUserDoc);
    setDoc.mockResolvedValue(undefined);

    await ensureUserDoc(mockUser);

    // Verify doc was called with correct collection and uid
    expect(doc).toHaveBeenCalledWith({}, 'users', mockUser.uid);
    
    // Verify getDoc was called to check if document exists
    expect(getDoc).toHaveBeenCalledWith(mockUserRef);
    
    // Verify setDoc was called to create the document
    expect(setDoc).toHaveBeenCalledWith(mockUserRef, {
      uid: mockUser.uid,
      email: mockUser.email,
      displayName: mockUser.displayName,
      photoURL: mockUser.photoURL,
      createdAt: expect.any(String) // createdAt is a timestamp, so we check it exists
    });
  });

  it('does not create document when document already exists', async () => {
    const mockUser = {
      uid: 'existing-uid-456',
      email: 'existing@example.com',
      displayName: 'Existing User',
      photoURL: 'https://example.com/existing.jpg'
    };

    const mockUserRef = { id: mockUser.uid };
    const mockUserDoc = {
      exists: () => true,
      data: () => ({
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName
      })
    };

    doc.mockReturnValue(mockUserRef);
    getDoc.mockResolvedValue(mockUserDoc);

    await ensureUserDoc(mockUser);

    // Verify getDoc was called
    expect(getDoc).toHaveBeenCalledWith(mockUserRef);
    
    // Verify setDoc was NOT called (document already exists)
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('handles user with missing optional fields', async () => {
    const mockUser = {
      uid: 'minimal-uid-789',
      // No email, displayName, or photoURL
    };

    const mockUserRef = { id: mockUser.uid };
    const mockUserDoc = {
      exists: () => false,
      data: () => null
    };

    doc.mockReturnValue(mockUserRef);
    getDoc.mockResolvedValue(mockUserDoc);
    setDoc.mockResolvedValue(undefined);

    await ensureUserDoc(mockUser);

    // Verify setDoc was called with null values for missing fields
    expect(setDoc).toHaveBeenCalledWith(mockUserRef, {
      uid: mockUser.uid,
      email: null,
      displayName: null,
      photoURL: null,
      createdAt: expect.any(String)
    });
  });

  it('handles Firestore errors gracefully', async () => {
    const mockUser = {
      uid: 'error-uid-999',
      email: 'error@example.com'
    };

    const mockUserRef = { id: mockUser.uid };
    const firestoreError = new Error('Permission denied');
    firestoreError.code = 'permission-denied';

    doc.mockReturnValue(mockUserRef);
    getDoc.mockRejectedValue(firestoreError);

    // Should throw the error
    await expect(ensureUserDoc(mockUser)).rejects.toThrow('Permission denied');
  });
});