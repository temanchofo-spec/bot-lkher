const path = require("path");
const { ai, isCorrect, displayAnswer, makeHistoryStore } = require("../utils/gameHelpers");
const { isGamesEnabled, QUEEN_ID } = require("../utils/queenOrders");

function isPrivilegedSender(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  return (global.NeroBot?.config?.adminBot || []).map(String).includes(u);
}

const HIST = makeHistoryStore(path.join(__dirname, "tmp", "loghz_history.json"), 5000, "LOGHZ");

const active = new Map();
const pending = new Set();

const REWARD = 60;
const TIMEOUT_MS = 35000;
const HINT_AT = 18000;

const CATEGORIES = [
  "ألغاز كلاسيكية عربية", "ألغاز شعبية مغربية", "ألغاز عن الطبيعة",
  "ألغاز عن الحيوانات", "ألغاز عن الطيور", "ألغاز عن الأشياء اليومية",
  "ألغاز عن أعضاء الجسم", "ألغاز عن الزمن والوقت", "ألغاز عن الطعام والشراب",
  "ألغاز عن المهن", "ألغاز عن الأرقام", "ألغاز منطقية",
  "ألغاز ذكاء", "ألغاز عن الفواكه والخضروات", "ألغاز عن البحر",
  "ألغاز عن السماء والكواكب", "ألغاز عن الأدوات المنزلية", "ألغاز جغرافية",
  "ألغاز عن الحروف والكلمات", "ألغاز عن الموسيقى والآلات",
  "ألغاز عن النباتات والأشجار", "ألغاز عن الطقس", "ألغاز عن الألوان",
  "ألغاز رياضية بسيطة", "ألغاز شعبية مشرقية", "ألغاز عن وسائل النقل",
];

async function genRiddle() {
  let tries = 0;
  while (tries < 5) {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const avoid = HIST.recent(30);
    const avoidNote = avoid.length
      ? `\n\nألغاز محظورة (لا تكررها):\n${avoid.map((q,i)=>`${i+1}. ${q}`).join("\n")}`
      : "";
    const prompt = `اعطني لغزاً عربياً قصيراً (سطر أو سطرين فقط) من نوع "${cat}". اللغز يكون ذكي وواضح وله جواب محدد كلمة أو كلمتين.

في سطر الجواب: اكتب كل الإجابات المقبولة مفصولة بـ | (مثلاً للغز "ما الذي يعطي ولا يأخذ؟" الجواب: الشمس | شمس | الشمس فالسماء). أعطِ على الأقل صيغتين مقبولتين.

الشكل بالضبط:
اللغز: [نص اللغز]
الجواب: [إجابة1] | [إجابة2]

فقط هذان السطران ولا شيء آخر.${avoidNote}`;

    try {
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 600 },
      });
      const raw = (res.text || "").trim();
      const qm = raw.match(/اللغز\s*:\s*(.+)/);
      const am = raw.match(/الجواب\s*:\s*(.+)/);
      if (!qm || !am) {
        console.log(`[LOGHZ] Bad format (try ${tries+1}): ${raw.slice(0,100)}`);
        tries++; continue;
      }
      const question = qm[1].trim();
      const answer = am[1].trim();
      if (HIST.has(question)) {
        console.log(`[LOGHZ] Duplicate (try ${tries+1}): ${question}`);
        tries++; continue;
      }
      HIST.add(question);
      console.log(`[LOGHZ] Total stored: ${HIST.size()}`);
      return { question, answer, category: cat };
    } catch (e) {
      console.log(`[LOGHZ] Gen error (try ${tries+1}): ${e.message}`);
      tries++;
    }
  }
  throw new Error("فشل توليد لغز بعد 5 محاولات");
}

module.exports = {
  config: {
    name: "لغز",
    aliases: ["riddle", "loghz", "loghza"],
    version: "1.0",
    author: "Nero",
    role: 0,
    shortDescription: "لعبة الألغاز",
    longDescription: "نيرو يطرح لغز ذكي وأول واحد يجاوب يربح نجوم ⭐",
    category: "game",
    guide: "{p}لغز",
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, senderID } = event;

    if (!isPrivilegedSender(senderID) && !isGamesEnabled()) return;

    if (active.has(threadID) || pending.has(threadID)) {
      return api.sendMessage("⏳ كاين لغز دازي — جاوب عليه أول!", threadID, () => {}, messageID);
    }

    pending.add(threadID);
    api.setMessageReaction("⏳", messageID, () => {}, true);

    let data;
    try { data = await genRiddle(); }
    catch (e) {
      pending.delete(threadID);
      console.error("[LOGHZ] error:", e.message);
      return api.sendMessage("غلطة صغيرة، عاود من بعد 😅", threadID, () => {}, messageID);
    }

    const text = `🧩 لغز (${data.category}):\n\n${data.question}\n\n⭐ أول واحد يجاوب صحيح يربح ${REWARD} نجمة!\n(عندكم 35 ثانية ⏱️)`;

    api.sendMessage(text, threadID, (err, info) => {
      if (err || !info?.messageID) {
        pending.delete(threadID);
        console.error("[LOGHZ] sendMessage error:", err);
        return;
      }
      const botMsgID = info.messageID;

      const hintTimer = setTimeout(() => {
        if (!active.has(threadID)) return;
        const a = data.answer.split(/\s*\|\s*/)[0].trim();
        const firstChar = a.charAt(0) || "؟";
        api.sendMessage(`💡 تلميح: الجواب يبدا بـ "${firstChar}" وعدد حروفو ${a.replace(/\s/g,"").length}`, threadID, () => {}, botMsgID);
      }, HINT_AT);

      const timeout = setTimeout(() => {
        active.delete(threadID);
        global.NeroBot.onReply.delete(botMsgID);
        api.sendMessage(`⌛ سال الوقت! الجواب الصحيح: 🔑 ${displayAnswer(data.answer)}`, threadID, () => {}, botMsgID);
      }, TIMEOUT_MS);

      pending.delete(threadID);
      active.set(threadID, { ...data, timeout, hintTimer, botMsgID });
      global.NeroBot.onReply.set(botMsgID, {
        commandName: "لغز", author: senderID, messageID: botMsgID, threadID,
      });
      console.log(`[LOGHZ] Riddle registered: "${data.question}" | Ans: "${data.answer}"`);
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
    clearTimeout(data.hintTimer);
    active.delete(threadID);
    Reply.delete();

    try { await usersData.addMoney(senderID, REWARD); } catch (e) { console.error("[LOGHZ] addMoney:", e.message); }
    let name = "صاحبنا"; try { name = (await usersData.get(senderID, "name")) || name; } catch(e){}
    let stars = 0; try { stars = (await usersData.get(senderID, "money")) || REWARD; } catch(e){}

    api.setMessageReaction("✅", messageID, () => {}, true);
    api.sendMessage(
      `🎉 برافو ${name}!\n\n✅ الجواب: ${displayAnswer(data.answer)}\n⭐ ربحتي ${REWARD} نجمة!\n💫 المجموع: ${stars}`,
      threadID, () => {}, data.botMsgID
    );
  },
};
