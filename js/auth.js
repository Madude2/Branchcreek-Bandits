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


  window.setupAuth = function () {
  const ADMIN_EMAIL = "asbjrnahle33@gmail.com" || "lilysean0@gmail.com"; // your admin email

  




    

  /* -------------------------------
      Password visibility toggles (robust)
  --------------------------------*/
  function initFeatherSafe() {
    if (window.feather && typeof feather.replace === "function") {
      feather.replace();
    }
  }

  function setupPasswordToggles() {
    const pairs = [
      { inputId: "login-password", toggleId: "toggle-login-password" },
      { inputId: "signup-password", toggleId: "toggle-signup-password" },
      { inputId: "mobile-login-password", toggleId: "toggle-mobile-password" },
    ];

    pairs.forEach(({ inputId, toggleId }) => {
      const input = document.getElementById(inputId);
      const btn = document.getElementById(toggleId);
      if (!input || !btn || btn.dataset.bound === "1") return;

      // Make room for the icon just in case
      input.classList.add("pr-10");

      // Prevent double-binding in dynamic UIs
      btn.dataset.bound = "1";

      btn.addEventListener("click", () => {
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";

        const icon = btn.querySelector("i");
        if (icon) {
          icon.setAttribute("data-feather", showing ? "eye" : "eye-off");
          initFeatherSafe();
        }
      });
    });
  }


  
  // Run once now, then re-run when DOM changes (e.g., dropdowns/modals inject fields)
  initFeatherSafe();
  setupPasswordToggles();
  const _pwObserver = new MutationObserver(() => {
    initFeatherSafe();
    setupPasswordToggles();
  });
  _pwObserver.observe(document.body, { childList: true, subtree: true });

  /* -------------------------------
     🔒 Reliable logout handler
  --------------------------------*/
  function attachLogoutHandler(attempt = 1) {
    const btns = document.querySelectorAll("#logout-btn");
    if (!btns.length) {
      if (attempt <= 10) {
        console.log(`[auth.js] ⏳ Waiting for logout button (try ${attempt})...`);
        setTimeout(() => attachLogoutHandler(attempt + 1), 300);
      }
      return;
    }

    btns.forEach((btn) => {
      if (btn._logoutBound) return;
      btn._logoutBound = true;

      btn.addEventListener("click", async () => {
        console.log("[auth.js] 🚪 Logout clicked");
        try {
          window._pauseNotifUpdates = true;
          await signOut(auth);
          localStorage.clear();
          sessionStorage.clear();

          const dropdown = document.getElementById("login-dropdown");
          if (dropdown) dropdown.classList.add("hidden");
          const mobileForm = document.querySelector("#mobile-login-form > div");
          if (mobileForm) mobileForm.classList.add("hidden");

          console.log("[auth.js] ✅ Signed out successfully");
          window.location.reload();
        } catch (err) {
          console.error("❌ Logout error:", err);
          alert("Fejl ved log ud: " + err.message);
        }
      });
    });
  }

  /* -------------------------------
     🧭 Navbar user display
  --------------------------------*/
  function updateMenu(name, role) {
    const loginBtn = document.getElementById("login-btn");
    const mobileLoginBtn = document.getElementById("mobile-login-btn");
    if (!loginBtn) return;

    let roleLabel = "";
    if (role === "admin") roleLabel = " (Admin)";
    else if (role === "verified") roleLabel = "";
    else if (role === "registered") roleLabel = " (venter på godkendelse)";

    const html = `
      <span>${name}${roleLabel}</span>
      <button id="logout-btn" class="ml-2 text-red-500 font-bold hover:underline">Log ud</button>
    `;
    loginBtn.innerHTML = html;
    if (mobileLoginBtn) mobileLoginBtn.innerHTML = html;
    attachLogoutHandler();
  }

  /* -------------------------------
     🔄 Spinner helpers
  --------------------------------*/
  function showThrobber(buttonEl, text = "Logger ind...") {
    if (!buttonEl) return;
    buttonEl.dataset.originalText = buttonEl.innerHTML;
    buttonEl.innerHTML = `
      <span class="flex justify-center items-center gap-2 w-full">
        <svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span>${text}</span>
      </span>`;
    buttonEl.disabled = true;
  }
  function hideThrobber(buttonEl) {
    if (!buttonEl) return;
    buttonEl.innerHTML = buttonEl.dataset.originalText || "Log ind";
    buttonEl.disabled = false;
  }

  /* -------------------------------
     🧑‍💻 USER SIGNUP — notify admin
  --------------------------------*/
  window.signup = async function () {
    const email = document.getElementById("signup-email")?.value?.trim();
    const password = document.getElementById("signup-password")?.value;
    if (!email || !password) {
      alert("Indtast e-mail og adgangskode.");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      const isAdmin = user.email === ADMIN_EMAIL;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: user.displayName || user.email,
        status: isAdmin ? "verified" : "registered",
        verifiedByAdmin: isAdmin,
        role: isAdmin ? "admin" : "registered",
        createdAt: serverTimestamp(),
        emailVerified: false,
      });

      // Wait until Firebase fully registers session
      await user.getIdToken(true);

      // Notify admin that a new user signed up
      if (!isAdmin) {
        try {
          console.log("[auth.js] 🧠 Attempting to create approval_request...");
          const notifRef = await addDoc(collection(db, "notifications"), {
            title: "Ny bruger venter på godkendelse",
            message: `Bruger ${user.email} har oprettet en konto og venter på godkendelse.`,
            type: "approval_request",
            userId: user.uid,
            timestamp: serverTimestamp(),
            readBy: [],
          });
          console.log("[auth.js] ✅ Notification created:", notifRef.id);
        } catch (err) {
          console.error("🔥 Firestore write failed:", err.code, err.message);
        }
      }

      await sendEmailVerification(user);
      alert("En bekræftelsesmail er sendt. Tjek din indbakke.");
      await signOut(auth);
    } catch (err) {
      console.error("❌ Signup error:", err);
      alert("Fejl ved oprettelse: " + err.message);
    }
  };

  /* -------------------------------
     🔑 LOGIN
  --------------------------------*/
  async function handleLogin(email, password, isMobile = false) {
    const loginBtn = isMobile
      ? document.getElementById("mobile-login-submit")
      : document.getElementById("login-submit");

    try {
      showThrobber(loginBtn);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      const userRef = doc(db, "users", user.uid);
      const isAdmin = user.email === ADMIN_EMAIL;

      if (!user.emailVerified && !isAdmin) {
        alert("Bekræft din e-mail før login.");
        await signOut(auth);
        hideThrobber(loginBtn);
        return;
      }

      const snap = await getDoc(userRef);
      const data = snap.exists() ? snap.data() : {};
      let role = "registered";
      if (isAdmin) role = "admin";
      else if (data.verifiedByAdmin) role = "verified";

      // ✅ Prefer Firestore displayName if available
      const displayName = data.displayName || user.displayName || user.email;
      updateMenu(displayName, role);

      // 🧠 Optional: sync Firebase Auth profile for consistency
      if (!user.displayName && data.displayName) {
        try {
          const { updateProfile } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js");
          await updateProfile(user, { displayName: data.displayName });
          console.log("[auth.js] 🔄 Synced Auth displayName from Firestore:", data.displayName);
        } catch (err) {
          console.warn("[auth.js] ⚠️ Couldn't update Auth profile:", err.message);
        }
      }

      // Close dropdowns
      document.getElementById("login-dropdown")?.classList.add("hidden");
      document.querySelector("#mobile-login-form > div")?.classList.add("hidden");
    } catch (err) {
      console.error("❌ Login error:", err);
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
     🔔 AUTH STATE — auto notification safety net
  --------------------------------*/
  onAuthStateChanged(auth, async (user) => {
    const body = document.querySelector("body");
    try {
      if (!user) {
        if (body) body.style.visibility = "visible";
        return;
      }

      const isAdmin = user.email === ADMIN_EMAIL;
      const userRef = doc(db, "users", user.uid);
      let snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName || user.email,
          status: isAdmin ? "verified" : "registered",
          verifiedByAdmin: isAdmin,
          role: isAdmin ? "admin" : "registered",
          createdAt: serverTimestamp(),
        });
        snap = await getDoc(userRef);
      }

      const data = snap.data() || {};
      let role = "registered";
      if (isAdmin) role = "admin";
      else if (data.verifiedByAdmin) role = "verified";

      // ✅ Use Firestore displayName if present
      const displayName = data.displayName || user.displayName || user.email;
      updateMenu(displayName, role);

      // ✅ Auto-create approval request if user somehow skipped earlier
      if (!isAdmin && role === "registered" && !data.verifiedByAdmin) {
        const existing = await getDocs(
          query(collection(db, "notifications"), where("userId", "==", user.uid))
        );
        if (existing.empty) {
          await addDoc(collection(db, "notifications"), {
            title: "Ny bruger venter på godkendelse",
            message: `Bruger ${user.email} har oprettet en konto og venter på godkendelse.`,
            type: "approval_request",
            userId: user.uid,
            timestamp: serverTimestamp(),
            readBy: [],
          });
          console.log("[auth.js] 📨 Auto-created missing approval_request notification");
        }
      }
    } catch (err) {
      console.error("[auth.js] ⚠️ Auth state error:", err);
    } finally {
      setTimeout(() => {
        if (body) body.style.visibility = "visible";
      }, 100);
    }
  });

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
  }
