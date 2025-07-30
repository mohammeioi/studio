// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
