/* main.js — shared across all pages (stable + dropdowns auto-close on outside click) */

// ✅ Firebase Imports
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCzk3xKdC0p9logWjGIZX41M1oeIeqjxGI",
  authDomain: "branchcreek-bandits.firebaseapp.com",
  projectId: "branchcreek-bandits",
  storageBucket: "branchcreek-bandits.appspot.com",
  messagingSenderId: "828305260971",
  appId: "1:828305260971:web:6c3601fc97601a9621d2ee",
  measurementId: "G-550TRD5SQ3",
};

// ✅ Initialize Firebase once
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================================================
   INCLUDE NAV & FOOTER
========================================================= */
async function includeHTML(file, elementId, callback) {
  const res = await fetch(file);
  const html = await res.text();
  document.getElementById(elementId).innerHTML = html;
  if (window.feather) feather.replace();
  if (callback) callback();
}

/* =========================================================
   LOAD NAVBAR FIRST (THEN AUTH + NOTIFICATIONS)
========================================================= */
includeHTML("nav.html", "navbar", async () => {
  attachNavbarEvents();

  if (window.reapplyUserMenu) {
    window.reapplyUserMenu();
  }

  const waitForAuth = setInterval(() => {
    const loginBtn = document.getElementById("login-btn");
    if (typeof window.setupAuth === "function" && loginBtn) {
      clearInterval(waitForAuth);
      window.setupAuth();

      setTimeout(() => {
        loadNotificationsDropdown();
        installGlobalNavCloser(); // ✅ install closer once dropdown exists
        if (window.reapplyUserMenu) window.reapplyUserMenu();
      }, 600);
    }
  }, 150);

  // ✅ Install global click closer even before notifications exist
  installGlobalNavCloser();
});

/* =========================================================
   FOOTER
========================================================= */
includeHTML("footer.html", "footer");

/* =========================================================
   RENDER USER ROLE TEXT IN NAVBAR
========================================================= */
async function renderLoggedInUserWithRole() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    const data = snap.exists() ? snap.data() : {};
    const isAdmin = user.email === "asbjrnahle33@gmail.com";
    const role = data.role || (isAdmin ? "admin" : "registered");

    const loginBtn = document.getElementById("login-btn");
    const mobileLoginBtn = document.getElementById("mobile-login-btn");

    let roleLabel = "";
    if (role === "admin") roleLabel = " (Admin)";
    else if (role === "verified") roleLabel = "";
    else if (role === "registered") roleLabel = " (venter på godkendelse)";

    const html = `${user.displayName || user.email}${roleLabel} 
      <button onclick="logout()" class="ml-2 text-red-500 font-bold">Log ud</button>`;

    if (loginBtn) loginBtn.innerHTML = html;
    if (mobileLoginBtn) mobileLoginBtn.innerHTML = html;
  } catch (err) {
    console.error("[main.js] ⚠️ Error rendering user role:", err);
  }
}

/* =========================================================
   NOTIFICATION DROPDOWN
========================================================= */
async function loadNotificationsDropdown() {
  const notifBtn = document.getElementById("notif-btn");
  const notifDropdown = document.getElementById("notif-dropdown");
  const notifMessages = document.getElementById("notif-messages");
  const notifCount = document.getElementById("notif-count");

  if (!notifBtn || !notifDropdown) return;

  // Move dropdown to body
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
    snap.forEach((doc) => {
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

/* =========================================================
   NAVBAR DROPDOWN TOGGLES
========================================================= */
function attachNavbarEvents() {
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const loginBtn = document.getElementById("login-btn");
  const loginDropdown = document.getElementById("login-dropdown");
  const mobileLoginBtn = document.getElementById("mobile-login-btn");
  const mobileLoginWrapper = document.querySelector("#mobile-login-form > div");
  const notifBtn = document.getElementById("notif-btn");
  const notifDropdown = document.getElementById("notif-dropdown");

  if (menuBtn && mobileMenu)
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle("hidden");
    });
  if (loginBtn && loginDropdown)
    loginBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      loginDropdown.classList.toggle("hidden");
    });
  if (mobileLoginBtn && mobileLoginWrapper)
    mobileLoginBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      mobileLoginWrapper.classList.toggle("hidden");
    });
  if (notifBtn && notifDropdown)
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle("hidden");
    });
}

/* =========================================================
   GLOBAL OUTSIDE-CLICK HANDLER (bulletproof)
========================================================= */
function isOpen(el) {
  return el && !el.classList.contains("hidden");
}
function closeAllNavOverlays() {
  document.getElementById("login-dropdown")?.classList.add("hidden");
  document.querySelector("#mobile-login-form > div")?.classList.add("hidden");
  document.getElementById("mobile-menu")?.classList.add("hidden");
  document.getElementById("notif-dropdown")?.classList.add("hidden");
}

function installGlobalNavCloser() {
  if (window.__navCloserInstalled) return;
  window.__navCloserInstalled = true;

  document.addEventListener(
    "pointerdown",
    (e) => {
      const loginBtn = document.getElementById("login-btn");
      const loginDropdown = document.getElementById("login-dropdown");
      const mobileLoginBtn = document.getElementById("mobile-login-btn");
      const mobileLoginWrapper = document.querySelector("#mobile-login-form > div");
      const menuBtn = document.getElementById("menu-btn");
      const mobileMenu = document.getElementById("mobile-menu");
      const notifBtn = document.getElementById("notif-btn");
      const notifDropdown = document.getElementById("notif-dropdown");

      const inside = (el) => el && (el === e.target || el.contains(e.target));

      const clickedInsideLogin = inside(loginBtn) || inside(loginDropdown);
      const clickedInsideMobileLogin = inside(mobileLoginBtn) || inside(mobileLoginWrapper);
      const clickedInsideMenu = inside(menuBtn) || inside(mobileMenu);
      const clickedInsideNotif = inside(notifBtn) || inside(notifDropdown);

      if (!(clickedInsideLogin || clickedInsideMobileLogin || clickedInsideMenu || clickedInsideNotif)) {
        if (isOpen(loginDropdown)) loginDropdown.classList.add("hidden");
        if (isOpen(mobileLoginWrapper)) mobileLoginWrapper.classList.add("hidden");
        if (isOpen(mobileMenu)) mobileMenu.classList.add("hidden");
        if (isOpen(notifDropdown)) notifDropdown.classList.add("hidden");
      }
    },
    true
  );

  window.addEventListener("keydown", (e) => e.key === "Escape" && closeAllNavOverlays());
  window.addEventListener("scroll", closeAllNavOverlays, { passive: true });
}

/* =========================================================
   LOGOUT
========================================================= */
window.logout = async function () {
  try {
    console.log("[main.js] 🚪 Logging out");
    localStorage.clear();
    sessionStorage.clear();
    await signOut(auth);
    window.location.href = window.location.pathname + "?reload=" + new Date().getTime();
  } catch (err) {
    console.error("❌ Logout error:", err);
    alert("Fejl ved log ud: " + err.message);
  }
};
