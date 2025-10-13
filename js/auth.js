// js/auth.js — with throbber & admin role verification system
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
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  getDoc,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

console.log("[auth.js] ✅ Loaded — roles + spinner + admin notifications");

window.setupAuth = function () {
  const ADMIN_EMAIL = "asbjrnahle33@gmail.com";

  /* -------------------------------
     Navbar user display
  --------------------------------*/
  function updateMenu(name, role) {
    const loginBtn = document.getElementById("login-btn");
    const mobileLoginBtn = document.getElementById("mobile-login-btn");
    let roleLabel = "";

    if (role === "admin") roleLabel = " (Admin)";
    else if (role === "verified") roleLabel = "";
    else if (role === "registered") roleLabel = " (venter på godkendelse)";

    const html = `${name}${roleLabel} <button onclick="logout()" class="ml-2 text-red-500 font-bold">Log ud</button>`;
    if (loginBtn) loginBtn.innerHTML = html;
    if (mobileLoginBtn) mobileLoginBtn.innerHTML = html;
  }

  /* -------------------------------
     Spinner helper
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
     USER SIGNUP
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
        status: isAdmin ? "verified" : "new",
        verifiedByAdmin: isAdmin,
        role: isAdmin ? "admin" : "new",
        createdAt: serverTimestamp(),
      });

      await sendEmailVerification(user);
      alert("En bekræftelsesmail er sendt til din e-mail. Tjek din indbakke.");
      await signOut(auth);
    } catch (err) {
      console.error("❌ Signup error:", err);
      alert("Fejl ved oprettelse: " + err.message);
    }
  };

  /* -------------------------------
     LOGIN (with spinner)
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

      let snap = await getDoc(userRef);
      let userData = snap.exists() ? snap.data() : null;
      if (!userData) {
        const newData = {
          email: user.email,
          displayName: user.displayName || user.email,
          status: isAdmin ? "verified" : "registered",
          verifiedByAdmin: isAdmin,
          role: isAdmin ? "admin" : "registered",
          createdAt: serverTimestamp(),
        };
        await setDoc(userRef, newData);
        userData = newData;
      }

      // Refetch to ensure most accurate data
      snap = await getDoc(userRef);
      userData = snap.exists() ? snap.data() : userData;

      let role = userData.role || (isAdmin ? "admin" : "registered");
      if (userData.verifiedByAdmin) role = "verified";
      if (isAdmin) role = "admin";

      // Notify admin if verified but not approved
      if (user.emailVerified && !isAdmin && !userData.verifiedByAdmin) {
        const notifQuery = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          where("type", "==", "approval_request")
        );
        const notifSnap = await getDocs(notifQuery);

        if (notifSnap.empty) {
          await updateDoc(userRef, { status: "registered", role: "registered" });
          await addDoc(collection(db, "notifications"), {
            title: "Ny bruger venter på godkendelse",
            message: `${user.email} har bekræftet sin e-mail og venter på at blive godkendt af en administrator.`,
            type: "approval_request",
            userId: user.uid,
            timestamp: serverTimestamp(),
            readBy: [],
          });
        }
      }

      updateMenu(user.displayName || user.email, role);
console.log(`[auth.js] ✅ Login success — role: ${role}`);

// 🧹 Automatically close login popups after successful login
const desktopDropdown = document.getElementById("login-dropdown");
const mobileFormWrapper = document.querySelector("#mobile-login-form > div");

if (desktopDropdown) {
  desktopDropdown.classList.add("hidden");
}

if (mobileFormWrapper) {
  mobileFormWrapper.classList.add("hidden");
}

// Optional: add a small success animation or message
// Example: alert("✅ Du er nu logget ind!");

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
    const btn = document.getElementById("login-submit");
    if (!email || !password) return alert("Indtast e-mail og adgangskode.");
    handleLogin(email, password, false);
  };

  window.mobileLogin = () => {
    const email = document.getElementById("mobile-login-email")?.value?.trim();
    const password = document.getElementById("mobile-login-password")?.value;
    const btn = document.getElementById("mobile-login-submit");
    if (!email || !password) return alert("Indtast e-mail og adgangskode.");
    handleLogin(email, password, true);
  };

  /* -------------------------------
     AUTH STATE LISTENER (unchanged)
  --------------------------------*/
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (window.lockForum) window.lockForum();
      return;
    }

    const userRef = doc(db, "users", user.uid);
    let snap = await getDoc(userRef);
    const isAdmin = user.email === ADMIN_EMAIL;

    if (!snap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName || user.email,
        status: isAdmin ? "verified" : "new",
        verifiedByAdmin: isAdmin,
        role: isAdmin ? "admin" : "new",
        createdAt: serverTimestamp(),
      });
      snap = await getDoc(userRef);
    }

    const data = snap.data() || {};
    const role = data.role || (isAdmin ? "admin" : "registered");

    // 🩵 Ensure verified users always have correct role/status synced
if (data.verifiedByAdmin && (data.status !== "verified" || data.role !== "verified")) {
  await updateDoc(userRef, { status: "verified", role: "verified" });
  data.status = "verified";
  data.role = "verified";
  console.log("🔁 Synced verified user state to Firestore:", user.email);
}



    updateMenu(user.displayName || user.email, data.verifiedByAdmin ? "verified" : role);
  });

  /* -------------------------------
     LOGOUT (clears cache)
  --------------------------------*/
  window.logout = async function () {
  try {
    console.log("[auth.js] 🚪 Logging out...");
    
    // 🧹 Hide login dropdowns
    const loginDropdown = document.getElementById("login-dropdown");
    const mobileLoginForm = document.querySelector("#mobile-login-form > div");
    if (loginDropdown) loginDropdown.classList.add("hidden");
    if (mobileLoginForm) mobileLoginForm.classList.add("hidden");

    // 🧼 Clear caches
    localStorage.clear();
    sessionStorage.clear();

    // 🧱 Sign out of Firebase
    await signOut(auth);

    console.log("[auth.js] ✅ Signed out successfully");

    // 🚀 Force a full hard reload (flush all contexts & service workers)
    window.location.href = window.location.pathname + "?reload=" + new Date().getTime();
  } catch (err) {
    console.error("❌ Logout error:", err);
    alert("Fejl ved log ud: " + err.message);
  }
};


};
