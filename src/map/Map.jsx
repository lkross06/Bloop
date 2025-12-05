import ReactDOM from "react-dom/client";
import { useRef, useEffect, useState } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { openModal, closeModal } from "../ui/modal.jsx";
import { openBanner, closeBanner } from "../ui/banner.jsx";
import { StarRating, GenderSymbol } from "../ui/ratingAndGender.jsx";


/**
 * zoom = 0   whole world
 * zoom = 10  city-wide
 * zoom = 15  neighborhood
 * zoom = 20  streets
 */

const mapStartCoords = {lat: 34.0699, lng: -118.4438}

const minimumZoom = 11.5; //how far you can zoom out
const maximumZoom = 19; //how far you can zoom in
const defaultZoom = 15.5;

const containerStyle = {
    width: "100%", //fill entire map-container div
    height: "100%",
  };



/**
 * React component form for creating a new Post
 * @param {JSON} props { location, onSuccess }, location = location to make post for, onSuccess = callback function to re-render map with new post data
 * @returns form React component
 */
function PostCreateForm({ location, onSuccess, accountID, DB }){
  console.log('PostCreateForm received accountID:', accountID);
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

    (async () => {
      const post = await DB.getPostByAccountAndLocation(accountID, location.locationID);

      if (post != null) {
        existingPostID.current = post.postID;
        setCleanliness(post.cleanliness);
        setAvailability(post.availability);
        setAmenities(post.amenities);
        setNotes(post.notes);
        setSubmitText("Update Post");
      }
    })();
  }, [location, accountID]);

  const handleSubmit = async (e) => {
    e.preventDefault(); //do not reload the pag
    console.log('Submitting post for accountID:', accountID); //Debug

    let timestamp = Date.now();
    
    try {
      const postID = await DB.createPost (
        location.locationID,
        accountID,
        Math.round(cleanliness),
        Math.round(availability),
        Math.round(amenities),
        notes,
        timestamp
      );

      console.log('Post created with postID:', postID); //Debug

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
  } catch (e) {
    console.error('Error submitting post:', e);
    openBanner(
      "error-banner",
      <p>Failed to submit post</p>,
      "indianred",
      5000
    );
  }
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
   * Generates (not renders) HTML element for a location pop-up
   * @param {JSON} location location to render a pop-up for
   * @param {JSON[]} posts list of Posts about this Location
   * @param {Function} onSuccess callback function to trigger Map to re-render
   * @returns HTMLDivElement that can be rendered straight onto the Google Maps
   */
  function LocationPopUp(location, posts, onSuccess, isLoggedIn, accountID, DB) {
    function createPostModal(){
      //open a create form with this modal
      openModal(
        <PostCreateForm location={location} onSuccess={onSuccess} accountID={accountID} DB={DB} />
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
    div.setAttribute("class", "location-popup"); //NOT "className" because this is HTML not JSX/
  
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
 * React component to render the main Google Map with location pins, current device location pin, and location pop-ups onClick
 * @param {JSON} props { mapId, trigger, setTrigger, deviceLocation }, mapId = private Map ID, trigger = trigger variable to watch --> re-render marker, setTrigger = callback function that takes locationID and updates marker with that location, deviecLocation = {lat, lng} corresponding to most recent device's location
 * @returns interactable Google Maps React component
 */
export function Map({ mapId, trigger, setTrigger, deviceLocation, isLoggedIn, user, DB}) {
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
      (async () => {
        const locations = await DB.getLocationsAll();
        for (const location of locations) {
          addMarker(location);
        }
      })();
    }, [mapInstance, isLoggedIn]);
  
    //when the trigger tells us to update one of the location markers
    useEffect(() => {
      if (mapInstance == null || trigger == null) return;
  
      console.log(trigger);
  
      /* HERE WE EXPECT TRIGGER = LOCATION ID TO UPDATE */
  
      (async () => {
        if (markersDict.current[trigger] != null){
          markersDict.current[trigger].setMap(null);
          delete markersDict.current[trigger];
        }
  
        const location = await DB.getLocation(trigger);
        if (location != null) await addMarker(location);
  
      /**
       * We must set back to null and re-trigger this callback (which returns immediately) here
       * because, if we set trigger again and the same location needs to be updated again,
       * useEffect() will not trigger because previous value == current value. This may happen
       * if we create a new location and immediately post about it (which very well might happen with
       * our users!). null ensures previous value != current value
       */
        setTrigger(null);
      })();
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
      async function handleMarkerClick(marker){
        if (marker.state == "pin"){
          //show the location pop-up
          await closeMarkerPopup(activeMarker.current);
          await openMarkerPopup(marker);
          activeMarker.current = marker;
        } else {
          //close the location pop-up
          await closeMarkerPopup(marker);
          activeMarker.current = null;
        }
      }
  
      /**
       * Render the location pop-up for a marker representing a location
       * @param {AdvancedMarkerElement} marker JS object rendered on Google Maps map
       * @returns true if successful, false otherwise
       */
      async function openMarkerPopup(marker){
        if (marker == null) return false;
  
        try {
            const locationData = await DB.getLocation(marker.locationID);
            const postData = await DB.getPostsForLocation(marker.locationID);
  
            marker.content = LocationPopUp(
              locationData, 
              postData, 
              (locationID) => {
              //on successful post creation, trigger a re-render
                setTrigger(locationID);
                mapInstance.panTo({lat: marker.position.lat + 0.003, lng: marker.position.lng})
            }, isLoggedIn, user?.uid, DB); //pass in isLoggedIn and accountID to the LocationPopUp function
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
      async function closeMarkerPopup(marker){
        if (marker == null) return false;
  
        try {
          var postData = await DB.getPostsForLocation(marker.locationID);
  
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
        const posts = await DB.getPostsForLocation(location.locationID);
  
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