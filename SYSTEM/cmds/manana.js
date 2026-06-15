const path = require("path");
const { ai, isCorrect, displayAnswer, makeHistoryStore } = require("../utils/gameHelpers");

const HIST = makeHistoryStore(path.join(__dirname, "tmp", "manana_history.json"), 5000, "MANANA");

const active = new Map();
const pending = new Set();
let gameEnabled = true;

const HINT_INTERVAL = 8000;
const TIMEOUT_MS = 50000;
const REWARDS = [120, 90, 60, 40, 25];

const CATEGORIES = [
  "لاعب كرة قدم عالمي مشهور", "لاعب كرة قدم مغربي مشهور", "لاعب كرة قدم عربي مشهور",
  "ممثل عالمي مشهور (هوليود)", "ممثل عربي مشهور", "ممثلة عالمية مشهورة",
  "مغني عالمي مشهور", "مغني عربي مشهور", "مغنية عالمية مشهورة",
  "عالم تاريخي مشهور", "مخترع مشهور", "فيلسوف مشهور",
  "زعيم سياسي حديث", "إمبراطور أو ملك تاريخي",
  "شخصية إسلامية مشهورة", "شخصية من التاريخ المغربي", "شخصية أندلسية مشهورة",
  "شخصية كرتون من ديزني", "شخصية أنمي ياباني مشهورة", "شخصية من سبيستون",
  "شخصية من أفلام مارفل", "شخصية من حرب النجوم", "شخصية من هاري بوتر",
  "بطل رواية أدبية كلاسيكية", "كاتب مشهور", "شاعر عربي مشهور",
  "رياضي أولمبي مشهور", "ملاكم مشهور", "مصارع WWE مشهور",
  "فنان تشكيلي مشهور", "موسيقي كلاسيكي مشهور",
  "رائد فضاء مشهور", "مكتشف جغرافي تاريخي",
  "مؤسس شركة تكنولوجية حديثة", "مليونير أو مليارديرعالمي",
  "شخصية من مسلسل تركي مشهور", "شخصية من مسلسل عربي مشهور",
  "مدرب كرة قدم مشهور", "حكم رياضي مشهور",
  "صحابي من الصحابة", "نبي من الأنبياء",
  "شخصية تاريخية فرعونية", "شخصية من الحضارة الرومانية",
];

async function genCharacter() {
  let tries = 0;
  while (tries < 5) {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const avoid = HIST.recent(40);
    const avoidNote = avoid.length
      ? `\n\nشخصيات محظورة (لا تكررها):\n${avoid.map((q,i)=>`${i+1}. ${q}`).join("\n")}`
      : "";
    const prompt = `اختر شخصية حقيقية أو خيالية مشهورة جداً من فئة "${cat}". أعطني 5 تلميحات تدريجية بحال هذي:
- التلميح 1: صعب جداً وعام
- التلميح 2: أقل صعوبة
- التلميح 3: متوسط
- التلميح 4: واضح
- التلميح 5: واضح جداً (لكن لا تذكر الاسم أبداً)

ممنوع تذكر الاسم في أي تلميح. التلميحات قصيرة (سطر لكل تلميح).

في سطر الاسم: اكتب الاسم مع البدائل المقبولة مفصولة بـ | (مثلاً: ميسي | ليونيل ميسي | Lionel Messi).

الشكل بالضبط:
الاسم: [اسم1] | [اسم2] | [اسم3]
تلميح1: ...
تلميح2: ...
تلميح3: ...
تلميح4: ...
تلميح5: ...

فقط هذه الأسطر السبعة.${avoidNote}`;

    try {
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 1000 },
      });
      const raw = (res.text || "").trim();
      const am = raw.match(/الاسم\s*:\s*(.+)/);
      const hints = [];
      for (let i = 1; i <= 5; i++) {
        const m = raw.match(new RegExp(`تلميح\\s*${i}\\s*:\\s*(.+)`));
        if (m) hints.push(m[1].trim());
      }
      if (!am || hints.length < 5) {
        console.log(`[MANANA] Bad format (try ${tries+1}): ${raw.slice(0,150)}`);
        tries++; continue;
      }
      const answer = am[1].trim();
      const id = `${cat}::${answer}`;
      if (HIST.has(id)) {
        console.log(`[MANANA] Duplicate (try ${tries+1}): ${id}`);
        tries++; continue;
      }
      HIST.add(id);
      console.log(`[MANANA] Total stored: ${HIST.size()}`);
      return { answer, hints, category: cat };
    } catch (e) {
      console.log(`[MANANA] Gen error (try ${tries+1}): ${e.message}`);
      tries++;
    }
  }
  throw new Error("فشل توليد شخصية بعد 5 محاولات");
}

module.exports = {
  config: {
    name: "من_أنا",
    aliases: ["whoami", "manana", "من-أنا", "منانا", "mananaa"],
    version: "1.0",
    author: "Nero",
    role: 0,
    shortDescription: "خمن الشخصية",
    longDescription: "نيرو يفكر في شخصية ويعطي 5 تلميحات تدريجية. خمن قبل ما يكمل!",
    category: "game",
    guide: "{p}من_أنا",
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, senderID } = event;

    if (event.body === "/من_أنا off") {
      gameEnabled = false;
      return api.sendMessage("⛔ لعبة من أنا واقفة 👌", threadID, () => {}, messageID);
    }
    if (event.body === "/من_أنا on") {
      gameEnabled = true;
      return api.sendMessage("✅ لعبة من أنا رجعات", threadID, () => {}, messageID);
    }
    if (!gameEnabled) {
      return api.sendMessage("لعبة من أنا واقفة دبا 👌", threadID, () => {}, messageID);
    }

    if (active.has(threadID) || pending.has(threadID)) {
      return api.sendMessage("⏳ كاينة شخصية دازية — جاوب أول!", threadID, () => {}, messageID);
    }

    pending.add(threadID);
    api.setMessageReaction("⏳", messageID, () => {}, true);

    let data;
    try { data = await genCharacter(); }
    catch (e) {
      pending.delete(threadID);
      console.error("[MANANA] error:", e.message);
      return api.sendMessage("غلطة صغيرة، عاود من بعد 😅", threadID, () => {}, messageID);
    }

    const intro = `🎭 من أنا؟ (${data.category})\n\n💡 تلميح 1/5:\n${data.hints[0]}\n\n⭐ النقاط تنقص كل ما زاد التلميح!\n• تلميح 1 → 120 نجمة\n• تلميح 2 → 90 نجمة\n• تلميح 3 → 60 نجمة\n• تلميح 4 → 40 نجمة\n• تلميح 5 → 25 نجمة\n\n(${TIMEOUT_MS/1000} ثانية كاملة ⏱️)`;

    api.sendMessage(intro, threadID, (err, info) => {
      if (err || !info?.messageID) {
        pending.delete(threadID);
        console.error("[MANANA] sendMessage error:", err);
        return;
      }
      const botMsgID = info.messageID;
      const hintTimers = [];
      for (let i = 1; i < 5; i++) {
        hintTimers.push(setTimeout(() => {
          if (!active.has(threadID)) return;
          const cur = active.get(threadID);
          cur.hintIdx = i + 1;
          api.sendMessage(`💡 تلميح ${i+1}/5:\n${data.hints[i]}\n\n⭐ نقاط هاد المرحلة: ${REWARDS[i]} نجمة`, threadID, () => {}, botMsgID);
        }, HINT_INTERVAL * i));
      }

      const timeout = setTimeout(() => {
        for (const t of hintTimers) clearTimeout(t);
        active.delete(threadID);
        global.NeroBot.onReply.delete(botMsgID);
        api.sendMessage(`⌛ سال الوقت! الشخصية كانت: 🔑 ${displayAnswer(data.answer)}`, threadID, () => {}, botMsgID);
      }, TIMEOUT_MS);

      pending.delete(threadID);
      active.set(threadID, { ...data, hintIdx: 1, timeout, hintTimers, botMsgID });
      global.NeroBot.onReply.set(botMsgID, {
        commandName: "من_أنا", author: senderID, messageID: botMsgID, threadID,
      });
      console.log(`[MANANA] Character registered: "${data.answer}" | Cat: ${data.category}`);
    });

    api.setMessageReaction("✅", messageID, () => {}, true);
  },

  onReply: async function ({ api, event, usersData, Reply }) {
    const { threadID, senderID, body, messageID } = event;
    const data = active.get(threadID);
    if (!data) return;
    const ans = (body || "").trim();
    if (!ans) return;

    if (!isCorrect(ans, data.answer)) {
      return api.setMessageReaction("❌", messageID, () => {}, true);
    }

    clearTimeout(data.timeout);
    for (const t of data.hintTimers) clearTimeout(t);
    active.delete(threadID);
    Reply.delete();

    const reward = REWARDS[Math.min((data.hintIdx || 1) - 1, REWARDS.length - 1)];
    try { await usersData.addMoney(senderID, reward); } catch (e) { console.error("[MANANA] addMoney:", e.message); }
    let name = "صاحبنا"; try { name = (await usersData.get(senderID, "name")) || name; } catch(e){}
    let stars = 0; try { stars = (await usersData.get(senderID, "money")) || reward; } catch(e){}

    api.setMessageReaction("✅", messageID, () => {}, true);
    api.sendMessage(
      `🎉 برافو ${name}!\n\n✅ الجواب: ${displayAnswer(data.answer)}\n⭐ ربحتي ${reward} نجمة! (تلميح ${data.hintIdx}/5)\n💫 المجموع: ${stars}`,
      threadID, () => {}, data.botMsgID
    );
  },
};
