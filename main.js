/* main.js — shared across all pages (stable with Notification page fix) */

// ✅ Firebase Imports
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
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
/* =========================================================
   LOAD NAVBAR FIRST (THEN AUTH + NOTIFICATIONS)
========================================================= */
includeHTML("nav.html", "navbar", async () => {
  attachNavbarEvents();

  // ✅ Reapply the correct user/admin menu right after nav is injected
  if (window.reapplyUserMenu) {
    console.log("[main.js] 🔄 Reapplying user menu after nav load");
    window.reapplyUserMenu();
  }

  // 🧩 Notification page safety for login dropdown
  if (window.location.pathname.includes("notifications.html")) {
    document.addEventListener("click", (e) => {
      const loginBtn = document.getElementById("login-btn");
      const loginDropdown = document.getElementById("login-dropdown");
      if (loginBtn && loginDropdown && loginBtn.contains(e.target)) {
        e.stopPropagation();
        loginDropdown.classList.toggle("hidden");
        loginDropdown.classList.remove("opacity-0");
      }
    });
  }

  // 🕓 Wait until auth.js and navbar button exist, then init
  const waitForAuth = setInterval(() => {
    const loginBtn = document.getElementById("login-btn");
    if (typeof window.setupAuth === "function" && loginBtn) {
      clearInterval(waitForAuth);
      console.log("[main.js] ✅ setupAuth and navbar detected — initializing auth...");
      window.setupAuth();

      // Give Firebase a moment to restore the session, then wire dropdown
      setTimeout(() => {
        console.log("[main.js] 🔔 Initializing notifications dropdown…");
        loadNotificationsDropdown();
        // Ensure user menu is still correct after any late DOM work
        if (window.reapplyUserMenu) window.reapplyUserMenu();
      }, 600);
    }
  }, 150);
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

  // Move dropdown to body to prevent overflow issues
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
   NAVBAR MENU (MOBILE)
========================================================= */
function attachNavbarEvents() {
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));
  }
}

/* =========================================================
   LOGOUT (GLOBAL OVERRIDE SAFETY)
========================================================= */
window.logout = async function () {
  try {
    console.log("[main.js] 🚪 Logging out (global override)");
    localStorage.clear();
    sessionStorage.clear();
    await signOut(auth);
    window.location.href = window.location.pathname + "?reload=" + new Date().getTime();
  } catch (err) {
    console.error("❌ Logout error:", err);
    alert("Fejl ved log ud: " + err.message);
  }
};
