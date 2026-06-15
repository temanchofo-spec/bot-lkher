const { GoogleGenAI } = require("@google/genai");
const { readJSONSync, writeJSONSync, ensureFileSync } = require("fs-extra");
const path = require("path");

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "dummy",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const { isGamesEnabled, QUEEN_ID } = require("../utils/queenOrders");

function isPrivilegedSender(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  return (global.NeroBot?.config?.adminBot || []).map(String).includes(u);
}

const activeQuestions = new Map();
const pendingThreads = new Set();
const REWARD = 50;
const TIMEOUT_MS = 20000;

const HISTORY_FILE = path.join(__dirname, "tmp", "soal_history.json");
const MAX_ASKED_HISTORY = 5000;
const askedSet = new Set();
const askedQueue = [];

function loadHistory() {
  try {
    ensureFileSync(HISTORY_FILE);
    const data = readJSONSync(HISTORY_FILE, { throws: false }) || [];
    for (const q of data.slice(-MAX_ASKED_HISTORY)) {
      askedSet.add(q);
      askedQueue.push(q);
    }
    console.log(`[SOAL] Loaded ${askedSet.size} questions from history.`);
  } catch (e) {
    console.error("[SOAL] Failed to load history:", e.message);
  }
}

function saveHistory() {
  try {
    writeJSONSync(HISTORY_FILE, askedQueue.slice(-MAX_ASKED_HISTORY));
  } catch (e) {
    console.error("[SOAL] Failed to save history:", e.message);
  }
}

function normalizeQ(q) {
  return q.replace(/\s+/g, " ").trim().toLowerCase();
}

function wasAsked(question) {
  return askedSet.has(normalizeQ(question));
}

function markAsked(question) {
  const key = normalizeQ(question);
  if (askedSet.has(key)) return;
  askedSet.add(key);
  askedQueue.push(key);
  if (askedQueue.length > MAX_ASKED_HISTORY) {
    const old = askedQueue.shift();
    askedSet.delete(old);
  }
  saveHistory();
}

function getRecentAsked(n = 50) {
  return askedQueue.slice(-n);
}

loadHistory();

const ARABIC_NUMS = {
  "صفر": "0", "واحد": "1", "واحده": "1", "اثنين": "2", "اثنان": "2", "اتنين": "2",
  "ثلاثة": "3", "ثلاثه": "3", "تلاتة": "3", "تلاته": "3",
  "أربعة": "4", "اربعة": "4", "أربعه": "4", "اربعه": "4", "ربعة": "4",
  "خمسة": "5", "خمسه": "5", "خمس": "5",
  "ستة": "6", "سته": "6", "ست": "6",
  "سبعة": "7", "سبعه": "7", "سبع": "7",
  "ثمانية": "8", "ثمانيه": "8", "تمانية": "8", "ثماني": "8",
  "تسعة": "9", "تسعه": "9", "تسع": "9",
  "عشرة": "10", "عشره": "10", "عشر": "10",
  "عشرين": "20", "ثلاثين": "30", "أربعين": "40", "خمسين": "50",
  "ستين": "60", "سبعين": "70", "ثمانين": "80", "تسعين": "90",
  "مية": "100", "مئة": "100", "مائة": "100", "ميه": "100",
};

const DIGIT_TO_ARABIC = Object.fromEntries(
  Object.entries(ARABIC_NUMS).map(([word, digit]) => [digit, word])
);

function toNumeric(text) {
  const lower = text.trim().toLowerCase();
  if (ARABIC_NUMS[lower]) return ARABIC_NUMS[lower];
  return lower;
}

function normalizeAnswer(text) {
  let t = text
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return toNumeric(t);
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function allowedDistance(correct) {
  const len = correct.length;
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  return 3;
}

const STOPWORDS = new Set([
  "في", "من", "الى", "على", "عن", "مع", "هو", "هي", "ال", "و", "او", "ثم",
  "كان", "كانت", "هذا", "هذه", "ذلك", "تلك", "بن", "ابن", "ابو", "ام",
  "the", "a", "an", "of", "in", "on", "at", "to", "for"
]);

function checkSingle(u, c) {
  if (!u || !c) return false;
  if (u === c) return true;
  if (c.length >= 4 && (u.includes(c) || c.includes(u))) return true;
  if (toNumeric(u) === toNumeric(c)) return true;
  if (levenshtein(u, c) <= allowedDistance(c)) return true;
  return false;
}

const ALT_SEPARATOR = /\s*\|\s*/;

function splitAlternatives(text) {
  return text.split(ALT_SEPARATOR).map(s => s.trim()).filter(Boolean);
}

function displayAnswer(correctAnswer) {
  return splitAlternatives(correctAnswer)[0] || correctAnswer.trim();
}

function isCorrect(userAnswer, correctAnswer) {
  const u = normalizeAnswer(userAnswer);
  const cRaw = normalizeAnswer(correctAnswer);

  const alternatives = splitAlternatives(cRaw);

  for (const alt of alternatives) {
    if (checkSingle(u, alt)) return true;

    const altWords = alt.split(/\s+/).filter(w => w.length >= 5 && !STOPWORDS.has(w));
    if (altWords.length >= 2) {
      for (const w of altWords) {
        if (checkSingle(u, w)) return true;
      }
    }
  }

  return false;
}

const MATH_CATS = new Set(["حساب", "ضرب وقسمة", "نسب مئوية"]);

const CATEGORIES = [
  // جغرافيا
  "عواصم دول العالم", "جغرافيا أوروبا", "جغرافيا إفريقيا", "جغرافيا آسيا",
  "جغرافيا الأمريكتين", "أطول أنهار العالم", "أعلى قمم الجبال", "بحار ومحيطات",
  // تاريخ
  "تاريخ العالم", "تاريخ الإسلام", "حضارات قديمة", "حروب تاريخية",
  "اختراعات وامتشافات", "شخصيات تاريخية", "إمبراطوريات عظيمة",
  // علوم
  "فيزياء عامة", "كيمياء عامة", "علم الأحياء", "علم الفلك", "علم الأرض",
  "طب وصحة", "تكنولوجيا وحاسوب", "رياضيات عامة",
  // المغرب والعالم العربي
  "المغرب - تاريخ وجغرافيا", "المغرب - ثقافة وأشخاص", "العالم العربي",
  "مدن مغربية", "شخصيات مغربية",
  // رياضة
  "كرة القدم العالمية", "كرة القدم المغربية", "رياضات أولمبية",
  "أبطال ورياضيون", "كأس العالم",
  // ثقافة وفنون
  "أدب عربي وعالمي", "سينما وتلفزيون", "موسيقى وفن",
  "فلسفة وحكمة", "أمثال شعبية", "ديانات وعقائد",
  // طبيعة وحياة
  "حيوانات ونباتات", "طبيعة وبيئة", "طبخ ومأكولات",
  "لغة عربية", "اقتصاد وأعمال", "سياسة دولية",
  // رياضيات محلية (توليد مباشر)
  "حساب", "ضرب وقسمة", "نسب مئوية",
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMathQuestion(cat) {
  if (cat === "ضرب وقسمة") {
    const type = Math.random() < 0.5 ? "ضرب" : "قسمة";
    if (type === "ضرب") {
      const a = rand(2, 12), b = rand(2, 99);
      return { question: `كمن تساوي: ${a} × ${b}`, answer: String(a * b), category: cat };
    } else {
      const b = rand(2, 12), result = rand(2, 50);
      return { question: `كمن تساوي: ${b * result} ÷ ${b}`, answer: String(result), category: cat };
    }
  }
  if (cat === "نسب مئوية") {
    const pct = [10, 20, 25, 50, 75][rand(0, 4)];
    const base = rand(2, 20) * 10;
    const answer = (pct * base) / 100;
    return { question: `شحال هو ${pct}٪ من ${base}؟`, answer: String(answer), category: cat };
  }
  // حساب — جمع أو طرح
  const op = Math.random() < 0.5 ? "+" : "-";
  if (op === "+") {
    const a = rand(10, 999), b = rand(10, 999);
    return { question: `كمن تساوي: ${a} + ${b}`, answer: String(a + b), category: cat };
  } else {
    const a = rand(50, 999), b = rand(10, a - 1);
    return { question: `كمن تساوي: ${a} - ${b}`, answer: String(a - b), category: cat };
  }
}

async function askGeminiQuestion(cat, avoidList) {
  const avoidNote = avoidList.length > 0
    ? `\n\nأسئلة محظورة (لا تكررها):\n${avoidList.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n`
    : "";

  const prompt = `اعطني سؤالاً قصيراً (أقل من 10 كلمات) من موضوع "${cat}". السؤال واضح وغير مكرر.

في سطر الجواب: اكتب كل الإجابات المقبولة مفصولة بـ | (مثلاً: للسؤال "من رسم الموناليزا؟" الجواب: ليوناردو دافنشي | دافنشي | ليوناردو دا فينشي). أعطِ على الأقل 2-3 صيغ مقبولة عند الإمكان (الاسم الكامل، اللقب وحده، التسمية الشائعة).

الشكل:
السؤال: [السؤال]
الجواب: [إجابة1] | [إجابة2] | [إجابة3]

فقط هذان السطران.${avoidNote}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 800 },
  });

  const raw = response.text?.trim() || "";
  console.log("[SOAL] Gemini raw:", raw);

  const qMatch = raw.match(/السؤال\s*:\s*(.+)/);
  const aMatch = raw.match(/الجواب\s*:\s*(.+)/);
  if (!qMatch || !aMatch) throw new Error("Bad response format: " + raw);

  return { question: qMatch[1].trim(), answer: aMatch[1].trim(), category: cat };
}

async function generateQuestion() {
  const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  if (MATH_CATS.has(cat)) {
    let q, tries = 0;
    do { q = generateMathQuestion(cat); tries++; }
    while (wasAsked(q.question) && tries < 10);
    markAsked(q.question);
    return q;
  }

  let result = null;
  let tries = 0;
  const MAX_TRIES = 5;

  while (tries < MAX_TRIES) {
    const avoidList = getRecentAsked(20);
    try {
      const candidate = await askGeminiQuestion(cat, avoidList);
      if (!wasAsked(candidate.question)) {
        result = candidate;
        break;
      }
      console.log(`[SOAL] Duplicate (try ${tries + 1}): "${candidate.question}" — retrying...`);
    } catch (e) {
      console.log(`[SOAL] Format error (try ${tries + 1}): ${e.message} — retrying...`);
    }
    tries++;
  }

  if (!result) throw new Error("فشل توليد سؤال بعد " + MAX_TRIES + " محاولات");

  markAsked(result.question);
  console.log(`[SOAL] Total asked so far: ${askedSet.size}`);
  return result;
}

module.exports = {
  config: {
    name: "سؤال",
    aliases: ["soal", "quiz", "trivia"],
    version: "1.0",
    author: "NERO",
    role: 0,
    shortDescription: "لعبة أسئلة",
    longDescription: "البوت يعطي سؤال وأول واحد يجاوب صحيح يربح نجوم ⭐",
    category: "game",
    guide: "{p}سؤال",
  },

  onStart: async function ({ api, event, usersData }) {
    const { threadID, messageID, senderID } = event;

    if (!isPrivilegedSender(senderID) && !isGamesEnabled()) return;

    if (activeQuestions.has(threadID) || pendingThreads.has(threadID)) {
      return api.sendMessage(
        "⏳ كاين سؤال دازي — جاوب عليه أول!",
        threadID,
        () => {},
        messageID
      );
    }

    pendingThreads.add(threadID);
    api.setMessageReaction("⏳", messageID, () => {}, true);

    let qData;
    try {
      qData = await generateQuestion();
    } catch (e) {
      pendingThreads.delete(threadID);
      console.error("[SOAL] Gemini error:", e.message);
      return api.sendMessage(
        "غلطة صغيرة، جرب مرة أخرى 😅",
        threadID,
        () => {},
        messageID
      );
    }

    const { question, answer, category } = qData;
    const questionText = `🎯 سؤال (${category}):\n\n${question}\n\n⭐ أول واحد يجاوب صحيح يربح ${REWARD} نجمة!\n(عندكم 20 ثانية ⏱️)`;

    api.sendMessage(questionText, threadID, (err, info) => {
      if (err || !info?.messageID) {
        pendingThreads.delete(threadID);
        console.error("[SOAL] sendMessage error:", err);
        return;
      }

      const botMsgID = info.messageID;

      const timeout = setTimeout(async () => {
        activeQuestions.delete(threadID);
        global.NeroBot.onReply.delete(botMsgID);
        api.sendMessage(
          `⌛ انتهى الوقت! الجواب الصحيح كان: 🔑 ${displayAnswer(answer)}`,
          threadID,
          () => {},
          botMsgID
        );
      }, TIMEOUT_MS);

      pendingThreads.delete(threadID);
      activeQuestions.set(threadID, { question, answer, timeout, botMsgID });

      global.NeroBot.onReply.set(botMsgID, {
        commandName: "سؤال",
        author: senderID,
        messageID: botMsgID,
        threadID,
      });

      console.log(`[SOAL] Question registered for thread ${threadID}: "${question}" | Answer: "${answer}"`);
    });

    api.setMessageReaction("✅", messageID, () => {}, true);
  },

  onReply: async function ({ api, event, usersData, Reply }) {
    const { threadID, senderID, body, messageID } = event;

    const qData = activeQuestions.get(threadID);
    if (!qData) return;

    const userAnswer = (body || "").trim();
    if (!userAnswer) return;

    if (!isCorrect(userAnswer, qData.answer)) {
      return api.setMessageReaction("❌", messageID, () => {}, true);
    }

    clearTimeout(qData.timeout);
    activeQuestions.delete(threadID);
    Reply.delete();

    try {
      await usersData.addMoney(senderID, REWARD);
    } catch (e) {
      console.error("[SOAL] addMoney error:", e.message);
    }

    let winnerName = "صاحبنا";
    try {
      winnerName = await usersData.get(senderID, "name") || "صاحبنا";
    } catch (e) {}

    let totalStars = 0;
    try {
      totalStars = await usersData.get(senderID, "money") || REWARD;
    } catch (e) {}

    api.setMessageReaction("✅", messageID, () => {}, true);
    api.sendMessage(
      `🎉 برافو ${winnerName}!\n\n✅ الجواب الصحيح: ${displayAnswer(qData.answer)}\n⭐ ربحتي ${REWARD} نجمة!\n💫 مجموع نجومك: ${totalStars}`,
      threadID,
      () => {},
      qData.botMsgID
    );
  },
};
