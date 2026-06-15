const path = require("path");
const { ai, normalizeAnswer, makeHistoryStore } = require("../utils/gameHelpers");

const HIST = makeHistoryStore(path.join(__dirname, "tmp", "kalima_history.json"), 5000, "KALIMA");

const active = new Map();
const pending = new Set();
let gameEnabled = true;

const REWARD_LETTER = 5;
const REWARD_WORD = 80;
const MAX_WRONG = 7;
const TIMEOUT_MS = 180000;

const CATEGORIES = [
  "حيوان", "حيوان بحري", "طائر", "حشرة",
  "نبات", "شجرة", "فاكهة", "خضرة",
  "مهنة", "مدينة عربية", "مدينة عالمية", "دولة عربية", "دولة عالمية",
  "آلة موسيقية", "رياضة", "أداة منزلية", "أداة مطبخ",
  "أكلة شعبية مغربية", "أكلة عالمية", "حلوى", "مشروب",
  "ملابس", "وسيلة نقل", "كوكب", "نجم", "لون",
  "عضو من جسم الإنسان", "بحر أو محيط", "نهر",
  "آلة تكنولوجية", "أداة عمل", "حلية أو مجوهرات",
  "معدن", "حجر كريم", "نوع طقس",
];

async function genWord() {
  let tries = 0;
  while (tries < 6) {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const avoid = HIST.recent(40);
    const avoidNote = avoid.length ? `\n\nكلمات محظورة (لا تكررها): ${avoid.join("، ")}` : "";
    const prompt = `اعطني كلمة عربية واحدة من فئة "${cat}". الشروط:
- بين 4 و 9 حروف
- بدون "ال" التعريف
- كلمة واحدة فقط (بدون مسافات)
- مشهورة وشائعة
- بدون تشكيل

الشكل بالضبط:
الكلمة: [الكلمة]

سطر واحد فقط.${avoidNote}`;

    try {
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 200 },
      });
      const raw = (res.text || "").trim();
      const m = raw.match(/الكلمة\s*:\s*(.+)/);
      if (!m) {
        console.log(`[KALIMA] Bad format (try ${tries+1}): ${raw.slice(0,80)}`);
        tries++; continue;
      }
      let word = m[1].trim().split(/\s+/)[0];
      word = word.replace(/[\u064B-\u065F]/g, "").replace(/[^\u0600-\u06FF]/g, "");
      if (word.length < 4 || word.length > 12) {
        console.log(`[KALIMA] Bad length (try ${tries+1}): ${word}`);
        tries++; continue;
      }
      if (HIST.has(word)) {
        console.log(`[KALIMA] Duplicate (try ${tries+1}): ${word}`);
        tries++; continue;
      }
      HIST.add(word);
      console.log(`[KALIMA] Total stored: ${HIST.size()}`);
      return { word, category: cat };
    } catch (e) {
      console.log(`[KALIMA] Gen error (try ${tries+1}): ${e.message}`);
      tries++;
    }
  }
  throw new Error("فشل توليد كلمة بعد 6 محاولات");
}

function normLetter(ch) {
  return String(ch || "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه");
}

function display(word, guessed) {
  const out = [];
  for (const ch of word) {
    const n = normLetter(ch);
    if (guessed.has(n)) out.push(ch);
    else out.push("⬜");
  }
  return out.join(" ");
}

function isWordRevealed(word, guessed) {
  for (const ch of word) {
    if (!guessed.has(normLetter(ch))) return false;
  }
  return true;
}

function clearReplies(state) {
  for (const id of state.replyIDs) global.NeroBot.onReply.delete(id);
  state.replyIDs.clear();
}

function registerReply(state, messageID, threadID, senderID) {
  if (!messageID) return;
  clearReplies(state);
  global.NeroBot.onReply.set(messageID, {
    commandName: "كلمة", author: senderID, messageID, threadID,
  });
  state.replyIDs.add(messageID);
}

module.exports = {
  config: {
    name: "كلمة",
    aliases: ["hangman", "kalima"],
    version: "1.0",
    author: "Nero",
    role: 0,
    shortDescription: "لعبة الحروف الخفية",
    longDescription: "نيرو يخفي كلمة، الأعضاء يخمنوا حرف حرف. 7 أخطاء = خسارة!",
    category: "game",
    guide: "{p}كلمة",
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, senderID } = event;

    if (event.body === "/كلمة off") {
      gameEnabled = false;
      return api.sendMessage("⛔ لعبة الكلمة واقفة 👌", threadID, () => {}, messageID);
    }
    if (event.body === "/كلمة on") {
      gameEnabled = true;
      return api.sendMessage("✅ لعبة الكلمة رجعات", threadID, () => {}, messageID);
    }
    if (!gameEnabled) {
      return api.sendMessage("لعبة الكلمة واقفة دبا 👌", threadID, () => {}, messageID);
    }

    if (active.has(threadID) || pending.has(threadID)) {
      return api.sendMessage("⏳ كاينة كلمة دازية — كملوها أول!", threadID, () => {}, messageID);
    }

    pending.add(threadID);
    api.setMessageReaction("⏳", messageID, () => {}, true);

    let data;
    try { data = await genWord(); }
    catch (e) {
      pending.delete(threadID);
      console.error("[KALIMA] error:", e.message);
      return api.sendMessage("غلطة صغيرة، عاود من بعد 😅", threadID, () => {}, messageID);
    }

    const state = {
      word: data.word,
      category: data.category,
      guessed: new Set(),
      wrongLetters: new Set(),
      replyIDs: new Set(),
      botMsgID: null,
      timeout: null,
    };

    const intro = `🔤 لعبة الكلمة — فئة (${data.category})\n\n${display(data.word, state.guessed)}\n\n• ${data.word.length} حروف\n• ${MAX_WRONG} أخطاء = خسارة\n• رد على هاد الرسالة بحرف واحد للتخمين\n• ولا رد بالكلمة الكاملة لتربح كلشي\n• ${REWARD_LETTER} نجوم/حرف صحيح • ${REWARD_WORD} نجمة/كلمة كاملة\n\n(عندكم 3 دقايق ⏱️)`;

    api.sendMessage(intro, threadID, (err, info) => {
      if (err || !info?.messageID) {
        pending.delete(threadID);
        console.error("[KALIMA] sendMessage error:", err);
        return;
      }
      state.botMsgID = info.messageID;
      registerReply(state, info.messageID, threadID, senderID);

      state.timeout = setTimeout(() => {
        active.delete(threadID);
        clearReplies(state);
        api.sendMessage(`⌛ سال الوقت! الكلمة كانت: 🔑 ${data.word}`, threadID, () => {}, info.messageID);
      }, TIMEOUT_MS);

      pending.delete(threadID);
      active.set(threadID, state);
      console.log(`[KALIMA] Word registered: "${data.word}" | Cat: ${data.category}`);
    });

    api.setMessageReaction("✅", messageID, () => {}, true);
  },

  onReply: async function ({ api, event, usersData, Reply }) {
    const { threadID, senderID, body, messageID } = event;
    const state = active.get(threadID);
    if (!state) return;

    let guess = (body || "").replace(/[\u064B-\u065F]/g, "").trim();
    if (!guess) return;

    const wordNorm = normalizeAnswer(state.word);
    const guessNorm = normalizeAnswer(guess);

    if (guessNorm === wordNorm) {
      clearTimeout(state.timeout);
      active.delete(threadID);
      clearReplies(state);
      Reply.delete();
      try { await usersData.addMoney(senderID, REWARD_WORD); } catch(e){}
      let name = "صاحبنا"; try { name = (await usersData.get(senderID, "name")) || name; } catch(e){}
      let stars = 0; try { stars = (await usersData.get(senderID, "money")) || REWARD_WORD; } catch(e){}
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(
        `🎉 برافو ${name}!\n\n✅ الكلمة: ${state.word}\n⭐ ربحتي ${REWARD_WORD} نجمة كاملة!\n💫 المجموع: ${stars}`,
        threadID, () => {}, state.botMsgID
      );
    }

    const cleaned = guess.replace(/\s/g, "");
    if (cleaned.length > 2) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return;
    }

    const letter = normLetter(cleaned);
    if (!letter || !/[\u0600-\u06FF]/.test(letter)) {
      api.setMessageReaction("❓", messageID, () => {}, true);
      return;
    }

    if (state.guessed.has(letter)) {
      api.setMessageReaction("🔁", messageID, () => {}, true);
      return;
    }
    state.guessed.add(letter);

    let count = 0;
    for (const ch of state.word) if (normLetter(ch) === letter) count++;

    if (count > 0) {
      api.setMessageReaction("✅", messageID, () => {}, true);
      const reward = REWARD_LETTER * count;
      try { await usersData.addMoney(senderID, reward); } catch(e){}

      if (isWordRevealed(state.word, state.guessed)) {
        clearTimeout(state.timeout);
        active.delete(threadID);
        clearReplies(state);
        try { await usersData.addMoney(senderID, REWARD_WORD); } catch(e){}
        let name = "صاحبنا"; try { name = (await usersData.get(senderID, "name")) || name; } catch(e){}
        let stars = 0; try { stars = (await usersData.get(senderID, "money")) || REWARD_WORD; } catch(e){}
        return api.sendMessage(
          `🎉 ${name} كمل الكلمة!\n\n✅ الكلمة: ${state.word}\n⭐ +${reward} (حروف) +${REWARD_WORD} (إكمال)\n💫 المجموع: ${stars}`,
          threadID, () => {}, state.botMsgID
        );
      }

      api.sendMessage(
        `✅ الحرف "${letter}" صحيح! (×${count}) — +${reward} نجوم\n\n${display(state.word, state.guessed)}\n\n❌ أخطاء: ${state.wrongLetters.size}/${MAX_WRONG}\n📝 جرب: رد على هاد الرسالة بحرف جديد`,
        threadID, (err, info) => {
          if (info?.messageID) registerReply(state, info.messageID, threadID, senderID);
        }
      );
    } else {
      state.wrongLetters.add(letter);
      api.setMessageReaction("❌", messageID, () => {}, true);

      if (state.wrongLetters.size >= MAX_WRONG) {
        clearTimeout(state.timeout);
        active.delete(threadID);
        clearReplies(state);
        return api.sendMessage(
          `💀 خسرتوا! الكلمة كانت: 🔑 ${state.word}\n\nالحروف الغلط: ${[...state.wrongLetters].join("، ")}`,
          threadID, () => {}, state.botMsgID
        );
      }

      api.sendMessage(
        `❌ الحرف "${letter}" غير موجود!\n\n${display(state.word, state.guessed)}\n\n❌ أخطاء: ${state.wrongLetters.size}/${MAX_WRONG} (${[...state.wrongLetters].join("، ")})\n📝 رد على هاد الرسالة بحرف جديد`,
        threadID, (err, info) => {
          if (info?.messageID) registerReply(state, info.messageID, threadID, senderID);
        }
      );
    }
  },
};
