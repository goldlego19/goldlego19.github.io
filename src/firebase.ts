import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // Import Google Auth

// REPLACE THIS with your actual keys from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCjumem0l4tbKHuQm6rUOYuNoKnN31Yrp4",
  authDomain: "homedashboard-ba538.firebaseapp.com",
  projectId: "homedashboard-ba538",
  storageBucket: "homedashboard-ba538.firebasestorage.app",
  messagingSenderId: "809387869235",
  appId: "1:809387869235:web:a45da53f8ddeccba6b4f46",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // Export auth directly
export const googleProvider = new GoogleAuthProvider();
