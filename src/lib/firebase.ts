// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

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

// Initialize Firestore with offline persistence
// This setup avoids re-initialization errors in Next.js environments
let db: any; // Use 'any' to avoid type conflicts on reassignment

try {
  db = getFirestore(app);
} catch (e) {
  db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  });
}

enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a time.
      console.warn("Firestore offline persistence failed: multiple tabs open.");
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence
      console.warn("Firestore offline persistence is not supported in this browser.");
    }
  });


export { app, auth, db };
