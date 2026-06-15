module.exports = {
  config: {
    name: "back",
    aliases: [],
    version: "1.0",
    author: "NERO",
    role: 0,
    shortDescription: "إرجاع عضو مطرود للمجموعة",
    longDescription: "الادمن يرد على رسالة العضو ويكتب /back باش يرجعه",
    category: "moderation",
    guide: "{p}back (رد على رسالة العضو)",
  },

  onStart: async function ({ api, event, usersData, threadData, role }) {
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
      return api.sendMessage("رد على رسالة العضو اللي بغيت ترجعه ↩️", threadID, () => {}, messageID);
    }

    const targetID = event.messageReply.senderID;

    if (targetID === api.getCurrentUserID()) {
      return api.sendMessage("أنا مطرود؟ 😭", threadID, () => {}, messageID);
    }

    let targetName = "العضو";
    try { targetName = await usersData.get(targetID, "name") || "العضو"; } catch (e) {}

    try {
      await api.addUserToGroup(targetID, threadID);
      api.sendMessage(
        `رجع جاك عفو ملكي من عند لالاك وئام👸 \n— ${targetName}`,
        threadID,
        () => {},
        messageID
      );
    } catch (err) {
      console.error("[BACK] Error:", err);
      api.sendMessage("ماقدرتش نرجعه — شك أن البوت ادمن في المجموعة ⚠️", threadID, () => {}, messageID);
    }
  },
};
