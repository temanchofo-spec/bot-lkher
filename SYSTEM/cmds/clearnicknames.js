const { QUEEN_ID } = require("../utils/queenOrders");

function isPrivileged(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  const adminBot = global.NeroBot?.config?.adminBot || [];
  return adminBot.map(String).includes(u);
}

module.exports = {
  config: {
    name: "clearnick",
    aliases: ["مسح_الكنيات", "مسحالكنيات", "nickclear"],
    version: "1.0",
    author: "NERO",
    role: 0,
    shortDescription: "مسح جميع كنيات أعضاء المجموعة",
    longDescription: "حذف جميع الكنيات من أعضاء المجموعة (يتجاوز من لا يملكون كنية)",
    category: "moderation",
    guide: "{p}مسح الكنيات",
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

    const botID = String(api.getCurrentUserID());
    const queenID = String(QUEEN_ID);

    let members = [];
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      members = threadInfo.participantIDs || [];
    } catch (err) {
      console.error("[CLEARNICK] Error getting members:", err.message);
      return api.sendMessage(
        "❌ ماقدرتش نحصل على قائمة الأعضاء",
        threadID,
        () => {},
        messageID
      );
    }

    if (members.length === 0) {
      return api.sendMessage(
        "❌ المجموعة فاضية من الأعضاء",
        threadID,
        () => {},
        messageID
      );
    }

    let successCount = 0;
    let skippedCount = 0;
    let failCount = 0;

    for (const memberID of members) {
      const mid = String(memberID);

      if (mid === botID || mid === queenID) {
        continue;
      }

      try {
        const threadInfo = await api.getThreadInfo(threadID);
        const memberInfo = threadInfo.userInfo?.find(u => String(u.id) === mid);
        
        // إذا لم يكن للعضو كنية، تجاوزه
        if (!memberInfo?.nickname) {
          skippedCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        // حذف الكنية (تمريرها كـ empty string أو null)
        await api.changeNickname("", threadID, memberID);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`[CLEARNICK] Error clearing nickname for ${memberID}:`, err.message);
        failCount++;
      }
    }

    const totalProcessed = successCount + failCount;
    let msg = `✅ تم مسح الكنيات\n`;
    msg += `🗑️ تم حذف: ${successCount}/${totalProcessed}`;

    if (skippedCount > 0) {
      msg += `\n⏭️ تم تجاوز: ${skippedCount} (لم تكن لديهم كنيات)`;
    }

    if (failCount > 0) {
      msg += `\n⚠️ فشل: ${failCount}`;
    }

    return api.sendMessage(msg, threadID, () => {}, messageID);
  },
};
