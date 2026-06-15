const { QUEEN_ID } = require("../utils/queenOrders");

function isPrivileged(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  const adminBot = global.NeroBot?.config?.adminBot || [];
  return adminBot.map(String).includes(u);
}

module.exports = {
  config: {
    name: "stopnick",
    aliases: ["حبس_الكنيات", "حبسالكنيات", "nicksoff"],
    version: "1.0",
    author: "NERO",
    role: 0,
    shortDescription: "إيقاف قفل الكنيات",
    longDescription: "إيقاف نظام قفل الكنيات الذي يعيد الكنيات تلقائياً",
    category: "moderation",
    guide: "{p}حبس الكنيات",
    priority: 1,
  },

  onStart: async function ({ api, event, messageID }) {
    const { threadID, senderID } = event;

    if (!isPrivileged(senderID)) {
      return api.sendMessage(
        "هاد الأمر غير للمشرفين 🚫",
        threadID,
        () => {},
        messageID
      );
    }

    const removeLock = global.NeroBot?.removeLock;
    const getNicknameLock = global.NeroBot?.getNicknameLock;

    if (!getNicknameLock || !removeLock) {
      return api.sendMessage(
        "❌ نظام الكنيات غير مفعّل",
        threadID,
        () => {},
        messageID
      );
    }

    const lock = getNicknameLock(threadID);
    if (!lock) {
      return api.sendMessage(
        "❌ لا يوجد قفل كنيات قيد التشغيل في هذه المجموعة",
        threadID,
        () => {},
        messageID
      );
    }

    removeLock(threadID);

    return api.sendMessage(
      "✅ تم إيقاف قفل الكنيات\n🔓 الأعضاء يمكنهم تغيير كنياتهم الآن",
      threadID,
      () => {},
      messageID
    );
  },
};
