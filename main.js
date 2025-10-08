/* main.js — shared across all pages */

// ✅ Firebase Imports
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCzk3xKdC0p9logWjGIZX41M1oeIeqjxGI",
  authDomain: "branchcreek-bandits.firebaseapp.com",
  projectId: "branchcreek-bandits",
  storageBucket: "branchcreek-bandits.firebasestorage.app",
  messagingSenderId: "828305260971",
  appId: "1:828305260971:web:6c3601fc97601a9621d2ee",
  measurementId: "G-550TRD5SQ3"
};

// ✅ Initialize Firebase once
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ========== INCLUDE NAV & FOOTER ========== */
async function includeHTML(file, elementId, callback) {
  const res = await fetch(file);
  const html = await res.text();
  document.getElementById(elementId).innerHTML = html;
  if (window.feather) feather.replace();
  if (callback) callback();
}

/* ========== LOAD NAVBAR ========== */
includeHTML("nav.html", "navbar", async () => {
  attachNavbarEvents();
  setupAuth();
  await loadNotificationsDropdown();
});

/* ========== LOAD FOOTER ========== */
includeHTML("footer.html", "footer");

/* ========== AUTH ========== */
function setupAuth() {
  const loginBtn = document.getElementById("login-btn");
  const loginDropdown = document.getElementById("login-dropdown");
  const mobileLoginBtn = document.getElementById("mobile-login-btn");
  const mobileLoginForm = document.getElementById("mobile-login-form");

  if (loginBtn && loginDropdown) {
    loginBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      loginDropdown.classList.toggle("hidden");
    });
  }
  if (mobileLoginBtn && mobileLoginForm) {
    mobileLoginBtn.addEventListener("click", () => mobileLoginForm.classList.toggle("hidden"));
  }

  document.addEventListener("click", (e) => {
    if (loginDropdown && !loginDropdown.contains(e.target) && !loginBtn.contains(e.target)) {
      loginDropdown.classList.add("hidden");
    }
  });

  window.login = async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    try {
      const user = await signInWithEmailAndPassword(auth, email, password);
      updateLoginUI(user.user);
      loginDropdown.classList.add("hidden");
    } catch (err) {
      alert(err.message);
    }
  };

  window.mobileLogin = async () => {
    const email = document.getElementById("mobile-login-email").value;
    const password = document.getElementById("mobile-login-password").value;
    try {
      const user = await signInWithEmailAndPassword(auth, email, password);
      updateLoginUI(user.user);
      mobileLoginForm.classList.add("hidden");
    } catch (err) {
      alert(err.message);
    }
  };

  window.logout = async () => {
    await signOut(auth);
    location.reload();
  };

  onAuthStateChanged(auth, (user) => {
    if (user) updateLoginUI(user);
  });
}

function updateLoginUI(user) {
  const name = user.displayName || user.email;
  const loginBtn = document.getElementById("login-btn");
  const mobileLoginBtn = document.getElementById("mobile-login-btn");
  if (loginBtn) loginBtn.innerHTML = `${name} <button onclick="logout()" class="ml-2 text-red-500 font-bold">Log ud</button>`;
  if (mobileLoginBtn) mobileLoginBtn.innerHTML = `${name} <button onclick="logout()" class="ml-2 text-red-500 font-bold">Log ud</button>`;
}

/* ========== NOTIFICATIONS ========== */
async function loadNotificationsDropdown() {
  const notifBtn = document.getElementById("notif-btn");
  const notifDropdown = document.getElementById("notif-dropdown");
  const notifMessages = document.getElementById("notif-messages");
  const notifCount = document.getElementById("notif-count");

  if (!notifBtn || !notifDropdown) return;

  document.body.appendChild(notifDropdown);
  notifDropdown.style.position = "absolute";
  notifDropdown.style.zIndex = "99999";

  function positionDropdown() {
    const rect = notifBtn.getBoundingClientRect();
    notifDropdown.style.top = `${rect.bottom + 8}px`;
    notifDropdown.style.left = `${rect.right - notifDropdown.offsetWidth}px`;
  }

  notifBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    positionDropdown();
    notifDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
      notifDropdown.classList.add("hidden");
    }
  });

  try {
    const qy = query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(5));
    const snap = await getDocs(qy);
    notifMessages.innerHTML = "";
    if (snap.empty) {
      notifMessages.innerHTML = `<p class="text-gray-500 text-sm text-center">Ingen notifikationer endnu.</p>`;
      notifCount.classList.add("hidden");
      return;
    }
    let count = 0;
    snap.forEach(doc => {
      const data = doc.data();
      count++;
      notifMessages.innerHTML += `
        <div class="border-b border-gray-200 py-2 last:border-none">
          <div class="font-semibold text-yellow-600">${data.title || "Ny Notifikation"}</div>
          <div class="text-gray-700 text-sm">${data.message}</div>
        </div>`;
    });
    notifCount.textContent = count;
    notifCount.classList.remove("hidden");
  } catch (err) {
    notifMessages.innerHTML = `<p class="text-red-500 text-sm">Fejl: ${err.message}</p>`;
  }
}

/* ========== NAV MENU ========== */
function attachNavbarEvents() {
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));
  }
}
