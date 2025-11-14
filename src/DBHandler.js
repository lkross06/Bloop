// DBHandler.js
import locationData from "./data/location.json";
import postData from "./data/post.json";
import accountData from "./data/account.json";

import { sha256 } from 'js-sha256';

class DBHandler {

  constructor(){
    this.locations = locationData;
    this.posts = postData;
    this.accounts = accountData;
  }

  static #generateUniqueID(){
    // return sha256(String(Date.now())); //creates a 256-bit hash using the current time in ms. so this is a one-time, deterministic UID
    return Date.now();
  }

  /** ------- LOCATION DATA ------ */

  /**
   * Get all locations from database
   * @returns list of JSONs representing all locations
   */
  getLocationsAll(){
    return Object.values(this.locations);
  }

  /**
   * Get specific location from database
   * @param {*} locationID unique identifier for this location
   * @returns JSON representing location with same locationID, null if not found
   */
  getLocation(locationID) {
    return this.locations[String(locationID)] || null;
  }

  /** ------- POST DATA ------ */

  /**
   * Get specific post from database
   * @param {*} postID unique identifier for this post
   * @returns JSON representing post with same postID, null if not found
   */
  getPost(postID) {
    return this.posts[String(postID)] || null;
  }

  getPostsForLocation(locationID) {
    const location = this.getLocation(locationID);

    if (location == null){ return null; }

    var posts = []

    for (const postID of location.posts){
      var post = this.getPost(postID);
      if (post != null) { posts.push(post); }
    }

    return posts;
  }

  createPost(locationID, accountID, cleanliness, availability, amenities, notes){
    try {
      //generate a new unique ID
      const id = DBHandler.#generateUniqueID();

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
      let a = this.accounts[accountID];
      let l = this.locations[locationID];
      if (a == null || l == null) throw new Error;

      //all values are valid! now we can actually write values
      a.posts.push(id);
      l.posts.push(id);

      this.posts[id] = newPost;

      return true;
    } catch (e) {
      return false;
    }
  }

  /** ------- ACCOUNT DATA ------ */

  /**
   * Get specific account from database
   * @param {*} accountID unique identifier for this account
   * @returns JSON representing account with same accountID, null if not found
   */
  getAccount(accountID) {
    return this.accounts[String(accountID)] || null;
  }

  /** -------- TESTING --------- */
  dumpAll(){
    console.log(this.accounts);
    console.log(this.posts);
    console.log(this.locations);
  }

}

export default DBHandler;