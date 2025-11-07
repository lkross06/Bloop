// DBHandler.js
import locations from "./data/location.json";
import posts from "./data/post.json";
import accounts from "./data/account.json";

import { sha256 } from 'js-sha256';

function generateUniqueID(){
  return sha256(String(Date.now())); //creates a 256-bit hash using the current time in ms. so this is a one-time, deterministic UID
}

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

export function createPost(locationID, accountID, cleanliness, availability, amenities, notes){
  try {
    //generate a new unique ID
    const id = generateUniqueID();

    let newPost = {
      postID: id,
      locationID: locationID,
      accountID: accountID,
      cleanliness: cleanliness,
      availability: availability,
      amenities: amenities,
      notes: notes
    };
  
    //try to make sure the account/location exist first, so that the try/catch will catch bad values
    let a = accounts[accountID];
    let l = locations[locationID];
    if (a == null || l == null) throw new Error;

    //all values are valid! now we can actually write values
    a.posts.push(id);
    l.posts.push(id);

    posts[id] = newPost;

    return true;
  } catch {
    return false;
  }
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