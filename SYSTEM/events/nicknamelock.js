const fs = require("fs");

module.exports = {
  config: {
    name: "nicknamelock",
    version: "1.2",
    author: "NERO",
    category: "events",
  },

  onStart: async function ({ api, event }) {
    const { threadID, senderID } = event;
    const botID = String(api.getCurrentUserID());
    if (String(senderID) === botID) return;

    // ── قفل nickname ──
    if (event.logMessageType === "log:user-nickname") {
      const participantID = String(event.logMessageData?.participant_id || event.participant_id || "");
      const newNick       = event.logMessageData?.nickname ?? event.nickname ?? "";
      if (!participantID) return;

      const locks      = global.NeroBot?._nickLocks || {};
      const lockedNick = locks[`${threadID}_${participantID}`];
      if (!lockedNick || newNick === lockedNick) return;

      return async function () {
        await new Promise(r => setTimeout(r, 2500));
        try {
          await api.changeNickname(lockedNick, threadID, participantID);
        } catch (err) {
          console.error("[NICKLOCK] restore nickname:", err?.message || err);
        }
      };
    }

    // ── قفل اسم المجموعة ──
    if (event.logMessageType === "log:thread-name") {
      const newTitle    = event.logMessageData?.name ?? event.name ?? "";
      const titleLocks  = global.NeroBot?._titleLocks || {};
      const lockedTitle = titleLocks[threadID];
      if (!lockedTitle || newTitle === lockedTitle) return;

      return async function () {
        await new Promise(r => setTimeout(r, 3000));
        try {
          await api.setTitle(lockedTitle, threadID);
        } catch (err) {
          console.error("[TITLELOCK] restore title:", err?.message || err);
        }
      };
    }

    // ── قفل صورة المجموعة ──
    if (event.logMessageType === "log:thread-image") {
      const photoLocks = global.NeroBot?._photoLocks || {};
      const imgPath    = photoLocks[threadID];
      if (!imgPath) return;

      // منع اللوب: نحجز فوراً قبل ما نرجع الدالة
      if (!global.NeroBot._photolockRestoring) global.NeroBot._photolockRestoring = new Set();
      const restoring = global.NeroBot._photolockRestoring;
      if (restoring.has(threadID)) return;
      restoring.add(threadID);

      return async function () {
        await new Promise(r => setTimeout(r, 4000));
        try {
          if (fs.existsSync(imgPath)) {
            await api.changeGroupImage(fs.createReadStream(imgPath), threadID);
          }
          await new Promise(r => setTimeout(r, 1000));
          api.sendMessage("تا خلي ربو داك البروفايل 😡🖕👌👉", threadID);
        } catch (err) {
          console.error("[PHOTOLOCK] restore image:", err?.message || err);
        } finally {
          setTimeout(() => restoring.delete(threadID), 10000);
        }
      };
    }
  },
};
