// js/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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

window.setupAuth = function() {
  function updateMenu(name) {
    const loginBtn = document.getElementById("login-btn");
    const mobileLoginBtn = document.getElementById("mobile-login-btn");
    if(loginBtn) loginBtn.innerHTML = `${name} <button onclick="logout()" class="ml-2 text-red-500 font-bold">Log ud</button>`;
    if(mobileLoginBtn) mobileLoginBtn.innerHTML = `${name} <button onclick="logout()" class="ml-2 text-red-500 font-bold">Log ud</button>`;
  }

  // Desktop login
  window.login = function() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    signInWithEmailAndPassword(auth,email,password)
      .then(userCredential => {
        if(!userCredential.user.emailVerified){
          alert("Du skal bekræfte din e-mail, før du kan logge ind.");
          signOut(auth);
          return;
        }
        updateMenu(userCredential.user.displayName || userCredential.user.email);
        document.getElementById("login-dropdown").classList.add("hidden");
        if(window.unlockForum) unlockForum(); // optional for forum page
      })
      .catch(err => alert(err.message));
  }

  // Mobile login
  window.mobileLogin = function() {
    const email = document.getElementById("mobile-login-email").value;
    const password = document.getElementById("mobile-login-password").value;

    signInWithEmailAndPassword(auth,email,password)
      .then(userCredential => {
        if(!userCredential.user.emailVerified){
          alert("Du skal bekræfte din e-mail, før du kan logge ind.");
          signOut(auth);
          return;
        }
        updateMenu(userCredential.user.displayName || userCredential.user.email);
        document.getElementById("mobile-login-form").classList.add("hidden");
        if(window.unlockForum) unlockForum();
      })
      .catch(err => alert(err.message));
  }

  // Persistent login
  onAuthStateChanged(auth,user=>{
    if(user && user.emailVerified) {
      updateMenu(user.displayName || user.email);
      if(window.unlockForum) unlockForum();
    }
  });

  // Logout
  window.logout = function() {
    signOut(auth).then(()=>{
      if(window.unlockForum) document.getElementById("forum-content").style.display="none";
      if(window.unlockForum) document.getElementById("login-warning").style.display="block";
      location.reload();
    }).catch(err => alert(err.message));
  }
}
