const { setGamesEnabled, isGamesEnabled, QUEEN_ID } = require("../utils/queenOrders");

function isPrivilegedSender(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  return (global.NeroBot?.config?.adminBot || []).map(String).includes(u);
}

const GAMES_LIST = `🎮 قائمة الألعاب المتاحة:

1️⃣  /سؤال  — سؤال ثقافي عشوائي
2️⃣  /لغز   — حلّ اللغز
3️⃣  /خمن   — خمّن رقم بين 1 و100 في 7 محاولات
4️⃣  /شنقة  — خمّن الكلمة حرفاً بحرف (6 حياة)
5️⃣  /مناني — من أنا؟ شخصية مشهورة في 5 إشارات
6️⃣  /ايموجي — خمّن الفيلم أو الشيء من الإيموجيات

━━━━━━━━━━━━━━
💡 ألعاب الأرقام 3⃣4⃣5⃣6⃣: فقط من بدا اللعبة يجاوب
💡 ألعاب 1⃣2⃣: أي واحد يقدر يجاوب`;

module.exports = {
  config: {
    name: "العاب",
    aliases: ["al3ab", "games", "لعب"],
    version: "1.1",
    author: "Nero",
    role: 0,
    shortDescription: "قائمة الألعاب وتشغيل/إطفاء الألعاب",
    longDescription: "أي عضو يكتب /العاب ليشوف القائمة — المشرف يتحكم بـ on/off",
    category: "owner",
    guide: "{p}العاب — عرض قائمة الألعاب\n{p}العاب on | {p}العاب off",
    countDown: 0,
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    const sub = (args[0] || "").toLowerCase().trim();

    if (sub === "on") {
      if (!isPrivilegedSender(senderID)) return;
      setGamesEnabled(true);
      return api.sendMessage(
        `🎮 الألعاب مفتوحة للجميع!\n\n${GAMES_LIST}`,
        threadID, () => {}, messageID
      );
    }

    if (sub === "off") {
      if (!isPrivilegedSender(senderID)) return;
      setGamesEnabled(false);
      return api.sendMessage(
        "🔒 الألعاب واقفة دبا — غير المشرف يقدر يلعب",
        threadID, () => {}, messageID
      );
    }

    const status = isGamesEnabled() ? "🟢 مفتوحة" : "🔴 واقفة";
    const footer = isPrivilegedSender(senderID)
      ? `\n\n━━━━━━━━━━━━━━\n⚙️ حالة الألعاب: ${status}\n/العاب on — تفتح للجميع\n/العاب off — توقف للأعضاء`
      : `\n\n━━━━━━━━━━━━━━\n⚙️ حالة الألعاب: ${status}`;

    return api.sendMessage(
      GAMES_LIST + footer,
      threadID, () => {}, messageID
    );
  },
};
