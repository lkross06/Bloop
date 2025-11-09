import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCY_hp8HeG_mS6cictSLU-YQa8e5LzZwWQ",
  authDomain: "bloop-dcb09.firebaseapp.com",
  projectId: "bloop-dcb09",
  storageBucket: "bloop-dcb09.firebasestorage.app",
  messagingSenderId: "276974552741",
  appId: "1:276974552741:web:38ba970c4ebdc31fb46f4c"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
//Export authentication and provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
