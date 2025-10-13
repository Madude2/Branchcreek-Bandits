// js/common.js — unified live bell + admin badge logic
import { db, auth } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

console.log("[common.js] ✅ Loaded (shared Firebase instance)");

const ADMIN_EMAIL = "asbjrnahle33@gmail.com";

/* -------------------------------
   📨 Dropdown (5 latest notifications)
--------------------------------*/
window.loadNotificationsDropdown = async function ({ messagesEl, countEl } = {}) {
  const m = messagesEl || document.getElementById("notif-messages");
  const c = countEl || document.getElementById("notif-count");
  if (!m) return;

  try {
    const qy = query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(5));
    const snap = await getDocs(qy);

    m.innerHTML = "";
    if (snap.empty) {
      m.innerHTML = `<p class="text-gray-500 text-sm text-center">Ingen notifikationer endnu.</p>`;
      if (c) c.classList.add("hidden");
      return;
    }

    snap.forEach((doc) => {
      const data = doc.data();
      m.innerHTML += `
        <div class="border-b border-gray-200 py-2 last:border-none">
          <div class="font-semibold text-yellow-600">${data.title || "Ny Notifikation"}</div>
          <div class="text-gray-700 text-sm">${data.message || ""}</div>
        </div>`;
    });

    console.log("[common.js] ✅ Dropdown notifikationer indlæst.");
  } catch (err) {
    console.error("[common.js] ❌ Fejl ved indlæsning:", err);
    if (messagesEl) messagesEl.innerHTML = `<p class="text-red-500 text-sm">Fejl: ${err.message}</p>`;
    if (countEl) countEl.classList.add("hidden");
  }
};

/* -------------------------------
   🔔 Live badge updater (with admin awareness)
--------------------------------*/
function setupLiveBadge() {
  onAuthStateChanged(auth, (user) => {
    const cnt = document.getElementById("notif-count");
    if (!cnt) return;
    if (!user || !user.emailVerified) {
      cnt.classList.add("hidden");
      return;
    }

    onSnapshot(collection(db, "notifications"), (snap) => {
      if (window._pauseNotifUpdates) return;

      let unread = 0;
      let pendingApprovals = 0;

      snap.docs.forEach((d) => {
        const data = d.data();
        const readBy = Array.isArray(data.readBy) ? data.readBy : [];

        // Count unread
        if (!readBy.includes(user.uid)) unread++;

        // Count approval requests (admin only)
        if (user.email === ADMIN_EMAIL && data.type === "approval_request") {
          pendingApprovals++;
        }
      });

      // ✅ Update UI badge
      if (cnt) {
        let showCount = unread;
        if (user.email === ADMIN_EMAIL && pendingApprovals > 0) {
          showCount = pendingApprovals;
        }

        if (showCount > 0) {
          cnt.textContent = showCount > 9 ? "9+" : showCount;
          cnt.classList.remove("hidden");
          cnt.classList.add(
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
          cnt.classList.add("hidden");
        }
      }

      console.log(`[common.js] 🔔 ${unread} ulæste, ${pendingApprovals} afventende godkendelser`);
    });
  });
}

/* -------------------------------
   🧩 Global badge refresh function
--------------------------------*/
window.refreshNotificationsBadge = async function () {
  const user = auth.currentUser;
  const cnt = document.getElementById("notif-count");
  if (!cnt || !user) return;

  try {
    const qy = query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(50));
    const snap = await getDocs(qy);

    let unread = 0;
    let pendingApprovals = 0;

    snap.forEach((d) => {
      const data = d.data();
      const readBy = Array.isArray(data.readBy) ? data.readBy : [];
      if (!readBy.includes(user.uid)) unread++;
      if (user.email === ADMIN_EMAIL && data.type === "approval_request") {
        pendingApprovals++;
      }
    });

    let showCount = unread;
    if (user.email === ADMIN_EMAIL && pendingApprovals > 0) showCount = pendingApprovals;

    if (showCount > 0) {
      cnt.textContent = showCount > 9 ? "9+" : showCount;
      cnt.classList.remove("hidden");
    } else {
      cnt.classList.add("hidden");
    }

    console.log(`[common.js] 🔁 refreshNotificationsBadge(): ${showCount}`);
  } catch (err) {
    console.error("[common.js] ❌ Fejl ved refreshNotificationsBadge:", err);
  }
};

/* -------------------------------
   🔔 Bell dropdown handler
--------------------------------*/
window.setupBellButton = function (attempt = 1) {
  const btn = document.getElementById("notif-btn");
  const drop = document.getElementById("notif-dropdown");
  const msgs = document.getElementById("notif-messages");
  const cnt = document.getElementById("notif-count");

  if (!btn || !drop) {
    if (attempt <= 10) {
      console.log(`[common.js] ⏳ Bell not ready (try ${attempt})...`);
      setTimeout(() => window.setupBellButton(attempt + 1), 500);
    } else {
      console.warn("[common.js] ❌ Bell setup failed after 10 tries.");
    }
    return;
  }

  if (window._wiredNotif) return;
  window._wiredNotif = true;

  document.body.appendChild(drop);
  drop.style.position = "absolute";
  drop.style.zIndex = "99999";

  // Smart dynamic positioning
  function positionDrop() {
    const r = btn.getBoundingClientRect();
    const dropWidth = drop.offsetWidth;
    const screenWidth = window.innerWidth;
    const margin = 8;

    let left = r.right - dropWidth;
    if (left + dropWidth + margin > screenWidth) left = screenWidth - dropWidth - margin;
    if (left < margin) left = margin;

    drop.style.top = `${r.bottom + margin}px`;
    drop.style.left = `${left}px`;
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    positionDrop();
    drop.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!drop.contains(e.target) && !btn.contains(e.target)) drop.classList.add("hidden");
  });

  window.loadNotificationsDropdown({ messagesEl: msgs, countEl: cnt });
  setupLiveBadge();
  console.log("[common.js] 🔔 Bell wired successfully (live updates)");
};

/* -------------------------------
   🕓 Auto-init + focus refresh
--------------------------------*/
setTimeout(() => {
  window.setupBellButton();
}, 1500);

window.addEventListener("focus", () => {
  console.log("[common.js] 🪟 Refocused → refreshing notifications badge");
  window.refreshNotificationsBadge();
});
