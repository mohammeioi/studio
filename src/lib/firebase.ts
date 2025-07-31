
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
const db = getFirestore(app);
const auth = getAuth(app);

// Enable offline persistence
try {
    enableIndexedDbPersistence(db)
      .then(() => console.log("Firebase Offline persistence enabled"))
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          console.warn("Multiple tabs open, offline persistence will only be enabled in one tab.");
        } else if (err.code == 'unimplemented') {
          console.warn("The current browser does not support all of the features required to enable persistence.");
        }
      });
} catch (error) {
    console.error("Error enabling offline persistence: ", error);
}

export { app, db, auth };
