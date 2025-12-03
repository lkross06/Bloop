import { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";


import { GoogleMap, LoadScriptNext } from "@react-google-maps/api";
const GOOGLE_LIBRARIES = ["marker"];

import addIcon from "./media/add.svg";
import aboutIcon from "./media/about.svg";
import userIcon from "./media/user.svg";

import DBHandler from "./DBHandler"
import LoginModal from "./auth/LoginModal";
import {useAuthState} from "./auth/useAuthState";

// used for log in with google and log out
import { signInWithPopup, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

// authenticating user
import { ensureUserDoc } from "./auth/ensureUserDoc"

const DB = new DBHandler();

//TODO: REPLACE WITH SESSION DATA
// var login = false;
const accountID = 41;

const privateApiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const privateMapID = import.meta.env.VITE_GOOGLE_MAPS_ID;

//ucla's coordinates (default)
const mapStartCoords = {lat: 34.0699, lng: -118.4438}

/**
 * zoom = 0   whole world
 * zoom = 10  city-wide
 * zoom = 15  neighborhood
 * zoom = 20  streets
 */
const minimumZoom = 11.5; //how far you can zoom out
const maximumZoom = 16.5; //how far you can zoom in
const defaultZoom = 15.5;

const minimumZoomSmall = 11.5;
const maximumZoomSmall = 16.9; //at 17, more labels are shown that would overcrowd the space
const defaultZoomSmall = 14;

const containerStyle = {
  width: "100%", //fill entire map-container div
  height: "100%",
};

const containerStyleSmall = {
  width: "100%",
  height: "15rem"
}

//how many seconds to wait before pinging again for new location
const geolocationPingTimeout = 15;

/**
 * Styles a pin's color based on the average rating for a singular location
 * @param {JSON[]} locationPosts List of JSONS corresponding to posts about this location
 * @returns PinElement properties
 */
function getPinProps(locationPosts){

  //no posts about this location so no color rating
  if (locationPosts == null || locationPosts.length < 1){
    return {
      background: "#AAAAAA",
      borderColor: "#666666",
      glyphColor: "#666666", //changes middle circle OR text color
    }
  }

  let sum = 0;
  let total = 0;

  for (const locationPost of locationPosts){
    sum += locationPost.cleanliness + locationPost.availability + locationPost.amenities;
    total += 3;
  }

  let average = sum / total;
  
  let backgroundColor = ""; //lighter
  let borderColor = ""; //darker

  if (average >= 4.5){
    backgroundColor = "#53CF59"
    borderColor = "#2B8F30"
  } else if (average >= 4){
    backgroundColor = "#9DD169"
    borderColor = "#628C38"
  } else if (average >= 3){
    backgroundColor = "#CFC167"
    borderColor = "#8F8339"
  } else if (average >= 2){
    backgroundColor = "#CF9B67"
    borderColor = "#8C6238"
  } else if (average > 0){
    backgroundColor = "#CF6C67"
    borderColor = "#8C3C38"
  } else if (average == 0){
    backgroundColor = "#9D150E"
    borderColor = "#6B0E09"
  }

  return {
      background: backgroundColor,
      borderColor: borderColor,
      glyphColor: borderColor, //changes middle circle OR text color
    }
}

/**
 * React Component with 0-5 yellow stars and [n - (0-5)] gray stars
 * @param {JSON} props contains {rating}, rating between 0-5
 * @returns static 5-star React component 
 */
function StarRating({ rating }){
  //if an invalid rating is passed in, render nothing
  if (rating < 0 || rating > 5) return <></>

  const star = "★";

  let nFull = Math.round(rating);
  let nEmpty = 5 - nFull;

  return <span>
    <span className="full-stars">{star.repeat(nFull)}</span>
    <span className="empty-stars">{star.repeat(nEmpty)}</span>
  </span>
}

/**
 * React component with the colored symbol for gender
 * @param {JSON} props contains {gender}, either "M"/"F"/"N" for male/female/non-binary
 * @returns static text React component
 */
function GenderSymbol({ gender }){
  const male = "♂";
  const female = "♀";
  const all = "inclusive"

  if (gender == "m" || gender == "M") return <span className="male">{male}</span>

  if (gender == "f" || gender == "F") return <span className="female">{female}</span>

  return <span className="non-binary">{all}</span>
}

/**
 * Attempts to remove a currently active banner (we can only open one banner at a time)
 * @param {String} id unique id for this banner (so we don't accidentally close other banners)
 * @param {String} force if true, banner is deleted immediately. if false (default), closing animation plays and asynchronously deleted
 * @returns true if successful and there was a banner to close, false otherwise
 */
function closeBanner(id, force = false){
  try {
    let banner = document.getElementById(String(id));
  
    //asynchronously remove item after 2 seconds (once animation is done)
    if (!force){
      banner.firstChild.classList.remove("open");
      setTimeout(
        () => { banner.remove(); },
        2000
      );
    } else {
      banner.remove();
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Renders a new banner at the top of the page
 * @param {String} id unique id for this banner (so we don't accidentally close other banners)
 * @param {*} content JSX HTML content to put in banner
 * @param {String} backgroundColor background color for banner
 * @param {Number} lifetime ms until the banner is closed, or -1 to stay open indefinitely
 */
function openBanner(id, content, backgroundColor, lifetime = -1){
  closeBanner(id, true);

  //make the span the first child in <body>
  var banner = document.createElement("div");
  banner.setAttribute("id", String(id));
  banner.setAttribute("class", "banner");
  banner.setAttribute("style", "z-index: "
    + String(10 + document.getElementsByClassName("banner").length) //default z-index for banners is 10, but stack on top of any existing banners
  );
  
  document.body.insertBefore(banner, document.body.firstChild);

  //render above the page
  ReactDOM.createRoot(banner).render(
    <>
      <div className="banner-container" style={ {"backgroundColor" : String(backgroundColor)} }>
        {content}
      </div>
    </>
  );

  //asynchronously start the open slide animation
  setTimeout(() => {
    banner.firstChild.classList.add("open");
  }, 0);

  //asynchronously wait to close
  if (lifetime != -1){
    setTimeout(() => {
      closeBanner(id);
    }, lifetime);
  }
}

/**
 * Attempts to remove a currently active modal, closing any other modals in the process (only one active at a time)
 * @returns true if successful and there was a modal to close, false otherwise
 */
function closeModal(){
  try{
    let modal = document.getElementById("modal");
    modal.remove();
    return true;
  } catch {
    return false;
  }
}

/**
 * Renders a new modal that closes onclick outside of modal body
 * @param {*} modalContent JSX HTML content for modal body
 */
function openModal(modalContent){

  closeModal();

  //make the span the first child in <body>
  var span = document.createElement("span");
  span.setAttribute("id", "modal");
  document.body.insertBefore(span, document.body.firstChild);

  ReactDOM.createRoot(span).render(
    <>
    <div onClick={(event) => { event.target.remove(); }} id="modal-container">
      <div onClick={(event) => { event.stopPropagation(); /* do nothing onClick */ }} id="modal-body"> 
        {modalContent}
      </div>
    </div>
    </>
  );
}

/**
 * Generates (not renders) HTML element for a location pop-up
 * @param {JSON} location location to render a pop-up for
 * @param {JSON[]} posts list of Posts about this Location
 * @param {Function} onSuccess callback function to trigger Map to re-render
 * @returns HTMLDivElement that can be rendered straight onto the Google Maps
 */
function LocationPopUp(location, posts, onSuccess, isLoggedIn) {
  function createPostModal(){
    //open a create form with this modal
    openModal(
      <PostCreateForm location={location} onSuccess={onSuccess} />
    );
  }

  let cleanliness_sum = 0;
  let availability_sum = 0;
  let amenities_sum = 0;

  let total_posts = 0;

  for (const post of posts){
    cleanliness_sum += post.cleanliness;
    availability_sum += post.availability;
    amenities_sum += post.amenities;

    total_posts += 1;
  }

  let locationRating = 0;
  let cleanlinessRating = 0;
  let availabilityRating = 0;
  let amenitiesRating = 0;

  if (total_posts != 0) {
    //get the rating by taking average, round to 1 decimal pt for formatting
    locationRating = ((cleanliness_sum + availability_sum + amenities_sum) / (total_posts * 3)).toFixed(1);
    
    //round the other ratings to be converted to StarRating components
    cleanlinessRating = Math.round(cleanliness_sum/total_posts);
    availabilityRating = Math.round(availability_sum/total_posts);
    amenitiesRating = Math.round(amenities_sum/total_posts);
  }

  const div = document.createElement("div");
  div.setAttribute("class", "location-popup"); //NOT "className" because this is HTML not JSX

  ReactDOM.createRoot(div).render(
    <>
      <span className="modal-header">
        <h3>{location.title}</h3>
        <h4 className="modal-subheader">{location.lat}° N, {-1 * location.lng}° W | <GenderSymbol gender={location.gender} /></h4>
      </span>

      <span className="location-popup-reviews">
        <p>Cleanliness</p>
        <StarRating rating={ cleanlinessRating } />
        
        <p>Availability</p>
        <StarRating rating={ availabilityRating } />
        
        <p>Amenities</p>
        <StarRating rating={ amenitiesRating } />
        
      </span>

      <span className="location-popup-attributes">
        <h4>{(total_posts != 0)? locationRating : "--"}</h4>
        <h4><StarRating rating={locationRating} /></h4>

        <p>{total_posts} {(total_posts == 1)? "review" : "reviews"}</p>
      </span>

      {
      //we're going to need to verify this manually when we send to the server
      (isLoggedIn)? 
        <button className="location-popup-button" onClick={createPostModal}>Create Post</button> : 
        <button className="location-popup-button" disabled>Create Post</button>
      }
    </>
  );

  return div;
}

/**
 * React component to render a small Google Map for placing/updating one location pin
 * @param {JSON} props contains {mapId, updateParentLocation}, mapId = private Map ID for styling, updateParentLocation = callback function whenever location pin is updated
 * @returns interactable Google Maps React component
 */
function MapSmall({ mapId, updateParentLocation }) {
  //references persist across renders and do not trigger re-renders, whereas states trigger re-renders
  const mapRef = useRef(null);

  const [mapInstance, setMapInstance] = useState(null);
  const activeMarker = useRef(null);

  const onLoad = (map) => {
    mapRef.current = map;
    setMapInstance(map);
  };

  const onClick = (e) => {
    const location = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    }

    updateMarker(location);
    updateParentLocation(location); //tell the parent component (location create form) where the new location pin is
  }

  /**
   * DESIGN DECISION
   * We choose to use JS objects instead of React objects (<AdvancedMarker... />) since this is more of a
   * "back end" endeavor and easy communication with other external services isn't guranteed if we use React objects.
   * So the only React object is the map, which handles everything.
   */

  /**
   * Asynchronously loads and render JS object (Marker) onto Google Map
   * @param {JSON} location location data where click was, { lat: Number, lng: Number }
   */
  async function updateMarker(location){
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    try {
      //remove the currently-rendered marker from the map
      if (activeMarker.current != null){
        activeMarker.current.map = null;
        activeMarker.current = null;
      }

      const marker = new AdvancedMarkerElement({
        position: {lat: location.lat, lng: location.lng},
        map: mapInstance
      });

      marker.zIndex = 1;
      activeMarker.current = marker;

      //focus the map on wherever the pin was just placed
      mapInstance.panTo({
        lat: marker.position.lat,
        lng: marker.position.lng
      });
      mapInstance.setZoom(maximumZoomSmall);

    } catch (e) {
      return
    }
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyleSmall}
      center={
        //LoadScript will reload this on re-renders
        (activeMarker.current == null)?
        { lat: mapStartCoords.lat, lng: mapStartCoords.lng } :
        {
          lat: activeMarker.current.position.lat,
          lng: activeMarker.current.position.lng
        }
      }
      zoom={defaultZoomSmall}
      onLoad={onLoad}
      onClick={onClick}
      options={{
        mapId,
        disableDefaultUI: true,
        minZoom: minimumZoomSmall,   
        maxZoom: maximumZoomSmall, 
      }} //disable default buttons (fullscreen, street view, etc.)
    >
      {/* empty children since we create marker via API */}
    </GoogleMap>
  );
}

/**
 * React component to render the main Google Map with location pins, current device location pin, and location pop-ups onClick
 * @param {JSON} props { mapId, trigger, setTrigger, deviceLocation }, mapId = private Map ID, trigger = trigger variable to watch --> re-render marker, setTrigger = callback function that takes locationID and updates marker with that location, deviecLocation = {lat, lng} corresponding to most recent device's location
 * @returns interactable Google Maps React component
 */
function Map({ mapId, trigger, setTrigger, deviceLocation, isLoggedIn }) {
  //the map takes a second to load from the API to we keep references to it
  //instead of just creating a new object for it
  const mapRef = useRef(null); //references will persist across re-renders of this component
  const [mapInstance, setMapInstance] = useState(null);
  
  const activeMarker = useRef(null); //currently selected marker with a pop-up
  const markersDict = useRef({}); //stores by locationID : AdvancedMarkerElement
  
  const activeDeviceMarker = useRef(null); //current device marker

  /**
   * We use useEffect to communicate with asynchronous events triggered externally.
   * In our case usually to update a parent React component from a change in the child,
   * or to communicate with our Google and Navigator APIs and asynchronous calls
   */

  //when mapInstance renders for the first time
  useEffect(() => {
    if (mapInstance == null) return;

    //delete any existing markers
    Object.keys(markersDict.current).forEach(key => {
      markersDict.current[key].setMap(null);
      delete markersDict.current[key];
    });
    
    //draw all new markers once
    for (const location of DB.getLocationsAll()) {
      addMarker(location);
    }
  }, [mapInstance]);

  //when the trigger tells us to update one of the location markers
  useEffect(() => {
    if (mapInstance == null || trigger == null) return;

    console.log(trigger);

    /* HERE WE EXPECT TRIGGER = LOCATION ID TO UPDATE */

    if (markersDict.current[trigger] != null){
      markersDict.current[trigger].setMap(null);
      delete markersDict.current[trigger];
    }

    const location = DB.getLocation(trigger);
    if (location != null) addMarker(location);

    /**
     * We must set back to null and re-trigger this callback (which returns immediately) here
     * because, if we set trigger again and the same location needs to be updated again,
     * useEffect() will not trigger because previous value == current value. This may happen
     * if we create a new location and immediately post about it (which very well might happen with
     * our users!). null ensures previous value != current value
     */
    setTrigger(null);

  }, [trigger]);

  //wait for asynchronous updates from Navigator API, managed by parent React component
  useEffect(() => {
    if (mapInstance == null || deviceLocation == null) return;    

    updateDeviceMarker(deviceLocation);

  }, [deviceLocation]);

  const onLoad = (map) => {
    mapRef.current = map;
    setMapInstance(map);
  };

  /**
   * Asynchronously loads and renders JS Object (marker) for the device's current location
   * @param {*} position contaings {lat, lng} to updated AdvancedMarkerElement
   */
  async function updateDeviceMarker(position){
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    try {
      let parser = new DOMParser();
      //see https://developers.google.com/maps/documentation/javascript/advanced-markers/graphic-markers#javascript
      const svgSrc = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="-16 -16 32 32">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="rgba(0,0,0,0.2)" />
          </filter>
        </defs>

        <!-- outer circle -->
        <circle cx="0" cy="0" r="10" fill="aliceblue" filter="url(#shadow)" />

        <!-- inner circle -->
        <circle cx="0" cy="0" r="8" fill="slateblue" />
      </svg>`;
      const svg = parser.parseFromString(svgSrc, 'image/svg+xml').documentElement;

      const marker = new AdvancedMarkerElement(
        {position: position,
        map: mapInstance
        });
      marker.append(svg);

      marker.zIndex = 2; //draw above any location markers, but not above location marker pop-ups

      google.maps.event.addListener(marker, "click", () => {
        mapInstance.panTo(position);
        mapInstance.setZoom(maximumZoom); //zoom into the user's position
      });

      if (activeDeviceMarker.current == null) {
        //when the device's location is found for the first time, zoom into its location
        mapInstance.panTo(position);
        mapInstance.setZoom(maximumZoom);
      } else {
        //remove currently rendered marker
        activeDeviceMarker.current.setMap(null);
      }

      activeDeviceMarker.current = marker;

    } catch (e) {

    }
  }

  /**
   * Asynchronously loads and renders JS object (Marker) onto Google Maps React component
   * @param {JSON} location location to add marker for
   */
  async function addMarker(location){
    /**
     * Handle mouse click event on a Google Maps marker
     * @param {AdvancedMarkerElement} marker JS object rendered on Google Maps map triggered by event
     */
    function handleMarkerClick(marker){
      if (marker.state == "pin"){
        //show the location pop-up
        closeMarkerPopup(activeMarker.current);
        openMarkerPopup(marker);
        activeMarker.current = marker;
      } else {
        //close the location pop-up
        closeMarkerPopup(marker);
        activeMarker.current = null;
      }
    }

    /**
     * Render the location pop-up for a marker representing a location
     * @param {AdvancedMarkerElement} marker JS object rendered on Google Maps map
     * @returns true if successful, false otherwise
     */
    function openMarkerPopup(marker){
      if (marker == null) return false;

      try {
          const locationData = DB.getLocation(marker.locationID);
          const postData = DB.getPostsForLocation(marker.locationID);

          marker.content = LocationPopUp(locationData, postData, (locationID) => {
            //on successful post creation, trigger a re-render
            setTrigger(locationID);
            mapInstance.panTo({lat: marker.position.lat + 0.003, lng: marker.position.lng})
          }, isLoggedIn); //pass in isLoggedIn to the LocationPopUp function
          marker.zIndex = 3;
          marker.state = "popup"

          //when a pop-up is shown, pan the map over to center on that location and offset by 0.003° N so that the large location pop-up is centered
          mapInstance.panTo({lat: marker.position.lat + 0.003, lng: marker.position.lng});

          return true
      } catch (e) {
        return false
      }
    }

    /**
     * Closes the currently-rendered location pop-up for a marker representing a location
     * @param {AdvancedMarkerElement} marker JS object rendered on Google Maps map
     * @returns true if successful, false otherwise
     */
    function closeMarkerPopup(marker){
      if (marker == null) return false;

      try {
        var postData = DB.getPostsForLocation(marker.locationID);

        marker.content = new PinElement(getPinProps(postData));
        marker.zIndex = 1;
        marker.state = "pin";

        return true;
      } catch (e) {
        return false;
      }
    }

    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

    try {
      let posts = [];

      for (const locationPost of location.posts){
        const retrievedPostData = DB.getPost(String(locationPost));
        if (retrievedPostData != null) posts.push(retrievedPostData);
      }

      //by default, render the pin (not selected state)
      const defaultPin = new PinElement(getPinProps(posts));

      const marker = new AdvancedMarkerElement({
        position: {lat: location.lat, lng: location.lng},
        map: mapInstance,
        content: defaultPin
      });

      marker.locationID = location.locationID; //custom property
      marker.zIndex = 1;
      marker.state = "pin";
      
      google.maps.event.addListener(marker, "click", () => { handleMarkerClick(marker); });

      markersDict.current[location.locationID] = marker;

    } catch (e) {

    }
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapStartCoords}
      zoom={defaultZoom}
      onLoad={onLoad}
      options={{
        mapId,
        disableDefaultUI: true,
        minZoom: minimumZoom,   
        maxZoom: maximumZoom, 
      }} //disable default buttons (fullscreen, street view, etc.)
    >
      {/* empty children since we create marker via API */}
    </GoogleMap>
  );
}

/**
 * React component form for creating a new Post
 * @param {JSON} props { location, onSuccess }, location = location to make post for, onSuccess = callback function to re-render map with new post data
 * @returns form React component
 */
function PostCreateForm({ location, onSuccess }){
  const defaultRating = 2.5;
  const maxNotesLength = 150;

  const [cleanliness, setCleanliness] = useState(defaultRating);
  const [availability, setAvailability] = useState(defaultRating);
  const [amenities, setAmenities] = useState(defaultRating);
  const [notes, setNotes] = useState("");

  const existingPostID = useRef(null);
  const [submitText, setSubmitText] = useState("Create Post");

  //if this account already posted this location, edit the existing post instead of creating a new one
  useEffect(() => {
    const post = DB.getPostByAccountAndLocation(accountID, location.locationID);

    console.log(post);

    if (post != null) {
      existingPostID.current = post.postID;
      setCleanliness(post.cleanliness);
      setAvailability(post.availability);
      setAmenities(post.amenities);
      setNotes(post.notes);
      setSubmitText("Update Post");
    }
  }, [location]);

  function handleSubmit(e) {
    e.preventDefault(); //do not reload the pag
    
    let postID = null;

    let timestamp = Date.now();

    if (existingPostID.current != null){
      postID = existingPostID.current;
      DB.updatePost(
        postID,
        location.locationID,
        accountID,
        Math.round(cleanliness),
        Math.round(availability),
        Math.round(amenities),
        notes,
        timestamp
      );
    } else {
      postID = DB.createPost(
        location.locationID,
        accountID,
        Math.round(cleanliness),
        Math.round(availability),
        Math.round(amenities),
        notes,
        timestamp
      );
    }
    
    //trigger the map to re-render the pin
    onSuccess(location.locationID);

    //show success banner for 5s
    closeModal();
    openBanner(
      "create-" + String(postID) + "-" + String(timestamp),
      <p>Post created successfully!</p>,
      "mediumseagreen",
      5000
    );
  };

  return (
    <form onSubmit={handleSubmit} className="create-form">
      <span className="modal-header">
        <h3>{location.title}</h3>
        <h4 className="create-form-rating"><StarRating rating={
          (cleanliness + amenities + availability) / 3
        } /></h4>
      </span>

      <div className="create-form-group">
        <label htmlFor="cleanliness" className="create-form-label">Cleanliness <span className="required-asterisk">*</span></label>
        <input
          type="range"
          id="cleanliness"
          className="create-form-slider"
          min="0"
          max="5"
          step="0.01"
          value={cleanliness}
          onChange={(e) => setCleanliness(Number(e.target.value))}
          required
        />
        <span className="slider-value"><StarRating rating={Math.round(cleanliness)} /></span>
      </div>

      <div className="create-form-group">
        <label htmlFor="availability" className="create-form-label">Availability <span className="required-asterisk">*</span></label>
        <input
          type="range"
          id="availability"
          className="create-form-slider"
          min="0"
          max="5"
          step="0.01"
          value={availability}
          onChange={(e) => setAvailability(Number(e.target.value))}
          required
        />
        <span className="slider-value"><StarRating rating={Math.round(availability)} /></span>
      </div>

      <div className="create-form-group">
        <label htmlFor="amenities" className="create-form-label">Amenities <span className="required-asterisk">*</span></label>
        <input
          type="range"
          id="amenities"
          className="create-form-slider"
          min="0"
          max="5"
          step="0.01"
          value={amenities}
          onChange={(e) => setAmenities(Number(e.target.value))}
          required
        />
        <span className="slider-value"><StarRating rating={Math.round(amenities)} /></span>
      </div>

      <div className="create-form-group">
        <label htmlFor="notes" className="create-form-label">Notes</label>
        <textarea
          id="notes"
          className="create-form-textarea"
          maxLength={maxNotesLength}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Flush your thoughts"
        />
        <span className="slider-value">{notes.length} / {maxNotesLength}</span>
      </div>

      <button type="submit" className="create-form-submit">Create Post</button>
    </form>
  );
}

/**
 * React component form for creating a new Location
 * @param {JSON} props { onSuccess, deviceLocation, isLoggedIn }, onSuccess = callback function to re-render map with new location, deviceLocation = {lat,lng} containing device's last-known location, isLoggedIn = true if user is logged in, false otherwise
 * @returns form React component
 */
function LocationCreateForm({ onSuccess, deviceLocation, isLoggedIn }){
  const maxNameLength = 30;

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState(null);

  const [enableSubmit, setEnableSubmit] = useState(false);

  useEffect(() => {
    if (name == "" || gender == "" || location == null) return;
    if (!isLoggedIn) return;

    setEnableSubmit(true);
  }, [name, gender, location]);

  function handleSubmit(e) {
    e.preventDefault(); //do not reload the page

    const latitude = parseFloat(location.lat.toFixed(4)); //+-0.0001° is close enough
    const longitude = parseFloat(location.lng.toFixed(4));

    let locationID = DB.createLocation(name, gender, latitude, longitude);

    //trigger the map to re-render the pin
    onSuccess(locationID);
    
    //show success message for 5s
    closeModal();
    openBanner(
      "create-" + String(locationID),
      <p>Location created successfully!</p>,
      "mediumseagreen",
      5000
    );
  };

  return (
    <form onSubmit={handleSubmit} className="create-form">
      <span className="modal-header">
        <h3>Add a New Bathroom</h3>
      </span>

      <div className="create-form-group">
        <label htmlFor="name" className="create-form-label">Name <span className="required-asterisk">*</span></label>
        <input
          type="text"
          id="name"
          className="create-form-text"
          maxLength={maxNameLength}
          placeholder="Boelter Hall, 4th Floor"
          onChange={(e) => { setName(e.target.value); } }
          required
        />
        <span className="slider-value">{name.length} / {maxNameLength}</span>
      </div>

      <div className="create-form-group">
        <label className="create-form-label">Gender <span className="required-asterisk">*</span></label>

        <div className="gender-radio-row">
          <label className="gender-option">
            <input
              type="radio"
              name="gender"
              id="M"
              value="M"
              checked={gender === "M"}
              onChange={(e) => setGender(e.target.value)}
              required
            />
            <span>Male</span>
          </label>

          <label className="gender-option">
            <input
              type="radio"
              name="gender"
              id="F"
              value="F"
              checked={gender === "F"}
              onChange={(e) => setGender(e.target.value)}
              required
            />
            <span>Female</span>
          </label>

          <label className="gender-option">
            <input
              type="radio"
              name="gender"
              id="N"
              value="N"
              checked={gender === "N"}
              onChange={(e) => setGender(e.target.value)}
              required
            />
            <span>Gender-inclusive</span>
          </label>
        </div>
      </div>

      <div className="create-form-group">
        <label className="create-form-label">Location <span className="required-asterisk">*</span></label>
        <div>
          {/* NOTE: we load LoadScript outside this updating React component */}
          <MapSmall mapId={privateMapID} updateParentLocation={(location) => { setLocation(location); } } deviceLocation={deviceLocation} />
        </div>
      </div>

      {
        //TODO: manually verify on back-end
        (enableSubmit)? 
          <button type="submit" className="create-form-submit">Create Location</button> : 
          <button type="submit" className="create-form-submit" disabled>Create Location</button>
      }
    </form>
  );
}

/**
 * React component button to be placed on the overlay UI
 * @param {JSON} props {onClick, content}, onClick = button click handler, content = HTML content inside button
 * @returns button React component
 */
function OverlayButton( { onClick, content } ){ 
  return <button className = "overlay-button" onClick={onClick}>{content}</button>
}

/**
 * React component text about this project
 * @returns HTML text content
 */
function AboutText(){
  return <>
    <div className="about">
      <h2 className="modal-header">About Bloop</h2>
      <p>Janani Acharya, Shrika Andhe, Shayla Kumaresan, Lucas Kalani Ross</p>
      <p>Bloop was developed as the capstone project for COM SCI 35L, taught at UCLA in Fall 2025 quarter with Professor Tobias Duerschmid.</p>
      <p>The project is open-source on <a href="https://github.com/lkross06/Bloop">GitHub</a>.
      </p>
    </div>
  </>
}

/**
 * React component text showing account information and posts made by that account
 * @returns HTML text content
 */
function AccountPage(){
  //placeholder information
  const [account, setAccount] = useState({
    accountID: 0,
    username: "--",
    password: "--",
    posts: []
  });

  const [posts, setPosts] = useState([])

  useEffect(() => {
    const a = DB.getAccount(accountID);
    if (a != null) setAccount(a);
  }, []);

  useEffect(() => {
    const ps = [];

    //try to load all posts
    for (const postID of account.posts){
      var p = DB.getPost(postID);
      if (p != null){
        //try to load location info to get location name of that post
        const rating = Math.floor((p.cleanliness + p.availability + p.amenities) / 3);
        const l = DB.getLocation(p.locationID);
        if (l != null){
          p.locationTitle = l.title;
          p.rating = rating;
          ps.push(p);
        }
      }
    }
    setPosts(ps);
  }, [account]);

  return <>
    <div className="account-page">
      <div className="account-page-header">
        <h2>{account.username}</h2>
        <h3>{posts.length} posts</h3>
      </div>

      <div className="account-page-list">
        {
          posts.map((post, index) => (
            <div className="account-page-item">
              <h4>{post.locationTitle}</h4>
              <StarRating rating={post.rating} />
              {(post.notes.length < 1)? <p className="no-notes">No notes</p> : <p>{post.notes}</p> }
            </div>
          ))
        }
      </div>
    </div>
  </>
}

/**
 * React App component for containing all React components in our application
 * @returns React component main container
 */
export default function App() {
  const [trigger, setTrigger] = useState(null); //set to a locationID to trigger that location marker to update
  const [deviceLocation, setDeviceLocation] = useState(null); //contains {lat, lng}

  // keeps track of whether the login is open or not
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  // keeps track of whether the user is actually logged in or not 
  const { user, loading } = useAuthState();
  //convert user to boolean- true if logged in, false if not
  const isLoggedIn = !!user;

  const handleGoogleLogin = async () => {
    try
    {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await ensureUserDoc(user);
      setIsLoginOpen(false);

      openBanner(
        "login-banner",
        <p>Login successful.</p>,
        "mediumseagreen",
        5000
      );
    }
    catch(err)
    {
      console.error("Google login failed", err);
      alert("Google login failed: " + (err?.message ?? err?.code ?? String(err)));
    }
  }

  const handleLogout = async () => {
    try{
      await signOut(auth);
      openBanner(
        "logout-banner",
        <p>Logout successful.</p>,
        "mediumseagreen",
        5000
      );
    }
    catch(err){
      console.error("Logout fauled", err);
    }
  }

  const handleEmailSignUp = async(email,password) => {
    try {
      const created = await createUserWithEmailAndPassword(auth, email, password);
      const user = created.user;

      await ensureUserDoc(user);
      setIsLoginOpen(false);

      openBanner(
        "login-banner",
        <p>Login successful.</p>,
        "mediumseagreen",
        5000
      );
    } catch(err) {
      console.error("Email sign up error:", err);
      alert("Sign up failed: " + (err?.message ?? String(err)));
    }
  }

  //asynchronously trigger so it runs after the App renders
  useEffect( () => {
    //only show banner if not loading and not logged in
    if (!loading && !isLoggedIn){
      openBanner(
        "login-banner",
        <p>Currently this page is read-only. <span className="login-button" onClick={() => {
          closeBanner("login-banner"); // closes the banner
          setIsLoginOpen(true); // shows the popup
        }}>Login</span> to create posts.</p>,
        "indianred"
      );
    }
  }, [loading, isLoggedIn]); //Dependency array to re-run effect when loading or isLoggedIn changes

  function pingLocation() {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported");
      return;
    }

    /**
     * DESIGN DECISION
     * https://stackoverflow.com/questions/46573591/watchposition-vs-getcurrentposition-in-geolocation
     * Using getCurrentPosition instead of watchPosition because device location is not a core feature,
     * and watchPosition consume much more battery staying constantly active than sending an asynchronous
     * ping every n seconds.
     */
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeviceLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (err) => {},
      {
        enableHighAccuracy: true,
        timeout: 5000 //try to poll API for 5s at a time
    });

    //ping GPS module again after timeout
    setTimeout(pingLocation, geolocationPingTimeout * 1000);
  };

  //TRY TO FIND THEIR LOCATION AS QUICKLY AS POSSIBLE WHEN THE USER FIRST INTERACTS WITH THE PAGE
  useEffect(() => {
    pingLocation();
  }, []);

  /**
   * Hides all default location pop-ups in Google Maps
   * https://stackoverflow.com/questions/7950030/can-i-remove-just-the-popup-bubbles-of-pois-in-google-maps-api-v3
   */
  function hideInfoWindow() {
    if (!window.google || !google.maps || !google.maps.InfoWindow) {
      setTimeout(hideInfoWindow, 10); //try 10ms later until Google API loads
      return;
    }

    var set = google.maps.InfoWindow.prototype.set;

    google.maps.InfoWindow.prototype.set = function (key, val) {
      if (key === 'map' && ! this.get('noSuppress')) return;
      
      set.apply(this, arguments); //disable pop-ups whenever you select a known POI
    }
  }

  hideInfoWindow();

  //handle plus button click
  const handlePlusClick = () => {
    if (isLoggedIn) {
      //show location create form
      openModal(
        <LoadScriptNext 
          googleMapsApiKey={privateApiKey}
          libraries={["marker"]}
          mapIds={[privateMapID]}
        >
          <LocationCreateForm onSuccess={setTrigger} isLoggedIn={isLoggedIn} />
        </LoadScriptNext>
      );
    } else {
      // User is NOT logged in - show login modal instead
      setIsLoginOpen(true);
    }
  };

  return <>
    {/* Login popup controlled by isLoginOpen */}
    <LoginModal 
      isOpen={isLoginOpen}
      onClose={() => setIsLoginOpen(false)}
      onGoogleLogin={handleGoogleLogin}
      onEmailSignUp={handleEmailSignUp}
    />
    <div className="overlay">
      <h1 id="app-title" className="overlay">bloop</h1>

      {isLoggedIn && (
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      )}

      <span className="overlay-buttons-left">
        <OverlayButton onClick={handlePlusClick} 
        content={
          <img src={addIcon} alt="Add icon" />
        } />
        <OverlayButton onClick={() => {
          if (!isLoggedIn){
            openBanner(
              "account-page", 
              <p>Please login to see account information.</p>,
              "indianred",
              5000
            );
          } else {
            openModal(<AccountPage />);
          }
        }} content={
          <img src={userIcon} alt="User icon" />
        } />
      </span>
      <span className="overlay-buttons-right">
        <OverlayButton onClick={() => { openModal(<AboutText />); }} content={
            <img src={aboutIcon} alt="About icon" />
          } />
      </span>
    </div>
    <div className="map-container">
      <LoadScriptNext
        googleMapsApiKey={privateApiKey}
        libraries={GOOGLE_LIBRARIES}
        mapIds={[privateMapID]}
      >
        <Map mapId={privateMapID} trigger={trigger} setTrigger={setTrigger} deviceLocation={deviceLocation} isLoggedIn={isLoggedIn} />
      </LoadScriptNext>
    </div>
  </>;
}
