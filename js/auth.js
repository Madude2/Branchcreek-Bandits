// js/auth.js — unified with firebase.js for stable auth state
import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

console.log("[auth.js] ✅ Loaded — using shared Firebase instance");

window.setupAuth = function () {
  console.log("[auth.js] 🔐 setupAuth() initialized");

  // --- Helper: Update user display in navbar ---
  function updateMenu(name) {
    const loginBtn = document.getElementById("login-btn");
    const mobileLoginBtn = document.getElementById("mobile-login-btn");

    const html = `${name} <button onclick="logout()" class="ml-2 text-red-500 font-bold">Log ud</button>`;
    if (loginBtn) loginBtn.innerHTML = html;
    if (mobileLoginBtn) mobileLoginBtn.innerHTML = html;
  }

  // --- Desktop login ---
  window.login = function () {
    const email = document.getElementById("login-email")?.value?.trim();
    const password = document.getElementById("login-password")?.value;

    if (!email || !password) {
      alert("Indtast e-mail og adgangskode.");
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((cred) => {
        const user = cred.user;
        if (!user.emailVerified) {
          alert("Bekræft din e-mail før login.");
          signOut(auth);
          return;
        }

        updateMenu(user.displayName || user.email);
        document.getElementById("login-dropdown")?.classList.add("hidden");

        if (window.unlockForum) window.unlockForum();

        console.log("[auth.js] 🔁 Reloading page after login...");
        setTimeout(() => location.reload(), 500); // ⬅️ force refresh
      })
      .catch((err) => alert(err.message));
  };

  // --- Mobile login ---
  window.mobileLogin = function () {
    const email = document.getElementById("mobile-login-email")?.value?.trim();
    const password = document.getElementById("mobile-login-password")?.value;

    if (!email || !password) {
      alert("Indtast e-mail og adgangskode.");
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((cred) => {
        const user = cred.user;
        if (!user.emailVerified) {
          alert("Bekræft din e-mail før login.");
          signOut(auth);
          return;
        }

        updateMenu(user.displayName || user.email);
        document.getElementById("mobile-login-form")?.classList.add("hidden");

        if (window.unlockForum) window.unlockForum();

        console.log("[auth.js] 🔁 Reloading page after mobile login...");
        setTimeout(() => location.reload(), 500); // ⬅️ force refresh
      })
      .catch((err) => alert(err.message));
  };

  // --- Session persistence / re-login handler ---
  onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
      updateMenu(user.displayName || user.email);
      if (window.unlockForum) window.unlockForum();
    } else {
      if (window.lockForum) window.lockForum();
    }
  });

  // --- Logout ---
  window.logout = function () {
    signOut(auth)
      .then(() => {
        if (window.lockForum) window.lockForum();
        console.log("[auth.js] 🚪 Logged out — refreshing page");
        location.reload();
      })
      .catch((err) => alert(err.message));
  };
};
