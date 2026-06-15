// كاش محلي: threadID → Set of adminIDs
const adminCache = new Map();

async function ensureCache(api, threadID) {
  if (adminCache.has(threadID)) return;
  try {
    const info = await new Promise((res, rej) =>
      api.getThreadInfo(threadID, (err, d) => err ? rej(err) : res(d))
    );
    const ids = (info.adminIDs || []).map(a => String(a.id || a));
    adminCache.set(threadID, new Set(ids));
  } catch (e) {
    adminCache.set(threadID, new Set());
  }
}

module.exports = {
  config: {
    name: "anticoup",
    version: "1.7",
    author: "NERO",
    category: "events",
  },

  onStart: async ({ api, event }) => {
    const { threadID, logMessageType, logMessageData } = event;
    if (!threadID || !logMessageType) return;

    const botID   = String(api.getCurrentUserID());
    const actorID = String(event.author || event.senderID || "");

    // ── تغيير في الادمنية ──
    if (logMessageType === "log:thread-admins") {
      const data     = logMessageData || {};
      const action   = String(data.admin_event || "").toLowerCase();
      const targetID = String(data.target_id   || "");

      // نحدّث الكاش
      if (targetID) {
        if (!adminCache.has(threadID)) adminCache.set(threadID, new Set());
        const set = adminCache.get(threadID);
        if (action === "add_admin")    set.add(targetID);
        if (action === "remove_admin") set.delete(targetID);
      }

      // انقلاب: ادمن حيّد ادمن آخر
      if (action !== "remove_admin") return;
      if (!actorID || actorID === botID) return;
      if (!targetID || targetID === botID) return;

      return async function () {
        try {
          await api.changeAdminStatus(threadID, [actorID], false);
          await api.sendMessage("هبط شكيت فيك باغي تدير انقلاب أ عدو الله 🤔🍆", threadID);
          adminCache.get(threadID)?.delete(actorID);
        } catch (e) {}
      };
    }

    // ── طرد شخص ──
    if (logMessageType === "log:unsubscribe") {
      if (!actorID || actorID === botID) return;

      const kickedID = String(logMessageData?.leftParticipantFbId || "");
      if (!kickedID || kickedID === actorID || kickedID === botID) return;

      // نتأكد الكاش موجود (نجيبو إذا ما كانش)
      await ensureCache(api, threadID);

      const admins = adminCache.get(threadID);
      // الشخص المطرود لازم كان ادمن
      if (!admins || !admins.has(kickedID)) return;

      return async function () {
        try {
          await api.changeAdminStatus(threadID, [actorID], false);
          await api.sendMessage("هبط شكيت فيك باغي تدير انقلاب أ عدو الله 🤔🍆", threadID);
          adminCache.get(threadID)?.delete(actorID);
        } catch (e) {}
      };
    }
  },
};
