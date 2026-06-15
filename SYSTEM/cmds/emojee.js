const { isGamesEnabled, QUEEN_ID } = require("../utils/queenOrders");

function isPrivilegedSender(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  return (global.NeroBot?.config?.adminBot || []).map(String).includes(u);
}

const PUZZLES = [
  // أفلام
  { emoji: "🦁 👑", answer: "الأسد الملك", alt: ["lion king", "الاسد الملك"] },
  { emoji: "❄️ 👸 ⛄", answer: "فروزن", alt: ["frozen", "مجمدة"] },
  { emoji: "🕷️ 👦", answer: "سبايدرمان", alt: ["spiderman", "spider man", "رجل العنكبوت"] },
  { emoji: "🦇 🌃 🦸", answer: "باتمان", alt: ["batman", "رجل الوطواط"] },
  { emoji: "🤖 🚗 🔥", answer: "ترانسفورمرز", alt: ["transformers"] },
  { emoji: "🦖 🌴 🏃", answer: "جوراسيك بارك", alt: ["jurassic park", "jurassic world"] },
  { emoji: "🐠 🌊 🔍", answer: "البحث عن نيمو", alt: ["finding nemo", "نيمو"] },
  { emoji: "👸 🍎 ☠️", answer: "سنو وايت", alt: ["snow white", "بياض الثلج"] },
  { emoji: "🧞 🪔 ✨", answer: "علاء الدين", alt: ["aladdin", "علادين"] },
  { emoji: "🧙 💍 🏔️", answer: "سيد الخواتم", alt: ["lord of the rings", "the lord of the rings"] },
  { emoji: "🦸 ⚡ 🔨", answer: "ثور", alt: ["thor"] },
  { emoji: "🦸 🛡️ ⭐", answer: "كابتن أمريكا", alt: ["captain america"] },
  { emoji: "🐭 🧀 🏰", answer: "ميكي ماوس", alt: ["mickey mouse"] },
  { emoji: "🚀 👨‍🚀 ♾️", answer: "باز لايتير", alt: ["buzz lightyear", "toy story"] },
  { emoji: "🐟 🐠 🌊 🔍", answer: "البحث عن دوري", alt: ["finding dory", "دوري"] },
  { emoji: "🌹 👸 🐗", answer: "الجميلة والوحش", alt: ["beauty and the beast", "la belle et la bete"] },
  // ألعاب فيديو
  { emoji: "🍄 👨‍🔧 ⭐", answer: "ماريو", alt: ["mario", "super mario"] },
  { emoji: "⚡ 🐭 🔴 ⚪", answer: "بيكاتشو", alt: ["pikachu", "pokemon", "بوكيمون"] },
  // مسلسلات وكرتون
  { emoji: "🟡 👨 🍩 🏠", answer: "عائلة سيمبسون", alt: ["the simpsons", "simpsons", "سيمبسون"] },
  { emoji: "🧽 🏠 🌊", answer: "سبونج بوب", alt: ["spongebob", "sponge bob", "بوب الإسفنج"] },
  { emoji: "🐻 🍯 🌳", answer: "ويني ذا بو", alt: ["winnie the pooh", "winnie", "بو"] },
  { emoji: "🐻 🌡️ 🩺", answer: "دكتورة ألعاب", alt: ["doc mcstuffins"] },
  // أغاني / موسيقى
  { emoji: "🎤 💃 👑", answer: "بيونسيه", alt: ["beyonce", "beyoncé"] },
  { emoji: "🎸 ⚡ 🤘", answer: "ميتاليكا", alt: ["metallica"] },
  // أشياء وتجارب مغربية
  { emoji: "🫖 🌿 🍬", answer: "أتاي", alt: ["اتاي", "شاي", "atay", "tea"] },
  { emoji: "🏋️ 🌙 🌟", answer: "رمضان", alt: ["ramadan", "شهر رمضان"] },
  { emoji: "🛕 ⭐ 🌙 🇲🇦", answer: "مراكش", alt: ["marrakesh", "marrakech"] },
  { emoji: "🐪 🌅 🏜️", answer: "الصحراء", alt: ["desert", "الصحراء المغربية"] },
  { emoji: "⚽ 🦁 🏆", answer: "المنتخب المغربي", alt: ["atlas lions", "الأسود", "المغرب"] },
  // شخصيات
  { emoji: "🕵️ 🔍 🎩", answer: "شيرلوك هولمز", alt: ["sherlock holmes", "sherlock"] },
  { emoji: "🧛 🩸 🌙", answer: "دراكولا", alt: ["dracula", "فامبير"] },
  { emoji: "👩 🕸️ 🦸", answer: "وندر وومان", alt: ["wonder woman"] },
];

const MAX_HINTS = 2;
const activeGames = new Map();

const HINTS = [
  (p) => `💡 إشارة: الجواب فيه ${[...p.answer].length} حرف`,
  (p) => `💡 الحرف الأول هو: "${[...p.answer][0]}"`,
];

function normAnswer(str) {
  return str
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function checkAnswer(input, puzzle) {
  const n = normAnswer(input || "");
  if (normAnswer(puzzle.answer) === n) return true;
  return (puzzle.alt || []).some(a => normAnswer(a) === n);
}

function registerReply(botMsgID, data) {
  global.NeroBot.onReply.set(botMsgID, { commandName: "ايموجي", ...data, messageID: botMsgID });
}

module.exports = {
  config: {
    name: "ايموجي",
    aliases: ["emoji", "emojee"],
    version: "1.0",
    author: "Nero",
    role: 0,
    shortDescription: "خمّن الفيلم أو الشيء من الإيموجيات!",
    longDescription: "البوت يعرض إيموجيات تمثل فيلماً أو شيئاً معروفاً — خمّن ما هو!",
    category: "game",
    guide: "{p}ايموجي — يبدأ لعبة الإيموجي\n{p}ايموجي وقف — يوقف اللعبة",
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
        return api.sendMessage("🔄 لعبة الإيموجي تريّضات — أي واحد يقدر يبدأ من جديد!", threadID, () => {}, messageID);
      }
      return api.sendMessage("ما كاينة حتى لعبة دايرة باش تريّض 😅", threadID, () => {}, messageID);
    }

    if (activeGames.has(threadID)) {
      return api.sendMessage("⏳ كاينة لعبة إيموجي دايرة — ردّ على رسالة اللعبة وخمّن!", threadID, () => {}, messageID);
    }

    const puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    const hintIdx = 0;

    const text =
      `🎭 خمّن من الإيموجيات!\n\n` +
      `${puzzle.emoji}\n\n` +
      `❓ شنو كيمثّل هاد الإيموجيات؟\n` +
      `ردّ بجوابك 👇\n` +
      `(عندك ${MAX_HINTS} إشارات إلا محتجتيهم)`;

    api.sendMessage(text, threadID, (err, info) => {
      if (err || !info?.messageID) return;
      activeGames.set(threadID, { puzzle, hintIdx, botMsgID: info.messageID, starterID: senderID });
      registerReply(info.messageID, { threadID, puzzle, hintIdx, starterID: senderID });
    }, messageID);
  },

  onReply: async function ({ api, event, usersData }) {
    const { threadID, senderID, body, messageID } = event;
    const game = activeGames.get(threadID);
    if (!game) return;

    const { puzzle, botMsgID } = game;
    global.NeroBot.onReply.delete(botMsgID);

    if (checkAnswer(body, puzzle)) {
      activeGames.delete(threadID);
      const REWARD = 60;
      let name = "صاحبنا";
      try { name = (await usersData.get(senderID, "name")) || name; } catch (e) {}
      try { await usersData.addMoney(senderID, REWARD); } catch (e) {}
      let total = REWARD;
      try { total = (await usersData.get(senderID, "money")) || REWARD; } catch (e) {}
      api.setMessageReaction("🎉", messageID, () => {}, true);
      return api.sendMessage(
        `🎉 مبروك ${name}!\n✅ الجواب الصحيح: ${puzzle.answer}\n⭐ ربحتي ${REWARD} نجمة!\n💫 مجموع نجومك: ${total}`,
        threadID, () => {}, messageID
      );
    }

    const nextHintIdx = game.hintIdx + 1;

    if (nextHintIdx > MAX_HINTS) {
      activeGames.delete(threadID);
      api.setMessageReaction("😵", messageID, () => {}, true);
      return api.sendMessage(
        `😵 الجواب كان: ${puzzle.answer}\nجرب مرة أخرى مع /ايموجي`,
        threadID, () => {}, messageID
      );
    }

    game.hintIdx = nextHintIdx;
    const hint = HINTS[nextHintIdx - 1](puzzle);
    const text =
      `❌ غلط!\n\n${puzzle.emoji}\n\n${hint}\n\nردّ بجوابك 👇`;

    api.sendMessage(text, threadID, (err, info) => {
      if (!err && info?.messageID) {
        game.botMsgID = info.messageID;
        registerReply(info.messageID, { threadID, puzzle, hintIdx: nextHintIdx });
      }
    }, messageID);
  },
};
