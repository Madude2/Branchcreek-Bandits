// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// ✅ Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCzk3xKdC0p9logWjGIZX41M1oeIeqjxGI",
  authDomain: "branchcreek-bandits.firebaseapp.com",
  projectId: "branchcreek-bandits",
  storageBucket: "branchcreek-bandits.appspot.com",
  messagingSenderId: "828305260971",
  appId: "1:828305260971:web:6c3601fc97601a9621d2ee",
  measurementId: "G-550TRD5SQ3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ---------- Functions ---------- //

// Login
window.login = function(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
    .catch(err => alert(err.message));
}

// Signup
window.signup = function(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
    .catch(err => alert(err.message));
}

// Logout
window.logout = function() {
  return signOut(auth).catch(err => alert(err.message));
}

// Update nav buttons (desktop & mobile)
function updateNav(user) {
  const loginBtn = document.getElementById("login-btn");
  const mobileLoginBtn = document.getElementById("mobile-login-btn");

  if (user) {
    const name = user.displayName || user.email;
    if (loginBtn) {
      loginBtn.innerHTML = `${name} <button onclick="logout()" class="ml-2 text-red-500 font-bold">Log ud</button>`;
    }
    if (mobileLoginBtn) {
      mobileLoginBtn.innerHTML = `${name} <button onclick="logout()" class="ml-2 text-red-500 font-bold">Log ud</button>`;
    }
  } else {
    if (loginBtn) loginBtn.innerHTML = `<span>Login</span>`;
    if (mobileLoginBtn) mobileLoginBtn.innerHTML = `<span>Login</span>`;
  }
}

// Listen for login state changes (fires on every page load)
onAuthStateChanged(auth, user => {
  updateNav(user);
});

// Helper for other pages (forum etc.)
window.onUserStateChanged = function(callback) {
  onAuthStateChanged(auth, callback);
}

// Expose auth for optional direct use
window.auth = auth;
