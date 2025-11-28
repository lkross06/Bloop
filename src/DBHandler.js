// DBHandler.js
import locationData from "./data/location.json";
import postData from "./data/post.json";
import accountData from "./data/account.json";

class DBHandler {

  constructor(){
    this.locations = locationData;
    this.posts = postData;
    this.accounts = accountData;
  }

  static #generateUniqueID(){
    return Date.now(); //theoretically deterministic
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

  /**
   * Create a new location
   * @param {*} title title of location
   * @param {*} gender gender (male/female/gender-inclusive) of location
   * @param {*} lat latitude coords
   * @param {*} lng longitude coords
   * @returns locationID if successful, null otherwise
   */
  createLocation(title, gender, lat, lng){
    try {
      const id = DBHandler.#generateUniqueID();

      if (gender == "male"){
        gender = "M"
      } else if (gender == "female"){
        gender = "F"
      } else {
        gender = "N"
      }

      let location = {
        locationID: id,
        title: title,
        lat: Number(lat),
        lng: Number(lng),
        posts: [],
        gender: gender
      }

      this.locations[id] = location;

      return id;
    } catch (e) {
      return null;
    }
  }

  /** ------- POST DATA ------ */

  /**
   * Get specific post from database based on Post ID
   * @param {*} postID unique identifier for this post
   * @returns JSON representing post with same postID, null if not found
   */
  getPost(postID) {
    return this.posts[String(postID)] || null;
  }

  /**
   * Get specific post from database based on Account ID and Location ID
   * @param {*} accountID unique identifier for account that made this post
   * @param {*} locationID unique identifier for location this post is about
   * @returns JSON representing post with same accountID/locationID, null if not found
   */
  getPostByAccountAndLocation(accountID, locationID) {
    try {
      const a = this.getAccount(accountID);
      const l = this.getLocation(locationID);

      const a_posts = new Set(a.posts);
      for (const l_post of l.posts){
        if (a_posts.has(l_post)){
          //we found our post
          return this.getPost(l_post);
        }
      }

      return null;
    } catch (e) {
      return null;
    }
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

  createPost(locationID, accountID, cleanliness, availability, amenities, notes, timestamp){
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
        notes: notes,
        timestamp: timestamp
      };
    
      //try to make sure the account/location exist first, so that the try/catch will catch bad values
      let a = this.accounts[accountID];
      let l = this.locations[locationID];
      if (a == null || l == null) throw new Error;

      //all values are valid! now we can actually write values
      a.posts.push(id);
      l.posts.push(id);

      this.posts[id] = newPost;

      return id;
    } catch (e) {
      return null;
    }
  }

  updatePost(postID, locationID, accountID, cleanliness, availability, amenities, notes, timestamp){
    try {
      this.posts[postID] = {
        postID: postID,
        locationID: locationID,
        accountID: accountID,
        cleanliness: cleanliness,
        availability: availability,
        amenities: amenities,
        notes: notes,
        timestamp: timestamp
      };

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

  testGET(){
    fetch("http://localhost:3000/test")
      .then((res) => res.json())
      .then((data) => console.log(data.message))
      .catch((err) => console.error("Fetch error:", err));
  }
}

export default DBHandler;