const { isGamesEnabled, QUEEN_ID } = require("../utils/queenOrders");

function isPrivilegedSender(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  return (global.NeroBot?.config?.adminBot || []).map(String).includes(u);
}

const WORDS = [
  { word: "قمر",       cat: "فلك 🌙" },
  { word: "نجمة",      cat: "فلك 🌙" },
  { word: "شجرة",      cat: "طبيعة 🌿" },
  { word: "بحر",       cat: "طبيعة 🌿" },
  { word: "جبل",       cat: "طبيعة 🌿" },
  { word: "صحراء",     cat: "طبيعة 🌿" },
  { word: "فراشة",     cat: "حيوانات 🐾" },
  { word: "دلفين",     cat: "حيوانات 🐾" },
  { word: "تمساح",     cat: "حيوانات 🐾" },
  { word: "عقرب",      cat: "حيوانات 🐾" },
  { word: "فراولة",    cat: "فواكه 🍓" },
  { word: "برتقال",    cat: "فواكه 🍓" },
  { word: "موزة",      cat: "فواكه 🍓" },
  { word: "رمان",      cat: "فواكه 🍓" },
  { word: "مدرسة",     cat: "أماكن 🏫" },
  { word: "مطبخ",      cat: "أماكن 🏠" },
  { word: "مستشفى",   cat: "أماكن 🏥" },
  { word: "ملعب",      cat: "أماكن 🏟️" },
  { word: "سيارة",     cat: "وسائل نقل 🚗" },
  { word: "طيارة",     cat: "وسائل نقل ✈️" },
  { word: "دراجة",     cat: "وسائل نقل 🚲" },
  { word: "ثلاجة",     cat: "أجهزة 🏠" },
  { word: "تلفزيون",   cat: "أجهزة 📺" },
  { word: "طبيب",      cat: "مهن 👨‍⚕️" },
  { word: "معلم",      cat: "مهن 👨‍🏫" },
  { word: "مهندس",     cat: "مهن 👷" },
  { word: "طباخ",      cat: "مهن 👨‍🍳" },
  { word: "مغرب",      cat: "بلدان 🌍" },
  { word: "تونس",      cat: "بلدان 🌍" },
  { word: "فرنسا",     cat: "بلدان 🌍" },
  { word: "إسبانيا",   cat: "بلدان 🌍" },
  { word: "برازيل",    cat: "بلدان 🌍" },
  { word: "ملاكمة",    cat: "رياضة 🥊" },
  { word: "سباحة",     cat: "رياضة 🏊" },
  { word: "كركبة",     cat: "تراث مغربي 🇲🇦" },
  { word: "طاجين",     cat: "مطبخ مغربي 🍲" },
  { word: "كسكس",      cat: "مطبخ مغربي 🍲" },
  { word: "بسطيلة",    cat: "مطبخ مغربي 🍲" },
  { word: "قهوة",      cat: "مشروبات ☕" },
  { word: "عصير",      cat: "مشروبات 🥤" },
];

const MAX_LIVES = 6;
const activeGames = new Map();

function normalize(ch) {
  return ch.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
}

function buildDisplay(word, guessedNorm) {
  return [...word]
    .map(ch => {
      if (ch === " ") return "   ";
      return guessedNorm.has(normalize(ch)) ? ch : "＿";
    })
    .join(" ");
}

function isComplete(word, guessedNorm) {
  return [...word].every(ch => ch === " " || guessedNorm.has(normalize(ch)));
}

function livesBar(wrong) {
  const left = MAX_LIVES - wrong;
  return "❤️".repeat(left) + "🖤".repeat(wrong) + `  (${left} باقي${left === 1 ? "ة" : ""})`;
}

function registerReply(botMsgID, data) {
  global.NeroBot.onReply.set(botMsgID, { commandName: "شنقة", ...data, messageID: botMsgID });
}

module.exports = {
  config: {
    name: "شنقة",
    aliases: ["shanqa"],
    version: "1.0",
    author: "Nero",
    role: 0,
    shortDescription: "لعبة الشنقة — خمّن الكلمة حرفاً بحرف",
    longDescription: "البوت يختار كلمة من فئة معينة، ردّ بحرف واحد في كل مرة — عندك 6 حياة!",
    category: "game",
    guide: "{p}شنقة — يبدأ اللعبة\n{p}شنقة وقف — يوقف اللعبة",
    countDown: 5,
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    if (!isPrivilegedSender(senderID) && !isGamesEnabled()) return;

    const sub = (args[0] || "").trim();

    if (sub === "reset") {
      if (!isPrivilegedSender(senderID)) return;
      if (activeGames.has(threadID)) {
        const g = activeGames.get(threadID);
        activeGames.delete(threadID);
        global.NeroBot.onReply.delete(g.botMsgID);
        return api.sendMessage("🔄 لعبة الشنقة تريّضات — أي واحد يقدر يبدأ من جديد!", threadID, () => {}, messageID);
      }
      return api.sendMessage("ما كاينة حتى لعبة دايرة باش تريّض 😅", threadID, () => {}, messageID);
    }

    if (activeGames.has(threadID)) {
      const g = activeGames.get(threadID);
      const guessedNorm = new Set(g.guessedNorm);
      const display = buildDisplay(g.word, guessedNorm);
      return api.sendMessage(
        `⏳ كاينة لعبة شنقة دايرة!\n\n📂 ${g.cat}\n\n${display}\n\n${livesBar(g.wrong.length)}\n❌ غلط: ${g.wrong.join(" ") || "—"}\n\nردّ على رسالة اللعبة وكتب حرف!`,
        threadID, () => {}, messageID
      );
    }

    const pick = WORDS[Math.floor(Math.random() * WORDS.length)];
    const guessedNorm = new Set();
    const wrong = [];
    const display = buildDisplay(pick.word, guessedNorm);
    const letterCount = [...pick.word].filter(c => c !== " ").length;

    const text =
      `🎮 لعبة الشنقة!\n` +
      `📂 الفئة: ${pick.cat}\n` +
      `🔡 عدد الحروف: ${letterCount}\n\n` +
      `${display}\n\n` +
      `${livesBar(0)}\n` +
      `❌ أحرف غلط: —\n\n` +
      `ردّ برسالة وكتب حرف عربي واحد! 👇`;

    api.sendMessage(text, threadID, (err, info) => {
      if (err || !info?.messageID) return;
      const botMsgID = info.messageID;
      activeGames.set(threadID, { word: pick.word, cat: pick.cat, guessedNorm: [], wrong, botMsgID, starterID: senderID });
      registerReply(botMsgID, { threadID, word: pick.word, cat: pick.cat, guessedNorm: [], wrong, starterID: senderID });
    }, messageID);
  },

  onReply: async function ({ api, event, usersData }) {
    const { threadID, senderID, body, messageID } = event;
    const game = activeGames.get(threadID);
    if (!game) return;

    const letter = (body || "").trim();
    if (!letter || letter.length !== 1) {
      return api.sendMessage("⚠️ اكتب حرف واحد فقط!", threadID, (err, info) => {
        if (!err && info?.messageID) {
          game.botMsgID = info.messageID;
          registerReply(info.messageID, { threadID, word: game.word, cat: game.cat, guessedNorm: game.guessedNorm, wrong: game.wrong });
        }
      }, messageID);
    }

    const norm = normalize(letter);
    const guessedNorm = new Set(game.guessedNorm);
    const wrong = [...game.wrong];
    const { word, cat, botMsgID } = game;

    global.NeroBot.onReply.delete(botMsgID);

    if (guessedNorm.has(norm) || wrong.map(normalize).includes(norm)) {
      return api.sendMessage(`⚠️ "${letter}" خمّنتيه من قبل! جرب حرف آخر.`, threadID, (err, info) => {
        if (!err && info?.messageID) {
          game.botMsgID = info.messageID;
          registerReply(info.messageID, { threadID, word, cat, guessedNorm: [...guessedNorm], wrong });
        }
      }, messageID);
    }

    const wordHasLetter = [...word].some(ch => normalize(ch) === norm);

    if (wordHasLetter) {
      guessedNorm.add(norm);
      game.guessedNorm = [...guessedNorm];
      if (isComplete(word, guessedNorm)) {
        activeGames.delete(threadID);
        const REWARD = 80;
        let winnerName = "صاحبنا";
        try { winnerName = (await usersData.get(senderID, "name")) || winnerName; } catch (e) {}
        try { await usersData.addMoney(senderID, REWARD); } catch (e) {}
        let total = REWARD;
        try { total = (await usersData.get(senderID, "money")) || REWARD; } catch (e) {}
        api.setMessageReaction("🎉", messageID, () => {}, true);
        return api.sendMessage(
          `🏆 مبروك ${winnerName}!\n✅ الكلمة كانت: ${word}\n⭐ ربحتي ${REWARD} نجمة!\n💫 مجموع نجومك: ${total}`,
          threadID, () => {}, messageID
        );
      }
      const display = buildDisplay(word, guessedNorm);
      const text = `✅ حرف صح!\n\n📂 ${cat}\n\n${display}\n\n${livesBar(wrong.length)}\n❌ غلط: ${wrong.join(" ") || "—"}`;
      api.sendMessage(text, threadID, (err, info) => {
        if (!err && info?.messageID) {
          game.botMsgID = info.messageID;
          registerReply(info.messageID, { threadID, word, cat, guessedNorm: [...guessedNorm], wrong });
        }
      }, messageID);
    } else {
      wrong.push(letter);
      game.wrong = wrong;
      if (wrong.length >= MAX_LIVES) {
        activeGames.delete(threadID);
        api.setMessageReaction("😵", messageID, () => {}, true);
        return api.sendMessage(
          `💀 خسرتي — خلصات الحياة!\nالكلمة كانت: ${word} 😄\nجرب مرة أخرى مع /شنقة`,
          threadID, () => {}, messageID
        );
      }
      const display = buildDisplay(word, guessedNorm);
      const text = `❌ حرف غلط!\n\n📂 ${cat}\n\n${display}\n\n${livesBar(wrong.length)}\n❌ غلط: ${wrong.join(" ")}`;
      api.sendMessage(text, threadID, (err, info) => {
        if (!err && info?.messageID) {
          game.botMsgID = info.messageID;
          registerReply(info.messageID, { threadID, word, cat, guessedNorm: [...guessedNorm], wrong });
        }
      }, messageID);
    }
  },
};
