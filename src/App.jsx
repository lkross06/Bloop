import { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import { GoogleMap, LoadScriptNext } from "@react-google-maps/api";
import DBHandler from "./DBHandler"

const DB = new DBHandler();

//TODO: REPLACE WITH SESSION DATA
var login = false;
const accountID = 41;

const privateApiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const privateMapID = import.meta.env.VITE_GOOGLE_MAPS_ID;

const mapStartCoords = {lat: 34.0699, lng: -118.4438} //right now this is just ucla's coordinates

/**
 * zoom = 0   whole world
 * zoom = 10  city-wide
 * zoom = 15  neighborhood
 * zoom = 20  streets
 */
const minimumZoom = 11.5; //how far you can zoom out (1 = world view, 18 = street views)
const maximumZoom = 16.5; //how far you can zoom in
const defaultZoom = 15.5;

//for the create location map
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

/**
 * Styles a pin's based on the average rating for a singular location
 * @param {JSON[]} locationPosts List of JSONS corresponding to posts about this location
 * @returns PinElement properties
 */
function getPinProps(locationPosts){

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

  let average = sum / total; //otherwise, get an average that we can assign a red-yellow-green color to! 
  
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
 * Generates a React Component with 0-5 yellow stars and n-(0-5) gray stars, rounded down from the rating
 * @param {JSON} props contains {rating}, average rating of Post or Location
 * @returns static star rating HTML object
 */
function StarRating( {rating} ){
  const star = "★";

  let nFull = Math.round(rating);
  let nEmpty = 5 - nFull;

  return <span>
    {/* Use CSS classes to color the different stars */}
    <span className="full-stars">{star.repeat(nFull)}</span>
    <span className="empty-stars">{star.repeat(nEmpty)}</span>
  </span>
}

/**
 * Generates a React Component with the colored symbol for gender
 * @param {JSON} props contains {gender}, either "M"/"F"/"N" for male/female/non-binary
 * @returns static gender HTML object
 */
function GenderSymbol( {gender} ){
  const male = "♂";
  const female = "♀";
  // const all = "⚧";
  // const male = "male";
  // const female = "female";
  const all = "inclusive"

  if (gender == "m" || gender == "M") return <span className="male">{male}</span>

  if (gender == "f" || gender == "F") return <span className="female">{female}</span>

  return <span className="non-binary">{all}</span>
}

/**
 * Tries to close a currently active banner (we can only open one banner
 * at a time)
 * @param {String} id unique id for this banner (so we don't accidentally close other banners)
 * @param {String} force if true, banner is deleted immediately. if false, closing animation plays and asynchronously deleted
 * @returns true if successful and there was a banner to close, false otherwise
 */
function closeBanner(id, force = false){
  try {
    let banner = document.getElementById(String(id));
  
    // asynchronously remove item after 2 seconds (once animation is done)
    if (!force){
      banner.firstChild.classList.remove("open"); //start slide up
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
 * React component for showing a banner at the top of the site
 * @param {String} id unique id for this banner (so we don't accidentally close other banners)
 * @param {HTMLElement} content content to put in banner
 * @param {String} backgroundColor background color for banner
 * @param {Number} lifetime ms until the banner is closed, or -1 to stay open indefinitely
 */
function openBanner(id, content, backgroundColor, lifetime = -1){

  //try to close the same instance of this banner
  closeBanner(id, true);

  //make the span the first child in <body>
  var banner = document.createElement("div");
  banner.setAttribute("id", String(id));
  banner.setAttribute("class", "banner");
  banner.setAttribute("style", "z-index: "
    + String(10 + document.getElementsByClassName("banner").length) //default value is 100, but stack on top of any existing banners
  );
  
  document.body.insertBefore(banner, document.body.firstChild);

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
      closeBanner(id); //TODO: it will close WHATEVER banner is open, even if it's from another lifetime...
    }, lifetime);
  }
}

/**
 * Tries to close a currently active modal (we can only open one modal
 * at a time)
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
 * Creates a new modal React component that auto-destructs onclick
 * outside of modal body
 * @param {ReactComponentElement} modalContent JSX HTML for modal body
 */
function openModal(modalContent){

  closeModal(); //close an active modal

  //make the span the first child in <body>
  var span = document.createElement("span");
  span.setAttribute("id", "modal");
  document.body.insertBefore(span, document.body.firstChild);

  ReactDOM.createRoot(span).render(
    <>
    <div onClick={(event) => { event.target.remove(); }} id="modal-container">
      <div onClick={(event) => { event.stopPropagation(); }} id="modal-body">
        {modalContent}
      </div>
    </div>
    </>
  );
}

/**
 * Generate the HTML DOM for a location pop-up
 * @param {JSON} location Location to render a pop-up for
 * @param {JSON[]} posts list of Posts about this Location
 * @param {function} onSuccess callback function to trigger Map to update
 * @returns HTMLDivElement that can be rendered straight onto the Google Maps
 */
function LocationPopUp(location, posts, onSuccess) {
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
    locationRating = ((cleanliness_sum + availability_sum + amenities_sum) / (total_posts * 3)).toFixed(1); //get the rating by taking average, round to 1 decimal pt for formatting
    
    cleanlinessRating = Math.round(cleanliness_sum/total_posts);
    availabilityRating = Math.round(availability_sum/total_posts);
    amenitiesRating = Math.round(amenities_sum/total_posts);
  }

  //create empty div
  const div = document.createElement("div");
  div.setAttribute("class", "location-popup"); //NOT "className" because this is technically HTML not JSX

  //render JSX content inside div
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
      (login)? 
        <button className="location-popup-button" onClick={createPostModal}>Create Post</button> : 
        <button className="location-popup-button" disabled>Create Post</button>
      }
    </>
  );

  return div;
}

/**
 * 
 * @param {*} param0 
 * @returns 
 */
function MapSmall({ mapId, updateParentLocation }) {
  //the map takes a second to load from the API to we keep references to it
  //instead of just creating a new object for it
  const mapRef = useRef(null); //references will persist across re-renders of this component
  const [mapInstance, setMapInstance] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);

  //we need React's useEffect to stay connected with external
  //systems (in this case our API)
  useEffect(() => {
    if (!mapInstance) return;

    //wait for the library to be available to use
    
  }, [mapInstance]); //list our map as a dependency that the API can read/write

  const onLoad = (map) => {
    mapRef.current = map;
    setMapInstance(map);
  };

  //NOTE: choosing to use JS objects instead of React objects (<AdvancedMarker... />) since this is more of a
  //"back end" endeavor and easy communication with other external services isn't guranteed if we use React objects.
  //So the only React object is the map, which handles everything.

  /**
   * Asynchronously load JS object (Marker) to render on Google Maps Map React component.
   * See notes below
   * @param {JSON} location JSON containing Location data
   */
  async function updateMarker(location){
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker"); //the asynchronous part comes in here

    try {
      if (activeMarker != null){
        activeMarker.map = null; //dereference from map so we can make a new one
        setActiveMarker(null);
      }

      //make the actual element
      const marker = new AdvancedMarkerElement({position: {lat: location.lat, lng: location.lng}, map: mapInstance}); //add the graphics and map

      marker.zIndex = 1;
      setActiveMarker(marker);

      //now pan this map to the location
      mapInstance.panTo({
        lat: marker.position.lat,
        lng: marker.position.lng
      });
      mapInstance.setZoom(maximumZoomSmall);

    } catch (e) {
      console.error(e);
    }
  }

  // https://stackoverflow.com/questions/7950030/can-i-remove-just-the-popup-bubbles-of-pois-in-google-maps-api-v3
  // Here we redefine the set() method.
  //   If it is called for map option, we hide the InfoWindow, if "noSuppress"  
  //   option is not true. As Google Maps does not know about this option,  
  //   its InfoWindows will not be opened.
  var set = google.maps.InfoWindow.prototype.set;

  google.maps.InfoWindow.prototype.set = function (key, val) {
      if (key === 'map' && ! this.get('noSuppress')) return;

      set.apply(this, arguments); //disable pop-ups whenever you select a known POI
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyleSmall}
      center={
        //for some reason the LoadScript is reloading here every time, so if we already placed a marker pan there instead
        (activeMarker == null)?
        { lat: mapStartCoords.lat, lng: mapStartCoords.lng } :
        {
          lat: activeMarker.position.lat,
          lng: activeMarker.position.lng
        }
      }
      zoom={defaultZoomSmall} //let's show all of LA for now
      onLoad={onLoad}
      onClick={(e) => {
        const location = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng()
        }

        updateMarker(location);
        updateParentLocation(location); //tell the parent component (form) what the user's new location passed in is
      }}
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
 * React Map component for rendering Google Maps interactable map, along with all things rendered in it 
 * @param {JSON} props Takes { mapId, trigger, onPostCreateSuccess }-- private Map ID, trigger variable to watch --> re-render markers, and callback function to trigger re-render
 * @returns React component rendering interactable map and all interactble elements in it
 */
function Map({ mapId, trigger, onPostCreateSuccess }) {
  //the map takes a second to load from the API to we keep references to it
  //instead of just creating a new object for it
  const mapRef = useRef(null); //references will persist across re-renders of this component
  const [mapInstance, setMapInstance] = useState(null);

  /**
   * Justification for using local variables instead of React states
   * 
   * Using React states requires setting the <GoogleMap /> properties on
   * every update, which makes panning from marker to marker very choppy
   * since panTo does not work. Using local variables means its harder to
   * track this state across React components, however callback functions
   * can get around this problem.
   */

  //currently selected marker with a pop-up
  let activeMarker = null;
  
  //also keep track of the currently drawn device marker
  let activeDeviceMarker = null;

  //we need React's useEffect to stay connected with external
  //systems (in this case our API)
  useEffect(() => {
    if (!mapInstance) return;

    //take the generated bathroom data and add as markers
    for (const location of DB.getLocationsAll()) {
      addMarker(location);
    }
    
  }, [mapInstance, trigger]); //list our map as a dependency that the API can read/write

  const onLoad = (map) => {
    mapRef.current = map;
    setMapInstance(map);
  };

  //window has a built-in location tracker as an asynchronous API
  //  that pings when it finds the laptop's GPS coordinates
  if ("geolocation" in navigator) {
    //geolocation is available
    navigator.geolocation.watchPosition(
      (position) => { /* SUCCESS CALLBACK FUNCTION */
        updateDeviceMarker({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }
    );
  } else {
    //gelocation is not available
    //we don't really have to do anything
  }

  //NOTE: choosing to use JS objects instead of React objects (<AdvancedMarker... />) since this is more of a
  //"back end" endeavor and easy communication with other external services isn't guranteed if we use React objects.
  //So the only React object is the map, which handles everything.

  /**
   * Asynchronously load JS object (Marker) that updates whenever Navigator API asynchronously updates
   * device's current GPS position
   * 
   * @param {*} position contaings {lat, lng} to updated AdvancedMarkerElement
   */
  async function updateDeviceMarker(position){
    //first delete the currently drawn marker if there is one
    if (activeDeviceMarker != null){
      activeDeviceMarker.map = null; //dereference from map
    }

    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker"); //the asynchronous part comes in here

    try {

      let parser = new DOMParser();
      //modified from https://developers.google.com/maps/documentation/javascript/advanced-markers/graphic-markers#javascript
      const svgSrc = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="-16 -16 32 32">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="rgba(0,0,0,0.2)" />
          </filter>
        </defs>

        <!-- Outer circle -->
        <circle cx="0" cy="0" r="10" fill="aliceblue" filter="url(#shadow)" />

        <!-- Inner circle -->
        <circle cx="0" cy="0" r="8" fill="slateblue" />
      </svg>`;
      const svg = parser.parseFromString(svgSrc, 'image/svg+xml').documentElement;

      //make the actual element
      const marker = new AdvancedMarkerElement(
        {position: position,
        map: mapInstance
        });
      marker.append(svg);

      marker.zIndex = 2; //draw above any location markers

      google.maps.event.addListener(marker, "click", () => {
        mapInstance.panTo(position);
        mapInstance.setZoom(maximumZoom); //zoom into the user's position
      });

      if (activeDeviceMarker == null) {
        //if this is our first time loading the page, pan to the user's location
        mapInstance.panTo(position);
        mapInstance.setZoom(maximumZoom); //zoom into the user's position
      }

      activeDeviceMarker = marker;

    } catch {
      //position was probably null we don't really care
    }
  }

  /**
   * Asynchronously load JS object (Marker) to render on Google Maps Map React component.
   * 
   * NOTE: choosing to use JS objects instead of React objects (<AdvancedMarker... />) since this is more of a
   *   back-end endeavor and easy communication with other external services isn't guranteed if we use React objects.
   *   So the only React object is the map, which handles everything.
   * @param {JSON} location JSON containing Location data
   */
  async function addMarker(location){
    /**
     * Handle mouse click event on a marker
     * @param {AdvancedMarkerElement} marker JS object rendered on Google Maps map
     */
    function handleMarkerClick(marker){
      if (marker.state == "pin"){
        closeMarkerPopup(activeMarker);
        openMarkerPopup(marker);
        activeMarker = marker;
      } else {
        closeMarkerPopup(marker);
        activeMarker = null;
      }
    }

    /**
     * Open the location pop-up for a marker representing a location
     * @param {AdvancedMarkerElement} marker JS object rendered on Google Maps map
     * @returns true if successful, false otherwise
     */
    function openMarkerPopup(marker){
      if (marker == null) return;

      try {
          const locationData = DB.getLocation(marker.locationID);
          const postData = DB.getPostsForLocation(marker.locationID);

          marker.content = LocationPopUp(locationData, postData, onPostCreateSuccess);
          marker.zIndex = 2;
          marker.state = "popup"

          //when a pop-up is shown, pan the map over to center on that location
          //and offset by 0.003° N so that the large location pop-up is centered
          mapInstance.panTo({lat: marker.position.lat + 0.003, lng: marker.position.lng});

          return true
      } catch (e) {
        console.error(e);
        return false
      }
    }

    /**
     * Closes the currently-open location pop-up for a marker representing a location
     * @param {AdvancedMarkerElement} marker JS object rendered on Google Maps map
     * @returns true if successful, false otherwise
     */
    function closeMarkerPopup(marker){
      if (marker == null) return;

      try {
        var postData = DB.getPostsForLocation(marker.locationID);

        marker.content = new PinElement(getPinProps(postData));
        marker.zIndex = 1;
        marker.state = "pin";

        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    }

    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker"); //the asynchronous part comes in here

    try {

      //first try to load all of the posts related to this location
      //if we store this information with the React component we get around having to keep polling the DBMS
      let posts = []

      //access all of the posts related to this location
      for (const locationPost of location.posts){
        const retrievedPostData = DB.getPost(String(locationPost));
        //if the post actually exists
        if (retrievedPostData != null) posts.push(retrievedPostData);
      }

      //make the graphics
      const defaultPin = new PinElement(getPinProps(posts));

      //make the actual element
      const marker = new AdvancedMarkerElement({position: {lat: location.lat, lng: location.lng}, map: mapInstance, content: defaultPin}); //add the graphics and map

      marker.locationID = location.locationID;
      marker.zIndex = 1;
      marker.state = "pin";
      
      google.maps.event.addListener(marker, "click", () => { handleMarkerClick(marker); });

    } catch (e) {
      console.error(e);
    }
  }

  // https://stackoverflow.com/questions/7950030/can-i-remove-just-the-popup-bubbles-of-pois-in-google-maps-api-v3
  // Here we redefine the set() method.
  //   If it is called for map option, we hide the InfoWindow, if "noSuppress"  
  //   option is not true. As Google Maps does not know about this option,  
  //   its InfoWindows will not be opened.
  var set = google.maps.InfoWindow.prototype.set;

  google.maps.InfoWindow.prototype.set = function (key, val) {
      if (key === 'map' && ! this.get('noSuppress')) return;

      set.apply(this, arguments); //disable pop-ups whenever you select a known POI
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={{
        lat: mapStartCoords.lat,
        lng: mapStartCoords.lng
      }}
      zoom={defaultZoom} //let's show all of LA for now
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
 * @param {JSON} props contains { location, onSuccess }, location to make post for, callback function to re-render map with new post data
 * @returns React component
 */
function PostCreateForm( { location, onSuccess }){
  //in theory, when this form appears the locationID is known (because that button triggers this modal)
  //  as well as the accountID (session storage..?)
  const defaultRating = 3;
  const maxNotesLength = 150;

  const [cleanliness, setCleanliness] = useState(defaultRating);
  const [availability, setAvailability] = useState(defaultRating);
  const [amenities, setAmenities] = useState(defaultRating);
  const [notes, setNotes] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    let postID = DB.createPost(location.locationID, accountID, cleanliness, availability, amenities, notes); //TODO: currently we're just choosing a random account/location to post from/about
    
    onSuccess(); //make the pin re-render

    //make a success message appear
    closeModal();
    openBanner(
      "create-" + String(postID),
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
        <span className="slider-value">{Math.round(cleanliness)}</span>
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
        <span className="slider-value">{Math.round(availability)}</span>
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
        <span className="slider-value">{Math.round(amenities)}</span>
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
 * @param {JSON} props contains { onSuccess }, callback function to re-render map with new location
 * @returns React component
 */
function LocationCreateForm( { onSuccess } ){

  const maxNameLength = 30;

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();

    const latitude = parseFloat(location.lat.toFixed(4));
    const longitude = parseFloat(location.lng.toFixed(4));


    let locationID = DB.createLocation(name, gender, latitude, longitude);

    onSuccess(); //trigger the map to re-render
    
    //make a success message appear
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
          {/* make another map to render */}
          {/* NOTE: we load LoadScript outside the updating react component */}
          <MapSmall mapId={privateMapID} updateParentLocation={(location) => { setLocation(location); }  } />
        </div>
      </div>

      {
        //we're going to need to verify this manually when we send to the server
        (login)? 
          <button type="submit" className="create-form-submit">Create Location</button> : 
          <button type="submit" className="create-form-submit" disabled>Create Location</button>
      }
    </form>
  );
}

/**
 * Create a React component button to be placed on the overlay UI
 * @param {JSON} props contains onClick (function to call on button click), content (content inside button)
 * @returns React component
 */
function OverlayButton( { onClick, content } ){ 
  return <button className = "overlay-button" onClick={onClick}>{content}</button>
}

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
 * React App component for containing all React components in our application
 * @returns React component main container
 */
export default function App() {

  //we will simply toggle this trigger whenever we want our Map to re-render our
  //markers. specifically when a post or location is created
  const [trigger, setTrigger] = useState(true);

  //asynchronously trigger so it runs after the App renders
  setTimeout( () => {
    if (!login){
      openBanner(
        "login-banner",
        <p>Currently this page is read-only. <span className="login-button" onClick={() => {
          closeBanner("login-banner");
          login = true;
        }}>Login</span> to create posts.</p>,
        "indianred"
      );
    }
  }, 0);

  return <>
    <div className="overlay">
      <h1 id="app-title" className="overlay">bloop</h1>
      <span className="overlay-buttons">
        <OverlayButton onClick={() => {
          openModal(
            <LoadScriptNext 
              googleMapsApiKey={privateApiKey}
              libraries={["marker"]}
              mapIds={[privateMapID]}
            >
              <LocationCreateForm onSuccess={() => setTrigger(t => !t)} />
            </LoadScriptNext>
          );
        }} content={
          <p>＋</p>
        } />
        <OverlayButton onClick={() => { openModal(<AboutText />); }} content={
          <p>?</p>
        } />
      </span>
    </div>
    <div className="map-container">
      <LoadScriptNext //load the API
        googleMapsApiKey={privateApiKey}
        libraries={["marker"]} //load marker library
        mapIds={[privateMapID]}
      >
        <Map mapId={privateMapID} trigger={trigger} onPostCreateSuccess={ () => setTrigger(t => !t) } />
      </LoadScriptNext>
    </div>
  </>;
}
