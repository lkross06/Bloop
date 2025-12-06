import { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

// open and close banner functions
import { openBanner, closeBanner, openLoginBanner } from "./ui/banner.jsx";

// open and close modal functions
import { openModal, closeModal } from "./ui/modal.jsx";

// rating and gender symbol
import { StarRating, GenderSymbol } from "./ui/ratingAndGender.jsx";

// small map for adding location
import { MapSmall } from "./map/MapSmall.jsx";

import { Map } from "./map/Map.jsx";

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

//TODO: REPLACE WITH SESSION DATA
// var login = false;

const privateApiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const privateMapID = import.meta.env.VITE_GOOGLE_MAPS_ID;

//how many seconds to wait before pinging again for new location
const geolocationPingTimeout = 15;

const DB = new DBHandler();

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

  // Debug: log when isLoggedIn changes
  useEffect(() => {
    console.log('LocationCreateForm - isLoggedIn:', isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => {
    console.log('LocationCreateForm - Checking enableSubmit:', { name, gender, location, isLoggedIn });
    
    if (name == "" || gender == "" || location == null || !isLoggedIn) {
      setEnableSubmit(false);
      return;
    }
    
    setEnableSubmit(true);
  }, [name, gender, location, isLoggedIn]);

  const handleSubmit = async (e) => {
    e.preventDefault(); //do not reload the page

    const latitude = parseFloat(location.lat.toFixed(4)); //+-0.0001° is close enough
    const longitude = parseFloat(location.lng.toFixed(4));

    let locationID = await DB.createLocation(name, gender, latitude, longitude);

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
function AccountPage({accountID}){
  //placeholder information
  const [account, setAccount] = useState({
    accountID: 0,
    username: "--",
    password: "--",
    posts: []
  });

  const [posts, setPosts] = useState([])

  useEffect(() => {
    (async () => {
      const a = await DB.getAccount(accountID);
      if (a != null) setAccount(a);
    })();
  }, [accountID]);

  useEffect(() => {
    (async () => {
      const ps = [];

      if (!Array.isArray(account.posts)) return;

    //try to load all posts
      for (const postID of account.posts){
        var p = await DB.getPost(postID);
        if (p != null){
          //try to load location info to get location name of that post
          const rating = Math.floor((p.cleanliness + p.availability + p.amenities) / 3);
          const l = await DB.getLocation(p.locationID);
          if (l != null){
            p.locationTitle = l.title;
            p.rating = rating;
            ps.push(p);
          }
        }
      }
      setPosts(ps);
    })();
  }, [account]);

  return <>
    <div className="account-page">
      <div className="account-page-header">
        <h2>{account.displayName}</h2>
        <h3>{posts.length} posts</h3>
      </div>

      <div className="account-page-list">
        {
          posts.map((post, index) => (
            <div className="account-page-item" key={index}>
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

  const openLoginModal = () => {
    closeBanner("login-banner"); //closes the banner
    setIsLoginOpen(true); //show the popup
  }


  // Add this useEffect to track when isLoggedIn changes
  useEffect(() => {
    console.log('isLoggedIn changed:', isLoggedIn, 'user:', user);
    if (isLoggedIn) {
      console.log('✅ User is now authenticated! isLoggedIn = true.');
    } else {
      console.log('❌ User is not authenticated. isLoggedIn = false.');
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    DB.setUser(user);
  }, [user]);

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

      //call after Logout successful closes
      setTimeout(() => {
        openLoginBanner(openLoginModal);
      }, 5000);
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
      openLoginBanner(openLoginModal);
    } else if (!loading && isLoggedIn) {
      // Close the banner when user logs in
      closeBanner("login-banner", true);
    }
  }, [loading, isLoggedIn]);

  /**
   * asynchronously pings the device's GPS module with Navigator API, sets deviceLocation in <App/> React state
   * @returns true if Navigator API is available, false otherwise
   */
  function pingLocation() {
    if (!navigator.geolocation) return false;

    /**
     * DESIGN DECISION
     * https://stackoverflow.com/questions/46573591/watchposition-vs-getcurrentposition-in-geolocation
     * Using getCurrentPosition instead of watchPosition because device location is not a core feature,
     * and watchPosition consume much more battery staying constantly active than sending an asynchronous
     * ping every n seconds.
     */
    const onSuccess = (position) => {
      setDeviceLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      })
    };

    const onFailure = (err) => {};

    const settings = {
      enableHighAccuracy: true,
      timeout: 5000 //ms, try to poll API for 5s at a time
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onFailure, settings);

    //ping GPS module again after timeout
    setTimeout(pingLocation, geolocationPingTimeout * 1000);

    return true;
  };

  //TRY TO FIND THEIR LOCATION AS QUICKLY AS POSSIBLE WHEN THE USER FIRST INTERACTS WITH THE PAGE
  useEffect(() => {
    pingLocation();
  }, []);

  /**
   * Hides all default location pop-ups in Google Maps
   * https://stackoverflow.com/questions/7950030/can-i-remove-just-the-popup-bubbles-of-pois-in-google-maps-api-v3
   */
  useEffect(() => {
  function hideInfoWindow() {
    if (!window.google || !google.maps || !google.maps.InfoWindow) {
      setTimeout(hideInfoWindow, 10); //try 10ms later until Google API loads
      return;
    }

    var set = google.maps.InfoWindow.prototype.set;

    google.maps.InfoWindow.prototype.set = function (key, val) {
      if (key === 'map' && ! this.get('noSuppress')) return;
      
      set.apply(this, arguments); //disable pop-ups whenever you select a known POI
    };
  }

  hideInfoWindow();
  }, []);

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
      onClose={() => {
        setIsLoginOpen(false);
        openLoginBanner(openLoginModal);
      }}
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
            openModal(<AccountPage accountID={user?.uid} />);
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
        <Map mapId={privateMapID} trigger={trigger} setTrigger={setTrigger} deviceLocation={deviceLocation} isLoggedIn={isLoggedIn} user={user} DB={DB} />
      </LoadScriptNext>
    </div>
  </>;
}
