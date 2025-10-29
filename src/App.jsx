import React, { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import { GoogleMap, LoadScriptNext } from "@react-google-maps/api";

const privateApiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const privateMapID = import.meta.env.VITE_GOOGLE_MAPS_ID;

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
    (async () => {
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

      //make the graphics
      const uclaPin = new PinElement({
        background: "dodgerblue",
        borderColor: "blue",
        glyphColor: "blue", //changes middle circle OR text color
        glyphText: "UCLA"
      });
      const uscPin = new PinElement({
        background: "red",
        borderColor: "darkred",
        glyphColor: "darkred",
        glyphText: "USC"
      });

      //add to the map
      new AdvancedMarkerElement({
        map: mapInstance, //connect to map
        position: coords.ucla,
        content: uclaPin //connect to graphics
      });

      new AdvancedMarkerElement({
        map: mapInstance,
        position: coords.usc,
        content: uscPin
      });

    })();
  }, [mapInstance]); //list our map as a dependency that the API can read/write

  const onLoad = (map) => {
    mapRef.current = map;
    setMapInstance(map);
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={coords.losAngeles}
      zoom={11} //let's show all of LA for now
      onLoad={onLoad}
      options={{ mapId }}
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
