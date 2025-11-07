// DBHandler.js
import locations from "./data/location.json";
import posts from "./data/post.json";
import accounts from "./data/account.json";

// Location functions

/**
 * Get all locations from database
 * @returns all location data in a list
 */
export function getLocationsAll(){
    return Object.values(locations);
}

export function getLocation(locationID) {
  return locations[locationID] || null;
}

// Post functions
export function getPost(postID) {
  return posts[postID] || null;
}

// Account functions
export function getAccount(accountID) {
  return accounts[accountID] || null;
}

// Example: get all posts for a location
export function getPostsForLocation(locationID) {
  const loc = getLocation(locationID);
  if (!loc) return [];
  return loc.posts.map(pid => getPost(pid));
}
