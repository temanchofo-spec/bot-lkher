const { QUEEN_ID } = require("../utils/queenOrders");

// نظام قفل الكنيات
const nicknameLockers = new Map();

function isPrivileged(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  const adminBot = global.NeroBot?.config?.adminBot || [];
  return adminBot.map(String).includes(u);
}

function getNicknameLock(threadID) {
  return nicknameLockers.get(threadID);
}

function setNicknameLock(threadID, nick, members, api) {
  nicknameLockers.set(threadID, { nick, members: new Set(members), api });
}

function removeLock(threadID) {
  nicknameLockers.delete(threadID);
}

global.NeroBot = global.NeroBot || {};
global.NeroBot.getNicknameLock = getNicknameLock;
global.NeroBot.setNicknameLock = setNicknameLock;
global.NeroBot.removeLock = removeLock;

module.exports = {
  config: {
    name: "nickall",
    aliases: ["كنيةكلشي", "كنيات", "كنية_كلشي", "nicknameall"],
    version: "2.0",
    author: "NERO",
    role: 0,
    shortDescription: "تعيين كنية لجميع أعضاء المجموعة مع القفل التلقائي",
    longDescription: "اكتب /nickall الاسم لتعيين نفس الكنية لجميع الأعضاء (ماعدا المشرف). البوت يعيد الكنية تلقائياً إذا تغيرت.",
    category: "moderation",
    guide: "{p}nickall <الاسم>",
    priority: 1,
  },

  onStart: async function ({ api, event, args, threadData }) {
    const { threadID, messageID, senderID } = event;

    if (!isPrivileged(senderID)) {
      return api.sendMessage(
        "هاد الأمر غير للمشرفين 🚫",
        threadID,
        () => {},
        messageID
      );
    }

    const newNick = args.join(" ").trim();
    if (!newNick) {
      return api.sendMessage(
        "❌ كتب الاسم الجديد:\n/كنية كلشي اسم الكنية",
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
      console.error("[NICKNAMEALL] Error getting members:", err.message);
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
    let failCount = 0;
    let skippedCount = 0;
    const lockedMembers = [];

    // احصل على معلومات الأعضاء مرة واحدة
    let userInfoMap = {};
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      if (threadInfo.userInfo) {
        for (const user of threadInfo.userInfo) {
          userInfoMap[String(user.id)] = user;
        }
      }
    } catch (err) {
      console.warn("[NICKNAMEALL] Could not fetch userInfo:", err.message);
    }

    for (const memberID of members) {
      const mid = String(memberID);

      if (mid === botID || mid === queenID) {
        continue;
      }

      try {
        const memberInfo = userInfoMap[mid];
        
        // إذا كانت الكنية الحالية = الكنية الجديدة، تجاوزها
        if (memberInfo && memberInfo.nickname === newNick) {
          skippedCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        await api.changeNickname(newNick, threadID, memberID);
        lockedMembers.push(mid);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`[NICKNAMEALL] Error changing nickname for ${memberID}:`, err.message);
        failCount++;
      }
    }

    setNicknameLock(threadID, newNick, lockedMembers, api);

    const totalProcessed = successCount + failCount;
    let msg = `✅ تم تطبيق الكنية "${newNick}"\n`;
    msg += `📊 نجح: ${successCount}/${totalProcessed}`;

    if (skippedCount > 0) {
      msg += `\n⏭️ تم تجاوز: ${skippedCount} (كانوا يملكون نفس الكنية)`;
    }

    if (failCount > 0) {
      msg += `\n⚠️ فشل: ${failCount}`;
    }

    msg += `\n🔒 قفل الكنيات مفعّل - سيتم إعادتها تلقائياً إذا تغيرت\n`;
    msg += `⏹️ لإيقاف القفل: /حبس الكنيات`;

    return api.sendMessage(msg, threadID, () => {}, messageID);
  },
};
