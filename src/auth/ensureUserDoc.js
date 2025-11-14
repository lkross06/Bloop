//Make sure each logged-in user has a Firestore doc in the users collection
/* 
- Make sure each logged-in user has a firestore doc in the users collection
- Takes a Firebase user object as parameter
- Checks if a user document exists in Firestore `users` collection
- Creates a new user document with user info (uid, email, displayName, photoURL) if it doesn't exist
*/

//Import FireStore functions and the database instance
import { doc, setDoc, getDoc } from "firebase/firestore"; 
import { db } from "../firebase.js";

export async function ensureUserDoc(user){
    //Validate that we have a user with a user id (uid)
    if(!user || !user.uid){
        throw new Error("User object with uid required");
    }

    //Create ref to user's document in Firestore
    //Collection: "users", Document ID: user.uid
    const userRef = doc(db, "users", user.uid);

    //Check if document exists
    const userDoc = await getDoc(userRef);

    //If document doesn't exist, create it with user info
    if (!userDoc.exists()){
        console.log("No such user/document exists! Creating new user doc.");

        //Add new doc in collection "users"
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email || null,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            createdAt: new Date().toISOString(),
        });
    }
    else{
        console.log("User document already exists:", userDoc.data());
    }
}
