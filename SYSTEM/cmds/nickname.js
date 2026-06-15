const { QUEEN_ID } = require("../utils/queenOrders");

function isPrivileged(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  const adminBot = global.NeroBot?.config?.adminBot || [];
  return adminBot.map(String).includes(u);
}

function getLocks() {
  if (!global.NeroBot._nickLocks) global.NeroBot._nickLocks = {};
  return global.NeroBot._nickLocks;
}

module.exports = {
  config: {
    name: "nickname",
    aliases: ["nick", "سمية", "لقب"],
    version: "2.0",
    author: "NERO",
    role: 0,
    shortDescription: "تغيير nickname لعضو في المجموعة مع قفل تلقائي",
    longDescription: "رد على رسالة العضو واكتب /nickname الاسم. /nick stop لإيقاف القفل.",
    category: "moderation",
    guide: "{pn} <الاسم الجديد> | {pn} stop — رد على رسالة العضو",
    priority: 1,
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    if (!isPrivileged(senderID)) {
      return api.sendMessage("هاد الأمر غير للادمن 🚫", threadID, () => {}, messageID);
    }

    if (!event.messageReply) {
      return api.sendMessage(
        "↩️ رد على رسالة الشخص اللي بغيتي تبدل ليه الاسم، وكتب:\n/nickname الاسم الجديد\n\nباش توقف القفل: /nick stop",
        threadID, () => {}, messageID
      );
    }

    const targetID = String(event.messageReply.senderID);
    const botID   = String(api.getCurrentUserID());
    const cmd     = args[0]?.toLowerCase().trim();

    if (targetID === botID) {
      return api.sendMessage("ماقادر نغير اسمي أنا 🤭", threadID, () => {}, messageID);
    }

    // ── /nick stop ──
    if (cmd === "stop" || cmd === "وقف" || cmd === "إيقاف") {
      const locks = getLocks();
      const key   = `${threadID}_${targetID}`;
      if (locks[key]) {
        delete locks[key];
        return api.sendMessage("✅ واخا، ما كنتبعوش الاسم ديالو من دابا 🔓", threadID, () => {}, messageID);
      }
      return api.sendMessage("هاد الشخص ما كانش عندو قفل nickname أصلاً 🤷", threadID, () => {}, messageID);
    }

    // ── /nick <اسم> ──
    const newNick = args.join(" ").trim();
    if (!newNick) {
      return api.sendMessage(
        "كتب الاسم الجديد بعد الأمر:\n/nickname المبرگض",
        threadID, () => {}, messageID
      );
    }

    try {
      await api.changeNickname(newNick, threadID, targetID);
      // حفظ القفل
      const locks = getLocks();
      locks[`${threadID}_${targetID}`] = newNick;
      return api.sendMessage(
        `✅ تبدل الاسم لـ "${newNick}" 🔒\nإلا حاول يرجع كنيتو، نرجعو أنا تلقائياً.\nباش توقف: /nick stop (رد على رسالتو)`,
        threadID, () => {}, messageID
      );
    } catch (err) {
      console.error("[NICKNAME] error:", err?.message || err);
      return api.sendMessage("ماقدرتش نبدل الاسم ⚠️ شك أن البوت عندو الصلاحيات الكافية", threadID, () => {}, messageID);
    }
  },
};
