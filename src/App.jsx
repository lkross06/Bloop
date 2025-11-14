import { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import { GoogleMap, LoadScriptNext } from "@react-google-maps/api";
import DBHandler from "./DBHandler"

const DB = new DBHandler();

//TODO: REPLACE WITH SESSION DATA
const login = true;
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

const containerStyle = {
  width: "100%", //fill entire map-container div
  height: "100%",
};

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

  return <>
    {/* Use CSS classes to color the different stars */}
    <span className="full-stars">{star.repeat(nFull)}</span>
    <span className="empty-stars">{star.repeat(nEmpty)}</span>
  </>
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
 * @returns HTMLDivElement that can be rendered straight onto the Google Maps
 */
function LocationPopUp(location, posts) {
  function createPostModal(){
    //open a post-create form with this modal
    openModal(
      <PostCreateForm location={location} />
    );
  }

  let sum = 0;
  let total = 0;

  //count the number of posts with a rating 0, rating 1, etc. we will round DOWN for our purposes
  //the ith value is the number of posts with a rating i, where 0 <= i <= 5
  let postRatings = [0, 0, 0, 0, 0, 0];

  for (const post of posts){
    let postSum = post.cleanliness + post.availability + post.amenities; //sum all ratings in one post
    
    postRatings[Math.round(postSum / 3)] += 1; //get the post average rating

    sum += postSum;
    total += 3;
  }

  let locationRating = 0;
  if (total != 0) locationRating = (sum / total).toFixed(1); //get the rating by taking average, round to 1 decimal pt for formatting

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
        <p>Reviews</p>
        <ul className="location-popup-list">
          {
            //map each rating (0-5) to the number of posts with that rating
            postRatings.map((numPosts, rating) => (
              <li key={rating}><StarRating rating={rating} /><span className="location-popup-reviews-num-posts">{numPosts}</span></li>
            ))
          }
        </ul>
      </span>

      <span className="location-popup-attributes">
        <h4>{(total != 0)? locationRating : "--"}</h4>
        <h4><StarRating rating={locationRating} /></h4>

        {/* notice that we divide total by 3 because each batch of cleanliness/availability/amenities constitutes 1 post */}
        <p>{total / 3} {(total / 3 == 1)? "review" : "reviews"}</p>
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
 * React Map component for rendering Google Maps interactable map, along with all things rendered in it 
 * @param {JSON} props Takes { mapID }, private map ID
 * @returns React component rendering interactable map and all interactble elements in it
 */
function Map({ mapId }) {
  //the map takes a second to load from the API to we keep references to it
  //instead of just creating a new object for it
  const mapRef = useRef(null); //references will persist across re-renders of this component
  const [mapInstance, setMapInstance] = useState(null);

  //currently selected marker with a pop-up
  let activeMarker = null;

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

          marker.content = LocationPopUp(locationData, postData);
          marker.zIndex = 2;
          marker.state = "popup"

          //when a pop-up is shown, pan the map over to center on that location
          //and offset by 0.002° N so that the large location pop-up is centered
          mapInstance.panTo({lat: marker.position.lat + 0.002, lng: marker.position.lng});

          return true
      } catch (e) {
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

  //take the generated bathroom data and add as markers
  for (const location of DB.getLocationsAll()) {
    addMarker(location);
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
 * @param {JSON} props contains { location }, location to make post for
 * @returns React component
 */
function PostCreateForm( { location }){
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
    <form onSubmit={handleSubmit} className="post-create-form">
      <span className="modal-header">
        <h3>{location.title}</h3>
        <h4 className="modal-subheader">{location.lat}° N, {-1 * location.lng}° W | <GenderSymbol gender={location.gender} /></h4>
      </span>

      <div className="post-create-form-group">
        <label htmlFor="cleanliness" className="post-create-form-label">Cleanliness <span className="required-asterisk">*</span></label>
        <input
          type="range"
          id="cleanliness"
          className={"form-slider score-" + Math.round(cleanliness)}
          min="0"
          max="5"
          value={cleanliness}
          onChange={(e) => setCleanliness(Number(e.target.value))}
          required
        />
        <span className="slider-value">{Math.round(cleanliness)}</span>
      </div>

      <div className="post-create-form-group">
        <label htmlFor="availability" className="post-create-form-label">Availability <span className="required-asterisk">*</span></label>
        <input
          type="range"
          id="availability"
          className={"form-slider score-" + Math.round(availability)}
          min="0"
          max="5"
          value={availability}
          onChange={(e) => setAvailability(Number(e.target.value))}
          required
        />
        <span className="slider-value">{Math.round(availability)}</span>
      </div>

      <div className="post-create-form-group">
        <label htmlFor="amenities" className="post-create-form-label">Amenities <span className="required-asterisk">*</span></label>
        <input
          type="range"
          id="amenities"
          className={"form-slider score-" + Math.round(amenities)}
          min="0"
          max="5"
          value={amenities}
          onChange={(e) => setAmenities(Number(e.target.value))}
          required
        />
        <span className="slider-value">{Math.round(amenities)}</span>
      </div>

      <div className="post-create-form-group">
        <label htmlFor="notes" className="post-create-form-label">Notes</label>
        <textarea
          id="notes"
          className="post-create-form-textarea"
          maxLength={maxNotesLength}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Flush your thoughts"
        />
        <span className="slider-value">{notes.length} / {maxNotesLength}</span>
      </div>

      <button type="submit" className="post-create-form-submit">Create Post</button>
    </form>
  );
}

function OverlayButton( { onClick, content } ){ 
  return <button className = "overlay-button" onClick={onClick}>{content}</button>
}

/**
 * React App component for containing all React components in our application
 * @returns React component main container
 */
export default function App() {

    //asynchronously trigger so it runs after the App renders
    setTimeout( () => {
      if (!login){
        openBanner(
          "login-banner",
          <p>Currently this page is read-only. <span className="login-button" onClick={() => { console.log("HII") }}>Login</span> to create posts.</p>,
          "indianred"
        );
      }
    }, 0);

  return <>
    <div className="overlay">
      <h1 id="app-title" className="overlay">bloop</h1>
      <span className="overlay-buttons">
        <OverlayButton onClick={() => {console.log("test"); }} content={
          <p>＋</p>
        } />
        <OverlayButton onClick={() => {console.log("test"); }} content={
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
        <Map mapId={privateMapID} />
      </LoadScriptNext>
    </div>
  </>;
}
