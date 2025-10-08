// js/common.js — stable bell logic using shared Firebase instance
import { db, auth } from "./firebase.js";  // ✅ shared instance
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

console.log("[common.js] ✅ Loaded (shared Firebase instance)");

// --- Dropdown loader (for content) ---
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

// --- 🔴 Live badge listener with pause + readBy awareness ---
function setupLiveBadge() {
  onAuthStateChanged(auth, (user) => {
    const cnt = document.getElementById("notif-count");
    if (!user || !user.emailVerified || !cnt) return;

    const col = collection(db, "notifications");
    onSnapshot(col, (snap) => {
      if (window._pauseNotifUpdates) return;

      let unread = 0;
      snap.docs.forEach((d) => {
        const n = d.data();
        const readBy = Array.isArray(n.readBy) ? n.readBy : [];
        if (!readBy.includes(user.uid)) unread++;
      });

      if (unread > 0) {
        cnt.textContent = unread;
        cnt.classList.remove("hidden");
      } else {
        cnt.textContent = "0";
        cnt.classList.add("hidden");
      }

      console.log(`[common.js] 🔔 Live badge update: ${unread} ulæste`);
    });
  });
}

// --- Bell dropdown handler ---
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

  function positionDrop() {
    const r = btn.getBoundingClientRect();
    drop.style.top = `${r.bottom + 8}px`;
    drop.style.left = `${r.right - drop.offsetWidth}px`;
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    positionDrop();
    drop.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!drop.contains(e.target) && !btn.contains(e.target)) drop.classList.add("hidden");
  });

  // Initial load
  window.loadNotificationsDropdown({ messagesEl: msgs, countEl: cnt });
  setupLiveBadge();
  console.log("[common.js] 🔔 Bell wired successfully (shared Firebase)");
};

// --- Init after nav loads ---
setTimeout(() => {
  window.setupBellButton();
}, 1500);

// --- Reload on focus ---
window.addEventListener("focus", () => {
  console.log("[common.js] 🪟 Refocused → Reloading notifications");
  window.loadNotificationsDropdown();
});
