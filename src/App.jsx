import React from "react";
import ReactDOM from "react-dom/client";
import { useState, useEffect } from 'react';

import { GoogleMap, LoadScript } from '@react-google-maps/api';

// get the api key from the environment configuration .env file.
// .env should look like: VITE_GOOGLE_MAPS_KEY=____
const privateApiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;

//similarly we also get a mapID to uniquely identify every map we use on the free account
const privateMapID = import.meta.env.VITE_GOOGLE_MAPS_ID; //not sure if we should share this..? probably better not to..

const containerStyle = {
  width: '100%',
  height: '400px',
};

const center = {
  lat: 34.0699, //UCLA's coordinates for now
  lng: -118.4438,
};

function Map({ privateKey, privateID }) {
  const handleLoad = (map) => {
    // Wait for google.maps.marker to exist
    while (!google.maps.marker);

    const { AdvancedMarkerElement } = google.maps.marker;

    // Create the marker
    // new AdvancedMarkerElement({
    //   map,
    //   position: center,
    //   title: 'San Francisco',
    // });
  };

  return (
    <LoadScript googleMapsApiKey={privateKey} libraries={['marker']} version="beta">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        onLoad={handleLoad}
        mapId={privateID}
      />
    </LoadScript>
  );
}

export default function App() {
  return (
    <>
      <Map privateKey={privateApiKey} privateID={privateMapID} />
    </>
  );
}
