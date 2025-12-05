import { useRef, useEffect, useState } from "react";
import { GoogleMap } from "@react-google-maps/api";

const mapStartCoords = {lat: 34.0699, lng: -118.4438}

const minimumZoomSmall = 11.5;
const maximumZoomSmall = 16.9; //at 17, more labels are shown that would overcrowd the space
const defaultZoomSmall = 14;

const containerStyleSmall = {
    width: "100%",
    height: "15rem"
  }

/**
 * React component to render a small Google Map for placing/updating one location pin
 * @param {JSON} props contains {mapId, updateParentLocation}, mapId = private Map ID for styling, updateParentLocation = callback function whenever location pin is updated
 * @returns interactable Google Maps React component
 */
export function MapSmall({ mapId, updateParentLocation }) {
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
  