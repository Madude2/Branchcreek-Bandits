// js/firebase.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzk3xKdC0p9logWjGIZX41M1oeIeqjxGI",
  authDomain: "branchcreek-bandits.firebaseapp.com",
  projectId: "branchcreek-bandits",
  storageBucket: "branchcreek-bandits.appspot.com", // ✅ korrekt domæne
  messagingSenderId: "828305260971",
  appId: "1:828305260971:web:6c3601fc97601a9621d2ee",
  measurementId: "G-550TRD5SQ3"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Initialize Firestore with *no local cache*
// This ensures Firestore always fetches the latest data from the server
// and avoids showing outdated user roles when switching accounts.
const db = initializeFirestore(app, {
  localCache: false
});

// Initialize Auth
const auth = getAuth(app);

console.log("[firebase.js] ✅ Firebase initialized (cache disabled for fresh reads)");

export { app, db, auth };
