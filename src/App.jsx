import { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import { sha256 } from 'js-sha256';

import { GoogleMap, LoadScriptNext } from "@react-google-maps/api";
import * as DB from "./DBHandler"

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
  width: "100%",
  height: "800px",
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

  //ping the database for post information given a postID
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
  } else if (average >= 0){
    backgroundColor = "#CF6C67"
    borderColor = "#8C3C38"
  }

  return {
      background: backgroundColor,
      borderColor: borderColor,
      glyphColor: borderColor, //changes middle circle OR text color
    }
}

/**
 * Generate the HTML DOM for a location pop-up
 * @param {JSON} location Location to render a pop-up for
 * @returns HTMLDivElement that can be rendered straight onto the Google Maps
 */
function LocationPopUp(location) {
  //create empty div
  const div = document.createElement("div");
  div.setAttribute("class", "location-popup"); //NOT "className" because this is technically HTML not JSX

  //render JSX content inside div
  ReactDOM.createRoot(div).render(
    <>
      <h3>{location.title}</h3>
      <ul className="location-popup-list">
        {/* <li key="cleanliness">Cleanliness: {location.posts[0].cleanliness}</li>
        <li key="availability">Availability: {location.ratings.availability}</li>
        <li key="amenities">Amenities: {location.ratings.amenities}</li> */}
      </ul>
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
      console.log(sha256(String(Date.now())));
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
      try {
          marker.content = LocationPopUp(marker.locationData);
          marker.zIndex = 2;
          marker.state = "popup"

          //when a pop-up is shown, pan the map over to center on that location
          mapInstance.panTo(marker.position);

          return true
      } catch {
        return false
      }
    }

    /**
     * Closes the currently-open location pop-up for a marker representing a location
     * @param {AdvancedMarkerElement} marker JS object rendered on Google Maps map
     * @returns true if successful, false otherwise
     */
    function closeMarkerPopup(marker){
      try{
        marker.content = new PinElement(getPinProps(marker.postData));
        marker.zIndex = 1;
        marker.state = "pin";

        return true;
      } catch {
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

      marker.zIndex = 1;
      marker.locationData = location;
      marker.postData = posts;
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
 * React App component for containing all React components in our application
 * @returns React component main container
 */
export default function App() {
  return <>
    <LoadScriptNext //load the API
      googleMapsApiKey={privateApiKey}
      libraries={["marker"]} //load marker library
      mapIds={[privateMapID]}
    >
      <Map mapId={privateMapID} />
    </LoadScriptNext>
  </>;
}
