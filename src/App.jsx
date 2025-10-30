import React, { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import { GoogleMap, LoadScriptNext } from "@react-google-maps/api";

const privateApiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const privateMapID = import.meta.env.VITE_GOOGLE_MAPS_ID;

/**
 * zoom = 0   whole world
 * zoom = 10  city-wide
 * zoom = 15  neighborhood
 * zoom = 20  streets
 */
const minimumZoom = 11; //how far you can zoom out (1 = world view, 18 = street views)
const maximumZoom = 17; //how far you can zoom in
const defaultZoom = 12;

const containerStyle = {
  width: "100%",
  height: "800px",
};

//we can put POIs (points of interest) here
const coords = {
  losAngeles: {
    lat: 34.0549,
    lng: -118.2426 //NOTE: west = negative (left of 0 degrees)
  },
  ucla: {
    lat: 34.0699,
    lng: -118.4438
  },
  usc: {
    lat: 34.0224,
    lng: -118.2851
  }
};

function OpenPopUp(){

}

function Button({handleClick, text}){
  return <button onClick={handleClick}>{text}</button>
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
  async function addMarker(uniqueID, map, pinProperties, markerProperties, handleClick){
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker"); //the asynchronous part comes in here

    try {
      //make the graphics
      const pin = new PinElement(pinProperties);

      //make the actual element
      const marker = new AdvancedMarkerElement({...markerProperties, map: map, content: pin}); //add the graphics and map

      marker.addListener("click", handleClick);

    } catch (e) {
      console.error(e);
    }
  }

  addMarker(
    "UCLA",
    mapInstance, 
    {
    background: "dodgerblue",
    borderColor: "blue",
    glyphColor: "blue", //changes middle circle OR text color
    glyphText: "UCLA"
    },
    {
      position: coords.ucla
    },
    () => { console.log("test"); }
  );

  addMarker(
    "USC",
    mapInstance, 
    {
    background: "red",
    borderColor: "darkred",
    glyphColor: "darkred",
    glyphText: "USC"
    },
    {
      position: coords.usc
    },
    () => { console.log("test"); }
  );

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
      center={coords.losAngeles}
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
  return (
    <LoadScriptNext //load the API
      googleMapsApiKey={privateApiKey}
      libraries={["marker"]} //load marker library
      mapIds={[privateMapID]}
    >
      <Map mapId={privateMapID} />
    </LoadScriptNext>
  );
}
