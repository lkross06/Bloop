class DBHandler {

  constructor(){
    this.baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
    this.locations = {}
    this.posts = {};
    this.accounts = {};
  }

  setUser(user){
    this.user = user;
  }

  /** ------- LOCATION DATA ------ */

  /**
   * Get all locations from database
   * @returns list of JSONs representing all locations
   */
  async getLocationsAll(){
    try {
      const response = await fetch(`${this.baseURL}/locations/`);
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data = await response.json();

      Object.keys(data).forEach(key => {
        if (!data[key].locationID) {
          data[key].locationID = key;
        }
      });

      this.locations = data;
      return Object.values(data);
    } catch (e) {
      console.error('Error fetching locations:', e);
      return null;
    }
  }

  /**
   * Get specific location from database
   * @param {*} locationID unique identifier for this location
   * @returns JSON representing location with same locationID, null if not found
   */
  async getLocation(locationID) {
    try {
      const response = await fetch(`${this.baseURL}/locations/${locationID}`);
      if (!response.ok) throw new Error("Failed to fetch location");
      const data = await response.json();

      if (!data.locationID) {
        data.locationID = locationID;
      }

      this.locations[locationID] = data;
      return data;
    } catch (e) {
      console.error('Error fetching location:', e);
      return this.locations[String(locationID)] || null; 
    }
  }

  /**
   * Create a new location
   * @param {*} title title of location
   * @param {*} gender gender (male/female/gender-inclusive) of location
   * @param {*} lat latitude coords
   * @param {*} lng longitude coords
   * @returns locationID if successful, null otherwise
   */
  async createLocation(title, gender, lat, lng){
    try {
      //Get firebase ID token from authenticated user
      const token = this.user ? await this.user.getIdToken() : null;

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token){
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}/locations/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({title, gender, lat, lng})
      });

      if (!response.ok) throw new Error("Failed to create location");

      const {id} = await response.json();
      
      this.locations[id] = {
        title, 
        lat, 
        lng, 
        posts: [], 
        gender: gender ==="male" ? "M" : gender ==="female" ? "F" : "N"
      };

      return id;
    } catch (e) {
      console.error('Error creating location:', e);
      return null;
    }
  }

  /** ------- POST DATA ------ */

  /**
   * Get specific post from database based on Post ID
   * @param {*} postID unique identifier for this post
   * @returns JSON representing post with same postID, null if not found
   */
  async getPost(postID) {
    try {
      const response = await fetch(`${this.baseURL}/reviews/id/${postID}`);
      
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) throw new Error("Failed to fetch post");
      const data = await response.json();
      this.posts[postID] = data;
      return data;
    } catch (e) {
      console.error('Error fetching post:', e);
      return this.posts[String(postID)] || null; 
    }
  }

  /**
   * Get specific post from database based on Account ID and Location ID
   * @param {*} accountID unique identifier for account that made this post
   * @param {*} locationID unique identifier for location this post is about
   * @returns JSON representing post with same accountID/locationID, null if not found
   */
  async getPostByAccountAndLocation(accountID, locationID) {
    try {
      const response = await fetch(`${this.baseURL}/reviews/users/${accountID}/locations/${locationID}`);
      
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) throw new Error("Failed to fetch post");

      const data = await response.json();
      this.posts[data.reviewID] = data;
      return data;
    } catch (e) {
      console.error('Error fetching post by account and location:', e);
      return null; 
    }
  }

  async getPostsForLocation(locationID) {
    try {
      const response = await fetch(`${this.baseURL}/reviews/locations/${locationID}`);
      
      if (!response.ok) return []
      
      const data = await response.json();

      const posts = Object.entries(data).map(([id, post]) => ({ postID:id, ...post }));
      posts.forEach(post => {
        this.posts[post.postID] = post;
      });

    return posts;
    } catch (e) {
      console.error('Error fetching posts for location:', e);
      return [];  
    }
  }

  async createPost(locationID, accountID, cleanliness, availability, amenities, notes, timestamp){
    try {
      //Get firebase ID token from authenticated user
      const token = this.user ? await this.user.getIdToken() : null;

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token){
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseURL}/reviews/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({locationID, accountID, cleanliness, availability, amenities, notes, timestamp})
      });

      if (!response.ok) throw new Error("Failed to create post");

      const {id} = await response.json();

      this.posts[id] = {
        postID: id,
        locationID: locationID,
        accountID: accountID,
        cleanliness: cleanliness,
        availability: availability,
        amenities: amenities,
        notes: notes,
        timestamp: timestamp
      };
    
      return id;
    } catch (e) {
      console.error('Error creating post:', e);
      return null;
    }
  }

  async updatePost(postID, locationID, accountID, cleanliness, availability, amenities, notes, timestamp){
    try {
      const response = await fetch(`${this.baseURL}/reviews/id/${postID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({locationID, accountID, cleanliness, availability, amenities, notes, timestamp})
      });

      if (!response.ok) throw new Error("Failed to update post");
      
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
      console.error('Error updating post:', e);
      return false;
    }
  }

  /** ------- ACCOUNT DATA ------ */

  /**
   * Get specific account from database
   * @param {*} accountID unique identifier for this account
   * @returns JSON representing account with same accountID, null if not found
   */
  async getAccount(accountID) {
    try {
      const response = await fetch(`${this.baseURL}/users/${accountID}`);
      if (!response.ok) throw new Error("Failed to fetch account");
      const data = await response.json();
      this.accounts[accountID] = data;
      return data;
    } catch (e) {
      console.error('Error fetching account:', e);
      return null;
    }
  }

  /** -------- TESTING --------- */
  dumpAll(){
    console.log(this.accounts);
    console.log(this.posts);
    console.log(this.locations);
  }

}

export default DBHandler;