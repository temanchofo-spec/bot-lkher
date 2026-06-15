module.exports = {
  config: {
    name: "ترتيب",
    aliases: ["tartib", "top", "leaderboard", "نجوم"],
    version: "1.1",
    author: "NERO",
    role: 0,
    shortDescription: "ترتيب النجوم",
    longDescription: "يعرض أكثر الأعضاء نجوماً في لعبة الأسئلة",
    category: "game",
    guide: "{p}ترتيب",
  },

  onStart: async function ({ api, event, usersData }) {
    const { threadID, senderID, messageID } = event;

    let raw = [];
    try {
      raw = await usersData.getAll();
    } catch (e) {
      console.error("[TARTIB] getAll error:", e.message);
      raw = global.db.allUserData || [];
    }

    const ranked = raw
      .map((u) => ({
        userID: String(u.userID),
        name: u.name,
        money: Number(u.money) || 0,
      }))
      .filter((u) => u.money > 0)
      .sort((a, b) => {
        if (b.money !== a.money) return b.money - a.money;
        return a.userID.localeCompare(b.userID);
      });

    if (ranked.length === 0) {
      return api.sendMessage(
        "⭐ ما كاين حتى واحد ربح نجوم بعد!\nاكتب /سؤال وبدا اللعبة 🎯",
        threadID,
        () => {},
        messageID
      );
    }

    const top = ranked.slice(0, 10);
    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

    const lines = top.map((u, i) => {
      const name = u.name || `مجهول (${u.userID})`;
      return `${medals[i]} ${name} — ⭐ ${u.money} نجمة`;
    });

    let footer = `\n\n👥 المجموع: ${ranked.length} لاعب`;

    if (senderID) {
      const myIdx = ranked.findIndex((u) => u.userID === String(senderID));
      if (myIdx >= 10) {
        const me = ranked[myIdx];
        footer += `\n📍 ترتيبك: #${myIdx + 1} — ⭐ ${me.money} نجمة`;
      }
    }

    const text = `🏆 ترتيب النجوم:\n\n${lines.join("\n")}${footer}\n\n🎯 العب /سؤال وزيد نجومك!`;
    return api.sendMessage(text, threadID, () => {}, messageID);
  },
};
