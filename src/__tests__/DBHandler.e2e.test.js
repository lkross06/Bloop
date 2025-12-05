import { describe, it, expect, vi, beforeEach } from 'vitest';
import DBHandler from '../DBHandler';

// Mock fetch globally
global.fetch = vi.fn();

describe('DBHandler End-to-End Tests', () => {
  let db;

  beforeEach(() => {
    vi.clearAllMocks();
    db = new DBHandler();
    // Mock console.error to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should create a post and then retrieve it', async () => {
    const postData = {
      locationID: 'loc-123',
      accountID: 'user-456',
      cleanliness: 4,
      availability: 5,
      amenities: 3,
      notes: 'Great bathroom!',
      timestamp: Date.now()
    };

    const createdPostId = 'post-789';
    const createdPost = {
      reviewID: createdPostId,
      ...postData
    };

    // Mock createPost API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: createdPostId })
    });

    // Create the post
    const postID = await db.createPost(
      postData.locationID,
      postData.accountID,
      postData.cleanliness,
      postData.availability,
      postData.amenities,
      postData.notes,
      postData.timestamp
    );

    // Verify post was created
    expect(postID).toBe(createdPostId);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reviews/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );

    // Mock getPost API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createdPost
    });

    // Retrieve the post
    const retrievedPost = await db.getPost(postID);

    // Verify post was retrieved correctly
    expect(retrievedPost).toBeDefined();
    expect(retrievedPost.reviewID).toBe(createdPostId);
    expect(retrievedPost.locationID).toBe(postData.locationID);
    expect(retrievedPost.accountID).toBe(postData.accountID);
    expect(retrievedPost.cleanliness).toBe(postData.cleanliness);
    expect(retrievedPost.availability).toBe(postData.availability);
    expect(retrievedPost.amenities).toBe(postData.amenities);
    expect(retrievedPost.notes).toBe(postData.notes);
  });

  it('should create a location and then retrieve it', async () => {
    const locationData = {
      title: 'Test Location',
      gender: 'male',
      lat: 34.0699,
      lng: -118.4438
    };

    const createdLocationId = 'loc-999';

    // Mock createLocation API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: createdLocationId })
    });

    // Create the location
    const locationID = await db.createLocation(
      locationData.title,
      locationData.gender,
      locationData.lat,
      locationData.lng
    );

    // Verify location was created
    expect(locationID).toBe(createdLocationId);

    // Mock getLocation API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        locationID: createdLocationId,
        title: locationData.title,
        gender: 'M',
        lat: locationData.lat,
        lng: locationData.lng
      })
    });

    // Retrieve the location
    const retrievedLocation = await db.getLocation(locationID);

    // Verify location was retrieved correctly
    expect(retrievedLocation).toBeDefined();
    expect(retrievedLocation.locationID).toBe(createdLocationId);
    expect(retrievedLocation.title).toBe(locationData.title);
    expect(retrievedLocation.lat).toBe(locationData.lat);
    expect(retrievedLocation.lng).toBe(locationData.lng);
  });
});
