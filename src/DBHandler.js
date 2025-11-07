// DBHandler.js
import locations from "./data/location.json";
import posts from "./data/post.json";
import accounts from "./data/account.json";

/** ------- LOCATION DATA ------ */

/**
 * Get all locations from database
 * @returns list of JSONs representing all locations
 */
export function getLocationsAll(){
    return Object.values(locations);
}

/**
 * Get specific location from database
 * @param {*} locationID unique identifier for this location
 * @returns JSON representing location with same locationID, null if not found
 */
export function getLocation(locationID) {
  return locations[String(locationID)] || null;
}

/** ------- POST DATA ------ */

/**
 * Get specific post from database
 * @param {*} postID unique identifier for this post
 * @returns JSON representing post with same postID, null if not found
 */
export function getPost(postID) {
  return posts[String(postID)] || null;
}

/** ------- ACCOUNT DATA ------ */

/**
 * Get specific account from database
 * @param {*} accountID unique identifier for this account
 * @returns JSON representing account with same accountID, null if not found
 */
export function getAccount(accountID) {
  return accounts[String(accountID)] || null;
}