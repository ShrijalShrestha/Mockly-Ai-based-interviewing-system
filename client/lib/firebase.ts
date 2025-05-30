import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

if(!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  throw new Error("Missing Firebase API key in .env.local");
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "mockly-7e061.firebaseapp.com",
  projectId: "mockly-7e061",
  storageBucket: "mockly-7e061.firebasestorage.app",
  messagingSenderId: "905060319455",
  appId: "1:905060319455:web:5dacc87c68bd0b54ea696a",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)
export default app

