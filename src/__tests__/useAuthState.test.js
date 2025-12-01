import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock Firebase auth - we need to control when the callback is called
let mockCallback = null; // We'll store the callback here so we can call it later

// Mock Firebase auth - we just need onAuthStateChanged to return an unsubscribe function
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Store the callback so we can call it in our tests
    mockCallback = callback;
    // Return a dummy unsubscribe function
    return () => {}; // unsubscribe function
  }),
}));


vi.mock('../firebase.js', () => ({
  auth: {},
}));

import { useAuthState } from '../auth/useAuthState';

describe('useAuthState Hook', () => {
  beforeEach(() => {
    // Reset the callback before each test
    mockCallback = null;
    vi.clearAllMocks();
  });

  it('returns loading=true and user=null when first rendered, before Firebase responds', () => {
    const { result } = renderHook(() => useAuthState());

    // Before Firebase responds, should be loading with no user
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });


  it('returns user=null and loading=false when Firebase says no user is logged in', async () => {
    const { result } = renderHook(() => useAuthState());

    // Simulate Firebase responding: "No user is logged in"
    // Call the callback with null (Firebase's way of saying "no user")
    mockCallback(null);

    // Wait for React to update the state
    await waitFor(() => {
      // After Firebase responds, should have no user and not be loading
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it('returns user object and loading=false when Firebase says a user is logged in', async () => {

    // Create a mock user object
    const mockUser = {
        uid: 'test-uid-123',
        createdAt: new Date().toISOString(),
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg'
    }
    const { result } = renderHook(() => useAuthState());

    mockCallback(mockUser);

    
    await waitFor(() => {
      // After Firebase responds, should have no user and not be loading
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
    });
  });

});