const { setChatEnabled, isChatEnabled, setThreadSilent } = require("../utils/queenOrders");

module.exports = {
  config: {
    name: "دردشة",
    aliases: ["dardacha", "chat"],
    version: "1.1",
    author: "Nero",
    role: 0,
    shortDescription: "تشغيل/إطفاء دردشة نيرو مع الأعضاء",
    longDescription: "تتحكم حياة في وقت ينطق فيه نيرو مع الأعضاء.",
    category: "owner",
    guide: "{p}دردشة on | {p}دردشة off",
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const sub = (args[0] || "").toLowerCase();

    if (sub === "on") {
      setChatEnabled(true);
      setThreadSilent(threadID, false);
      return api.sendMessage(
        "👑 لالة وئام سمحت ليا نهدر معكم 🌹",
        threadID, () => {}, messageID
      );
    }

    if (sub === "off") {
      setChatEnabled(false);
      return api.sendMessage(
        "🤐 سالات ساعتكم — لالة وئام آمرتني نسكت 👑",
        threadID, () => {}, messageID
      );
    }

    const status = isChatEnabled() ? "🟢 خدامة" : "🔴 واقفة";
    return api.sendMessage(
      `حالة الدردشة دبا: ${status}\n\nالاستعمال:\n/دردشة on — نرجع نهدر مع الأعضاء\n/دردشة off — نسكت تماماً`,
      threadID, () => {}, messageID
    );
  },
};
