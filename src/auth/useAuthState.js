//Authentication listener- how to know if someone is logged in or out
/* importing auth from firebase authentication and helper functions 
 from Firebase's SDK that perform the main authentication actions */
 import { useState, useEffect } from 'react';
 import { auth } from '../firebase.js';
 import { onAuthStateChanged } from 'firebase/auth';
 
 export function useAuthState() {
   // Start with loading=true and user=null (before Firebase responds)
   const [user, setUser] = useState(null);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     // Subscribe to Firebase auth state changes
     const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
       // When Firebase responds, update state
       setUser(firebaseUser);        // Set the user (or null if logged out)
       setLoading(false);            // We're done loading
     });
 
     // Cleanup: unsubscribe when component unmounts
     return () => {
       unsubscribe();
     };
   }, []); // Empty array = only run once when component mounts
 
   // Return the current auth state
   return { user, loading };
 }