import React, { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import { GoogleMap, LoadScriptNext } from "@react-google-maps/api";
import locationData from "./data/location.json"

const mapStartCoords = {lat: 34.0699, lng: -118.4438} //right now this is just ucla's coordinates

const privateApiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const privateMapID = import.meta.env.VITE_GOOGLE_MAPS_ID;

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

function getPinProps(ratings){
  let average = (ratings.cleanliness + ratings.availability + ratings.amenities) / 3 //should be between 0-5
  
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
  } else {
    backgroundColor = "#CF6C67"
    borderColor = "#8C3C38"
  }

  return {
      background: backgroundColor,
      borderColor: borderColor,
      glyphColor: borderColor, //changes middle circle OR text color
    }
}

function LocationPopUp(location) {
  //create empty div
  const div = document.createElement("div");
  div.setAttribute("class", "location-popup"); //NOT "className" because this is technically HTML not JSX

  //render JSX content inside div
  ReactDOM.createRoot(div).render(
    <>
      <h3>{location.title}</h3>
      <p>{location.lat}°, {location.lng}°</p>
      <ul className="location-popup-list">
        <li key="cleanliness">Cleanliness: {location.ratings.cleanliness}</li>
        <li key="availability">Availability: {location.ratings.availability}</li>
        <li key="amenities">Amenities: {location.ratings.amenities}</li>
      </ul>
    </>
  );

  return div;
}

function Map({ mapId }) {
  //the map takes a second to load from the API to we keep references to it
  //instead of just creating a new object for it
  const mapRef = useRef(null); //references will persist across re-renders of this component
  const [mapInstance, setMapInstance] = useState(null);

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
  async function addMarker(location, map){
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker"); //the asynchronous part comes in here

    try {
      //make the graphics
      const defaultPin = new PinElement(getPinProps(location.ratings));

      //make the actual element
      const marker = new AdvancedMarkerElement({position: {lat: location.lat, lng: location.lng}, map: map, content: defaultPin}); //add the graphics and map
      marker.zIndex = 1;
      marker.locationData = location
      marker.state = "pin"
      
      google.maps.event.addListener(marker, "click", function () {
        if (this.state == "pin"){
          this.content = LocationPopUp(this.locationData);
          this.zIndex = 2;
          this.state = "popup"

          //when a pop-up is shown, pan the map over to center on that location
          map.panTo(this.position);
        } else {
          this.content = new PinElement(getPinProps(this.locationData.ratings));
          this.zIndex = 1;
          this.state = "pin"
        }
      });

    } catch (e) {
      console.error(e);
    }
  }

  //take the generated bathroom data and add as markers
  for (const location in locationData) {
    addMarker(
      locationData[location],
      mapInstance
    );
  }


  // https://stackoverflow.com/questions/7950030/can-i-remove-just-the-popup-bubbles-of-pois-in-google-maps-api-v3
  // Here we redefine the set() method.
  // If it is called for map option, we hide the InfoWindow, if "noSuppress"  
  // option is not true. As Google Maps does not know about this option,  
  // its InfoWindows will not be opened.
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
