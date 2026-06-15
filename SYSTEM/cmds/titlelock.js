const { QUEEN_ID } = require("../utils/queenOrders");

function isPrivileged(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  const adminBot = global.NeroBot?.config?.adminBot || [];
  return adminBot.map(String).includes(u);
}

function getTitleLocks() {
  if (!global.NeroBot._titleLocks) global.NeroBot._titleLocks = {};
  return global.NeroBot._titleLocks;
}

module.exports = {
  config: {
    name: "tt",
    aliases: ["title", "اسم"],
    version: "1.0",
    author: "NERO",
    role: 0,
    shortDescription: "قفل اسم المجموعة ضد التغيير",
    longDescription: "يقفل اسم المجموعة — إذا غيره أحد البوت يرجعه خلال 3 ",
    category: "moderation",
    guide: "{pn} lock <الاسم> | {pn} unlock",
    priority: 1,
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    if (!isPrivileged(senderID)) {
      return api.sendMessage("هاد الأمر غير للادمن 🚫", threadID, () => {}, messageID);
    }

    const sub  = args[0]?.toLowerCase().trim();
    const rest = args.slice(1).join(" ").trim();

    // /title unlock
    if (sub === "stp" || sub === "stop" || sub === "وقف" || sub === "إيقاف") {
      const locks = getTitleLocks();
      if (locks[threadID]) {
        delete locks[threadID];
        return api.sendMessage("لالة وئام قالت ليا نحيد القفل أوامرها تانبطقها👌 ", threadID, () => {}, messageID);
      }
      return api.sendMessage("اسم المجموعة ما كانش مقفول أصلاً 🤷", threadID, () => {}, messageID);
    }

    // /tt lock <اسم>
    if (sub === "lock" || sub === "قفل" || sub === "سمي" || sub === "دير") {
      if (!rest) {
        return api.sendMessage(
          "كتب الاسم اللي تبغي تقفلو:\n/title lock احلى لمة",
          threadID, () => {}, messageID
        );
      }
      try {
        await api.setTitle(rest, threadID);
        getTitleLocks()[threadID] = rest;
        return api.sendMessage(
          `✅ اسم المجموعة قفلت عليه تطبيقا لاوامر لالة وئام "${rest}" 🔒\nإلا حاول أي واحد يبدلو، كنرجعو أنا خلال 3 ثواني.\n\nباش توقف: /title unlock`,
          threadID, () => {}, messageID
        );
      } catch (err) {
        console.error("[TITLELOCK] error:", err?.message || err);
        return api.sendMessage("ماقدرتش نبدل الاسم ⚠️ شك أن البوت عندو الصلاحيات الكافية", threadID, () => {}, messageID);
      }
    }

    // مساعدة
    return api.sendMessage(
      "📌 أوامر قفل اسم المجموعة:\n\n" +
      "/title lock أحلى لمة— تقفل الاسم\n" +
      "/title unlock — توقف القفل",
      threadID, () => {}, messageID
    );
  },
};
