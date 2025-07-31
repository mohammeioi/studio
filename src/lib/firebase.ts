// This file is no longer used for auth or firestore but is kept for potential future use with other Firebase services.
// If no other firebase services are needed, this file can be deleted.
import { initializeApp, getApps, getApp } from "firebase/app";

const firebaseConfig = {
  "projectId": "debtflow-a5qmc",
  "appId": "1:184652841956:web:391f702191ba7f49dfbdf1",
  "storageBucket": "debtflow-a5qmc.firebasestorage.app",
  "apiKey": "AIzaSyBqaN_fE9mO5yP6q1FgWduo6o-MGy6aojo",
  "authDomain": "debtflow-a5qmc.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "184652841956"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export { app };
