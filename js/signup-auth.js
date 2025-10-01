// js/signup-auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzk3xKdC0p9logWjGIZX41M1oeIeqjxGI",
  authDomain: "branchcreek-bandits.firebaseapp.com",
  projectId: "branchcreek-bandits",
  storageBucket: "branchcreek-bandits.firebasestorage.app",
  messagingSenderId: "828305260971",
  appId: "1:828305260971:web:6c3601fc97601a9621d2ee",
  measurementId: "G-550TRD5SQ3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.signup = function() {
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  if(!name || !email || !password) {
    alert("Udfyld alle felter.");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      // Set display name
      return updateProfile(userCredential.user, { displayName: name })
        .then(() => userCredential.user);
    })
    .then(user => {
      // Send email verification
      return sendEmailVerification(user)
        .then(() => {
          document.getElementById("signup-form").classList.add("hidden");
          document.getElementById("signup-success").classList.remove("hidden");
        });
    })
    .catch(err => alert(err.message));
};

// Optional: prevent login if email not verified (you can add this in auth.js login flow)
