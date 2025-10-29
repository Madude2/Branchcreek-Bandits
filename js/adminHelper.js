/* -------------------------------------
   🔐 Admin Helper — Global Access
   Handles admin detection and roles
-------------------------------------- */

window.adminHelper = (function () {
  let adminEmails = [];  // Cached list of admin emails
  let loaded = false;    // Has the list been loaded yet?

  // ✅ Load all admin emails from Firestore
  async function loadAdminEmails() {
    if (loaded) return adminEmails;

    try {
      const db = firebase.firestore(); // Ensure Firestore is initialized
      const snap = await db.collection("users")
        .where("role", "==", "admin")
        .get();

      adminEmails = snap.docs.map(doc => doc.data().email);
      loaded = true;
      console.log("✅ Loaded admin emails:", adminEmails);
      return adminEmails;
    } catch (err) {
      console.error("🔥 Error loading admin emails:", err);
      return [];
    }
  }

  // ✅ Check if a given user is admin
  async function isAdmin(user) {
    if (!user) return false;
    if (!loaded) await loadAdminEmails();
    return adminEmails.includes(user.email);
  }

  // ✅ Force reload of admin list (if roles change)
  async function refreshAdminEmails() {
    loaded = false;
    return await loadAdminEmails();
  }

  // ✅ Expose functions globally
  return {
    loadAdminEmails,
    isAdmin,
    refreshAdminEmails,
    get list() {
      return adminEmails;
    }
  };
})();
