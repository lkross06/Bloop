import { describe, it, expect, vi, beforeEach } from 'vitest';
import DBHandler from '../DBHandler';

global.fetch = vi.fn();

describe('DBHandler Auth & Location Creation Flow E2E Tests', () => {
  let db;
  let mockUser;
  
  beforeEach(() => {
    vi.clearAllMocks();
    db = new DBHandler();
    
    // Mock a Firebase user object with getIdToken method
    mockUser = {
      uid: 'firebase-user-123',
      email: 'testuser@example.com',
      displayName: 'Test User',
      getIdToken: vi.fn().mockResolvedValue('mock-firebase-token-xyz')
    };
    
    // Mock console.error
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should allow read operations but prevent write operations when not authenticated', async () => {
    // User is NOT authenticated (no setUser call)
    
    // Verify user CAN read all locations (read-only operation)
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'loc-001': {
          locationID: 'loc-001',
          title: 'Public Restroom 1',
          gender: 'M',
          lat: 34.05,
          lng: -118.25,
          posts: []
        },
        'loc-002': {
          locationID: 'loc-002',
          title: 'Public Restroom 2',
          gender: 'F',
          lat: 34.06,
          lng: -118.26,
          posts: []
        }
      })
    });

    const locations = await db.getLocationsAll();
    
    // Verify read operation succeeded
    expect(locations).toBeDefined();
    expect(locations).toHaveLength(2);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/locations/'),
      undefined // GET request with no auth required
    );

    // Verify user CAN read a specific location
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        locationID: 'loc-001',
        title: 'Public Restroom 1',
        gender: 'M',
        lat: 34.05,
        lng: -118.25,
        posts: []
      })
    });

    const location = await db.getLocation('loc-001');
    expect(location).toBeDefined();
    expect(location.title).toBe('Public Restroom 1');

    // Verify user CAN read posts for a location
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'review-001': {
          reviewID: 'review-001',
          locationID: 'loc-001',
          accountID: 'other-user',
          cleanliness: 4,
          availability: 5,
          amenities: 3
        }
      })
    });

    const posts = await db.getPostsForLocation('loc-001');
    expect(posts).toBeDefined();
    expect(posts).toHaveLength(1);

    // Verify user CANNOT create a location without authentication
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ 
        error: 'Unauthorized - Authentication required to create locations'
      })
    });

    const newLocationId = await db.createLocation(
      'Unauthorized Location',
      'unisex',
      34.07,
      -118.27
    );

    // Verify write operation was blocked
    expect(newLocationId).toBeNull();
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/locations/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.not.objectContaining({
          'Authorization': expect.anything()
        })
      })
    );

    // Verify user CANNOT create a post without authentication
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ 
        error: 'Unauthorized - Authentication required to create reviews'
      })
    });

    const newPostId = await db.createPost(
      'loc-001',
      'fake-account-id',
      5,
      5,
      5,
      'This should fail',
      Date.now()
    );

    // Verify write operation was blocked
    expect(newPostId).toBeNull();
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/reviews/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.not.objectContaining({
          'Authorization': expect.anything()
        })
      })
    );

    // Verify user CANNOT update a post without authentication
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ 
        error: 'Unauthorized - Authentication required to update reviews'
      })
    });

    const updateResult = await db.updatePost(
      'review-001',
      'loc-001',
      'fake-account-id',
      5,
      5,
      5,
      'This update should fail',
      Date.now()
    );

    // Verify update was blocked
    expect(updateResult).toBe(false);
  });

  it('should authenticate user via Firebase and create a location with token', async () => {
    // Simulate Firebase authentication by setting user
    db.setUser(mockUser);
    
    // Verify getIdToken will be called
    expect(mockUser.getIdToken).not.toHaveBeenCalled();

    // User creates a new location (requires authentication)
    const locationData = {
      title: 'Powell Library Restroom',
      gender: 'unisex',
      lat: 34.0722,
      lng: -118.4420
    };

    const createdLocationId = 'loc-powell-001';

    // Mock createLocation API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        id: createdLocationId,
        message: 'Location created successfully'
      })
    });

    // Create location with authenticated user
    const locationID = await db.createLocation(
      locationData.title,
      locationData.gender,
      locationData.lat,
      locationData.lng
    );

    // Verify Firebase token was requested
    expect(mockUser.getIdToken).toHaveBeenCalledTimes(1);

    // Verify location creation with auth header
    expect(locationID).toBe(createdLocationId);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/locations/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-firebase-token-xyz'
        }),
        body: expect.stringContaining(locationData.title)
      })
    );

    // Retrieve the created location
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        locationID: createdLocationId,
        title: locationData.title,
        gender: 'N',
        lat: locationData.lat,
        lng: locationData.lng,
        posts: []
      })
    });

    const retrievedLocation = await db.getLocation(createdLocationId);

    // Verify location retrieval
    expect(retrievedLocation).toBeDefined();
    expect(retrievedLocation.locationID).toBe(createdLocationId);
    expect(retrievedLocation.title).toBe(locationData.title);
    expect(retrievedLocation.lat).toBe(locationData.lat);
    expect(retrievedLocation.lng).toBe(locationData.lng);
  });

  it('should prevent unauthorized location creation if backend enforces auth', async () => {
    // User is not authenticated
    const locationData = {
      title: 'Protected Location',
      gender: 'female',
      lat: 34.0722,
      lng: -118.4420
    };

    // Mock API call - backend rejects request without auth
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ 
        error: 'Unauthorized - Authentication required'
      })
    });

    // Attempt to create location without authentication
    const locationID = await db.createLocation(
      locationData.title,
      locationData.gender,
      locationData.lat,
      locationData.lng
    );

    // Verify creation was blocked
    expect(locationID).toBeNull();
  });

  it('should complete authenticated workflow: set user, create location, add review', async () => {
    const accountId = mockUser.uid;
    const locationId = 'loc-workflow-001';
    const reviewId = 'review-workflow-001';

    // Set authenticated user
    db.setUser(mockUser);

    // Create location with authentication
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: locationId })
    });

    const createdLocationId = await db.createLocation(
      'Workflow Location',
      'unisex',
      34.05,
      -118.25
    );

    expect(createdLocationId).toBe(locationId);
    expect(mockUser.getIdToken).toHaveBeenCalled();

    // Add review to that location
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: reviewId })
    });

    const timestamp = Date.now();
    const createdReviewId = await db.createPost(
      locationId,
      accountId,
      5, // cleanliness
      4, // availability
      5, // amenities
      'Great bathroom!',
      timestamp
    );

    expect(createdReviewId).toBe(reviewId);
    expect(mockUser.getIdToken).toHaveBeenCalledTimes(2); // Once for location, once for review

    // Verify Authorization header was sent for review
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/reviews/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-firebase-token-xyz'
        })
      })
    );

    // Retrieve the review by account and location
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reviewID: reviewId,
        locationID: locationId,
        accountID: accountId,
        cleanliness: 5,
        availability: 4,
        amenities: 5,
        notes: 'Great bathroom!',
        timestamp: timestamp
      })
    });

    const review = await db.getPostByAccountAndLocation(accountId, locationId);

    expect(review).toBeDefined();
    expect(review.reviewID).toBe(reviewId);
    expect(review.locationID).toBe(locationId);
    expect(review.accountID).toBe(accountId);
    expect(review.cleanliness).toBe(5);
  });

  it('should retrieve user account data and their posts', async () => {
    const accountId = mockUser.uid;
    
    // Mock getAccount API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accountID: accountId,
        displayName: mockUser.displayName,
        email: mockUser.email,
        posts: ['review-001', 'review-002']
      })
    });

    const account = await db.getAccount(accountId);

    // Verify account retrieval
    expect(account).toBeDefined();
    expect(account.accountID).toBe(accountId);
    expect(account.displayName).toBe(mockUser.displayName);
    expect(account.posts).toHaveLength(2);

    // Mock getting posts for location
    const locationId = 'loc-test-001';
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'review-001': {
          reviewID: 'review-001',
          locationID: locationId,
          accountID: accountId,
          cleanliness: 4,
          availability: 5,
          amenities: 3,
          notes: 'Pretty good',
          timestamp: Date.now()
        },
        'review-002': {
          reviewID: 'review-002',
          locationID: locationId,
          accountID: accountId,
          cleanliness: 5,
          availability: 5,
          amenities: 5,
          notes: 'Excellent!',
          timestamp: Date.now()
        }
      })
    });

    const posts = await db.getPostsForLocation(locationId);

    // Verify posts retrieval
    expect(posts).toHaveLength(2);
    expect(posts[0].accountID).toBe(accountId);
    expect(posts[1].accountID).toBe(accountId);
  });

  it('should handle Firebase token refresh on multiple operations', async () => {
    db.setUser(mockUser);

    // Simulate multiple operations that require authentication
    const operations = [
      { type: 'location', id: 'loc-001' },
      { type: 'review', id: 'review-001' },
      { type: 'location', id: 'loc-002' }
    ];

    for (const op of operations) {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: op.id })
      });
    }

    // Create location
    await db.createLocation('Location 1', 'male', 34.05, -118.25);
    
    // Create review
    await db.createPost('loc-001', mockUser.uid, 4, 4, 4, 'Good', Date.now());
    
    // Create another location
    await db.createLocation('Location 2', 'female', 34.06, -118.26);

    // Verify token was requested for each operation
    expect(mockUser.getIdToken).toHaveBeenCalledTimes(3);
  });

  it('should update an existing post with authentication', async () => {
    db.setUser(mockUser);

    const postId = 'review-update-001';
    const locationId = 'loc-001';
    const accountId = mockUser.uid;

    // Mock update post API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    const timestamp = Date.now();
    const result = await db.updatePost(
      postId,
      locationId,
      accountId,
      5, // updated cleanliness
      5, // updated availability
      4, // updated amenities
      'Updated notes',
      timestamp
    );

    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/reviews/id/${postId}`),
      expect.objectContaining({
        method: 'PUT'
      })
    );
  });
});