// js/common.js — unified live bell + admin badge logic (with per-user notifications + smart dropdown + admin name tracking)
import { db, auth } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

console.log("[common.js] ✅ Loaded (shared Firebase instance)");

const ADMIN_EMAIL = "asbjrnahle33@gmail.com" || "lilysean0@gmail.com"; 

/* -------------------------------
   📨 Create notifications (admin/user/global)
--------------------------------*/

/**
 * 🔔 Send a notification to a specific user
 */
export async function sendUserNotification(userId, title, message, type = "general") {
  try {
    await addDoc(collection(db, "notifications"), {
      title,
      message,
      type,
      userId, // 👈 only visible to that user per Firestore rules
      timestamp: serverTimestamp(),
      readBy: []
    });
    console.log(`[✅ Notification sent to user ${userId}] ${title}`);
  } catch (err) {
    console.error("[❌ Error sending user notification]", err);
  }
}

/**
 * 🌍 Send a global notification (visible to all users)
 */
export async function sendGlobalNotification(title, message, type = "general") {
  try {
    await addDoc(collection(db, "notifications"), {
      title,
      message,
      type,
      timestamp: serverTimestamp(),
      readBy: []
    });
    console.log(`[✅ Global notification created] ${title}`);
  } catch (err) {
    console.error("[❌ Error sending global notification]", err);
  }
}

/**
 * 👑 Send a notification to the specific admin performing the action
 * Includes the admin's name or email for clarity
 */
export async function sendAdminNotification(adminUid, title, message, type = "admin_action") {
  try {
    // Fetch admin info
    const adminRef = doc(db, "users", adminUid);
    const adminSnap = await getDoc(adminRef);
    const adminData = adminSnap.exists() ? adminSnap.data() : {};
    const adminName = adminData.displayName || adminData.name || adminData.email || "Ukendt Admin";

    // Build personalized message
    const personalizedMessage = `${adminName} ${message}`;

    await addDoc(collection(db, "notifications"), {
      title,
      message: personalizedMessage,
      type,
      userId: adminUid,
      timestamp: serverTimestamp(),
      readBy: []
    });

    console.log(`[✅ Admin notification sent → ${adminUid}] ${personalizedMessage}`);
  } catch (err) {
    console.error("[❌ Error sending admin notification]", err);
  }
}

/* -------------------------------
   📨 Dropdown (user-specific visibility)
--------------------------------*/
window.loadNotificationsDropdown = async function ({ messagesEl, countEl } = {}) {
  const m = messagesEl || document.getElementById("notif-messages");
  const c = countEl || document.getElementById("notif-count");
  if (!m) return;

  const user = auth.currentUser;
  if (!user) {
    m.innerHTML = `<p class="text-gray-500 text-sm text-center">Log ind for at se notifikationer.</p>`;
    if (c) c.classList.add("hidden");
    return;
  }

  try {
    const qy = query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(10));
    const snap = await getDocs(qy);
    const isAdmin = user.email === ADMIN_EMAIL;

    const visible = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((n) => {
        // Admins see only their own or global notifications
        if (isAdmin) {
          return !n.userId || n.userId === user.uid;
        }
        // Regular users see only their own or global
        return !n.userId || n.userId === user.uid;
      });

    if (visible.length === 0) {
      m.innerHTML = `<p class="text-gray-500 text-sm text-center">Ingen relevante notifikationer.</p>`;
      if (c) c.classList.add("hidden");
      return;
    }

    m.innerHTML = "";
    visible.forEach((data) => {
      m.innerHTML += `
        <div class="border-b border-gray-200 py-2 last:border-none">
          <div class="font-semibold text-yellow-600">${data.title || "Ny Notifikation"}</div>
          <div class="text-gray-700 text-sm">${data.message || ""}</div>
        </div>`;
    });

    if (c) {
      c.textContent = visible.length > 9 ? "9+" : visible.length;
      c.classList.remove("hidden");
    }

    console.log(`[common.js] ✅ Loaded ${visible.length} relevant notifications.`);
  } catch (err) {
    console.error("[common.js] ❌ Error loading notifications:", err);
    m.innerHTML = `<p class="text-red-500 text-sm text-center">Fejl: ${err.message}</p>`;
    if (c) c.classList.add("hidden");
  }
};

/* -------------------------------
   🔔 Live badge updater (with admin awareness)
--------------------------------*/
function setupLiveBadge() {
  if (window._liveBadgeActive) return;
  window._liveBadgeActive = true;

  onAuthStateChanged(auth, (user) => {
    const cnt = document.getElementById("notif-count");
    const cntMobile = document.getElementById("notif-count-mobile");
    if (!cnt) return;
    if (!user || !user.emailVerified) {
      cnt.classList.add("hidden");
      cntMobile?.classList.add("hidden");
      return;
    }

    onSnapshot(collection(db, "notifications"), (snap) => {
      if (window._pauseNotifUpdates) return;

      let unread = 0;
      let pendingApprovals = 0;
      const isAdmin = user.email === ADMIN_EMAIL;

      snap.docs.forEach((d) => {
        const data = d.data();
        const readBy = Array.isArray(data.readBy) ? data.readBy : [];

        // Skip notifications not meant for this user (admins included)
        if (data.userId && data.userId !== user.uid) return;

        // Count unread
        if (!readBy.includes(user.uid)) unread++;

        // Count approval requests (admin only)
        if (isAdmin && data.type === "approval_request") pendingApprovals++;
      });

      const showCount = isAdmin && pendingApprovals > 0 ? pendingApprovals : unread;

      [cnt, cntMobile].forEach((el) => {
        if (!el) return;
        if (showCount > 0) {
          el.textContent = showCount > 9 ? "9+" : showCount;
          el.classList.remove("hidden");
          el.classList.add(
            "absolute",
            "-top-1",
            "-right-1",
            "bg-red-600",
            "text-white",
            "rounded-full",
            "text-xs",
            "px-2",
            "py-0.5",
            "font-bold"
          );
        } else {
          el.classList.add("hidden");
        }
      });

      console.log(`[common.js] 🔔 ${unread} ulæste, ${pendingApprovals} afventende`);
    });
  });
}

/* -------------------------------
   🔔 Bell dropdown handler (smart bounds)
--------------------------------*/
window.setupBellButton = function (attempt = 1) {
  if (window._bellSetupActive) return;
  window._bellSetupActive = true;

  const btn = document.getElementById("notif-btn");
  const drop = document.getElementById("notif-dropdown");
  const msgs = document.getElementById("notif-messages");
  const cnt = document.getElementById("notif-count");

  if (!btn || !drop) {
    if (attempt <= 10) {
      console.log(`[common.js] ⏳ Bell not ready (try ${attempt})...`);
      window._bellSetupActive = false;
      setTimeout(() => window.setupBellButton(attempt + 1), 500);
    } else console.warn("[common.js] ❌ Bell setup failed after 10 tries.");
    return;
  }

  if (window._wiredNotif) return;
  window._wiredNotif = true;

  document.body.appendChild(drop);
  drop.style.position = "absolute";
  drop.style.zIndex = "99999";

  function positionDrop() {
    const wasHidden = drop.classList.contains("hidden");
    if (wasHidden) {
      drop.style.visibility = "hidden";
      drop.classList.remove("hidden");
    }

    const r = btn.getBoundingClientRect();
    const dropWidth = drop.offsetWidth;
    const dropHeight = drop.offsetHeight;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const margin = 8;

    let top = r.bottom + margin;
    let left = r.right - dropWidth;

    if (left + dropWidth + margin > screenWidth) left = screenWidth - dropWidth - margin;
    if (left < margin) left = margin;
    if (top + dropHeight + margin > screenHeight) {
      top = r.top - dropHeight - margin;
      if (top < margin) top = margin;
    }

    drop.style.top = `${top}px`;
    drop.style.left = `${left}px`;

    if (wasHidden) {
      drop.classList.add("hidden");
      drop.style.visibility = "";
    }
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    positionDrop();
    drop.classList.toggle("hidden");
  });

  window.addEventListener("resize", () => {
    if (!drop.classList.contains("hidden")) positionDrop();
  });
  window.addEventListener("scroll", () => {
    if (!drop.classList.contains("hidden")) positionDrop();
  });

  window.loadNotificationsDropdown({ messagesEl: msgs, countEl: cnt });
  setupLiveBadge();
  console.log("[common.js] 🔔 Bell wired successfully (smart bounds)");
};

/* -------------------------------
   🕓 Auto-init + focus refresh
--------------------------------*/
if (!window._notifInitDone) {
  window._notifInitDone = true;
  setTimeout(() => {
    console.log("[common.js] 🧩 Initializing notifications once...");
    window.setupBellButton();
  }, 1500);
}
window.addEventListener("focus", () => {
  console.log("[common.js] 🪟 Refocused → refreshing notifications badge");
  window.refreshNotificationsBadge?.();
});

/* -------------------------------
   💡 Outside-click closes dropdowns
--------------------------------*/
document.addEventListener("click", (e) => {
  const inside = (el) => el && (el === e.target || el.contains(e.target));
  const loginBtn = document.getElementById("login-btn");
  const loginDropdown = document.getElementById("login-dropdown");
  const notifBtn = document.getElementById("notif-btn");
  const notifDropdown = document.getElementById("notif-dropdown");

  const insideLogin = inside(loginBtn) || inside(loginDropdown);
  const insideNotif = inside(notifBtn) || inside(notifDropdown);

  if (!(insideLogin || insideNotif)) {
    loginDropdown?.classList.add("hidden");
    notifDropdown?.classList.add("hidden");
  }
});
