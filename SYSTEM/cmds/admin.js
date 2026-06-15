module.exports = {
  config: {
    name: "admin",
    aliases: ["ادمن"],
    version: "1.0",
    author: "NERO",
    role: 0,
    shortDescription: "إضافة أو إزالة ادمن",
    longDescription: "الادمن يرد على رسالة عضو ويكتب /admin لإضافته أو /admin off لإزالته",
    category: "moderation",
    guide: "{p}admin | {p}admin off",
  },

  onStart: async function ({ api, event, args, usersData, threadData, role }) {
    const { threadID, messageID, senderID } = event;

    if (!event.isGroup) {
      return api.sendMessage("هاد الأمر غير للمجموعات 🚫", threadID, () => {}, messageID);
    }

    const isAdmin = role >= 1 ||
      (threadData?.adminIDs || []).some(a => (a.id || a) === senderID);

    if (!isAdmin) {
      return api.sendMessage("راك مادير ادمن باش تدير هادا 🚫", threadID, () => {}, messageID);
    }

    if (!event.messageReply) {
      return api.sendMessage(
        "رد على رسالة العضو اللي بغيت تزيده أو تحيده من الادمن ↩️",
        threadID, () => {}, messageID
      );
    }

    const targetID = event.messageReply.senderID;

    if (targetID === api.getCurrentUserID()) {
      return api.sendMessage("أنا ادمن أصلاً 😎", threadID, () => {}, messageID);
    }

    let targetName = "العضو";
    try { targetName = await usersData.get(targetID, "name") || "العضو"; } catch (e) {}

    const removing = args[0]?.toLowerCase() === "off";

    try {
      await api.changeAdminStatus(threadID, [targetID], !removing);

      if (!removing) {
        api.sendMessage(
          `✅ ${targetName} دبا ادمن في المجموعة 👑`,
          threadID, () => {}, messageID
        );
      } else {
        api.sendMessage(
          `❌ تحيد ${targetName} من الادمن`,
          threadID, () => {}, messageID
        );
      }
    } catch (err) {
      console.error("[ADMIN] Error:", err);
      api.sendMessage(
        "ماقدرتش — شك أن البوت ادمن في المجموعة ⚠️",
        threadID, () => {}, messageID
      );
    }
  },
};
