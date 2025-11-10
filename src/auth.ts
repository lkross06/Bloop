// importing auth from firebase authentication and helper functions 
// from Firebase's SDK that perform the main authentication actions 
import { auth } from "./firebase.js";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
} from "firebase/auth";

// creates google provider object and allows user to sign in with a google account
const google = new GoogleAuthProvider();
google.setCustomParameters({prompt: "select_account"});

// opens google login popup, if signed in successfully Firebase returns user object,
// Firebase also automatically stores a login session in browser so user stays logged in until they logout
export async function loginWithGoogle(){
    return signInWithPopup(auth,google);
}

// signs in an existing user
export async function loginWithEmail(email: string, password: string){
    return signInWithEmailAndPassword(auth, email, password);
}

// creates a new account with their email and password
export async function registerWithEmail(email: string, password: string){
    return createUserWithEmailAndPassword(auth, email, password);
}

// logs the currents user out of their account ending the session
export async function logout(){
    return signOut(auth);
}

// keeps track of user state on the website, and uses callback everytime user logs in or logs out 
export async function watchUser(callback){
    return onAuthStateChanged(auth,callback);
}