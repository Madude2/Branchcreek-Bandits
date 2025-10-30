// js/auth.js — stable + admin approval notifications + flicker fix
import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

console.log("[auth.js] ✅ Loaded — roles + spinner + admin notifications + flicker fix");

// ---------------------------
// 🔥 Branchcreek Bandits Auth.js (Role-Based)
// ---------------------------
window.setupAuth = function () {
  /* -------------------------------
     👁️ Password visibility toggles
  --------------------------------*/
  function initFeatherSafe() {
    if (window.feather && typeof feather.replace === "function") feather.replace();
  }

  function setupPasswordToggles() {
    const pairs = [
      { inputId: "login-password", toggleId: "toggle-login-password", mode: "click" },
      { inputId: "signup-password", toggleId: "toggle-signup-password", mode: "click" },
      { inputId: "mobile-login-password", toggleId: "toggle-mobile-password", mode: "hold" },
    ];
    pairs.forEach(({ inputId, toggleId, mode }) => {
      const input = document.getElementById(inputId);
      const btn = document.getElementById(toggleId);
      if (!input || !btn || btn.dataset.bound === "1") return;
      input.classList.add("pr-10");
      btn.dataset.bound = "1";
      const icon = btn.querySelector("i");

      if (mode === "click") {
        btn.addEventListener("click", () => {
          const showing = input.type === "text";
          input.type = showing ? "password" : "text";
          if (icon) {
            icon.setAttribute("data-feather", showing ? "eye" : "eye-off");
            initFeatherSafe();
          }
        });
      } else if (mode === "hold") {
        const show = () => {
          input.type = "text";
          icon?.setAttribute("data-feather", "eye-off");
          initFeatherSafe();
        };
        const hide = () => {
          input.type = "password";
          icon?.setAttribute("data-feather", "eye");
          initFeatherSafe();
        };
        btn.addEventListener("mousedown", show);
        btn.addEventListener("mouseup", hide);
        btn.addEventListener("mouseleave", hide);
        btn.addEventListener("touchstart", (e) => { e.preventDefault(); show(); });
        btn.addEventListener("touchend", hide);
        btn.addEventListener("touchcancel", hide);
      }
    });
  }
  initFeatherSafe();
  setupPasswordToggles();

  const obs = new MutationObserver(() => {
    initFeatherSafe();
    setupPasswordToggles();
  });
  obs.observe(document.body, { childList: true, subtree: true });

  /* -------------------------------
     🔒 Logout Handler
  --------------------------------*/
  function attachLogoutHandler(attempt = 1) {
    const btns = document.querySelectorAll("#logout-btn");
    if (!btns.length) {
      if (attempt <= 10) setTimeout(() => attachLogoutHandler(attempt + 1), 300);
      return;
    }
    btns.forEach((btn) => {
      if (btn._logoutBound) return;
      btn._logoutBound = true;
      btn.addEventListener("click", async () => {
        try {
          window._pauseNotifUpdates = true;
          await signOut(auth);
          localStorage.clear();
          sessionStorage.clear();
          document.getElementById("login-dropdown")?.classList.add("hidden");
          document.querySelector("#mobile-login-form > div")?.classList.add("hidden");
          window.location.reload();
        } catch (err) {
          alert("Fejl ved log ud: " + err.message);
        }
      });
    });
  }

  /* -------------------------------
     🧭 Navbar Display
  --------------------------------*/
  function updateMenu(name, role) {
    const loginBtn = document.getElementById("login-btn");
    const mobileLoginBtn = document.getElementById("mobile-login-btn");
    if (!loginBtn) return;

    let roleLabel = "";
    if (role === "admin") roleLabel = " (Admin)";
    else if (role === "registered") roleLabel = " (venter på godkendelse)";

    const html = `
      <span>${name}${roleLabel}</span>
      <button id="logout-btn" class="ml-2 text-red-500 font-bold hover:underline">Log ud</button>`;
    loginBtn.innerHTML = html;
    if (mobileLoginBtn) mobileLoginBtn.innerHTML = html;
    attachLogoutHandler();
  }

  /* -------------------------------
     🔄 Spinner
  --------------------------------*/
  function showThrobber(btn, text = "Logger ind...") {
    if (!btn) return;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `
      <span class="flex justify-center items-center gap-2 w-full">
        <svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span>${text}</span>
      </span>`;
    btn.disabled = true;
  }
  function hideThrobber(btn) {
    if (!btn) return;
    btn.innerHTML = btn.dataset.originalText || "Log ind";
    btn.disabled = false;
  }

  /* -------------------------------
     🔑 LOGIN (Role-based)
  --------------------------------*/
  async function handleLogin(email, password, isMobile = false) {
    const loginBtn = isMobile
      ? document.getElementById("mobile-login-submit")
      : document.getElementById("login-submit");
    try {
      showThrobber(loginBtn);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      if (!user.emailVerified) {
        alert("Bekræft din e-mail før login.");
        await signOut(auth);
        hideThrobber(loginBtn);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      const data = snap.exists() ? snap.data() : {};
      const role = data.role || "registered";
      const displayName = data.displayName || user.displayName || user.email;
      updateMenu(displayName, role);

      document.getElementById("login-dropdown")?.classList.add("hidden");
      document.querySelector("#mobile-login-form > div")?.classList.add("hidden");
    } catch (err) {
      alert(err.message);
    } finally {
      hideThrobber(loginBtn);
    }
  }
  window.login = () => {
    const email = document.getElementById("login-email")?.value?.trim();
    const password = document.getElementById("login-password")?.value;
    if (!email || !password) return alert("Indtast e-mail og adgangskode.");
    handleLogin(email, password, false);
  };
  window.mobileLogin = () => {
    const email = document.getElementById("mobile-login-email")?.value?.trim();
    const password = document.getElementById("mobile-login-password")?.value;
    if (!email || !password) return alert("Indtast e-mail og adgangskode.");
    handleLogin(email, password, true);
  };

  /* -------------------------------
     🔔 AUTH STATE LISTENER (Role-based)
  --------------------------------*/
  onAuthStateChanged(auth, async (user) => {
    const body = document.querySelector("body");
    try {
      if (!user) {
        body.style.visibility = "visible";
        return;
      }

      const userRef = doc(db, "users", user.uid);
      let snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName || user.email,
          role: "registered",
          createdAt: serverTimestamp(),
        });
        snap = await getDoc(userRef);
      }

      const data = snap.data();
      const role = data.role || "registered";
      const displayName = data.displayName || user.displayName || user.email;
      updateMenu(displayName, role);

      // Auto-notify admins for unverified users
      if (role === "registered" && !data.verifiedByAdmin) {
        const q = query(collection(db, "notifications"), where("userId", "==", user.uid));
        const existing = await getDocs(q);
        if (existing.empty) {
          await addDoc(collection(db, "notifications"), {
            title: "Ny bruger venter på godkendelse",
            message: `Bruger ${user.email} har oprettet en konto og venter på godkendelse.`,
            type: "approval_request",
            userId: user.uid,
            timestamp: serverTimestamp(),
            readBy: [],
          });
        }
      }
    } catch (err) {
      console.error("[auth.js] Error:", err);
    } finally {
      setTimeout(() => (body.style.visibility = "visible"), 100);
    }
  });
};


  /* -------------------------------
     🚪 Manual logout
  --------------------------------*/
  window.logout = async function () {
    try {
      console.log("[auth.js] 🚪 Manual logout triggered...");
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (err) {
      console.error("❌ Logout error:", err);
      alert("Fejl ved log ud: " + err.message);
    }
  };

