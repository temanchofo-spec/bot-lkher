const { GoogleGenAI } = require("@google/genai");
const { readJSONSync, writeJSONSync, ensureFileSync } = require("fs-extra");

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "dummy",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const STOPWORDS = new Set([
  "في","من","الى","على","عن","مع","هو","هي","ال","و","او","ثم",
  "كان","كانت","هذا","هذه","ذلك","تلك","بن","ابن","ابو","ام",
  "the","a","an","of","in","on","at","to","for"
]);

function normalizeAnswer(text) {
  return String(text || "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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

function allowedDistance(c) {
  if (c.length <= 3) return 0;
  if (c.length <= 5) return 1;
  if (c.length <= 9) return 2;
  return 3;
}

function checkSingle(u, c) {
  if (!u || !c) return false;
  if (u === c) return true;
  if (c.length >= 4 && (u.includes(c) || c.includes(u))) return true;
  if (levenshtein(u, c) <= allowedDistance(c)) return true;
  return false;
}

function splitAlternatives(text) {
  return String(text || "").split(/\s*\|\s*/).map(s => s.trim()).filter(Boolean);
}

function isCorrect(userAnswer, correctAnswer) {
  const u = normalizeAnswer(userAnswer);
  const cRaw = normalizeAnswer(correctAnswer);
  const alts = splitAlternatives(cRaw);
  for (const alt of alts) {
    if (checkSingle(u, alt)) return true;
    const words = alt.split(/\s+/).filter(w => w.length >= 5 && !STOPWORDS.has(w));
    if (words.length >= 2) {
      for (const w of words) if (checkSingle(u, w)) return true;
    }
  }
  return false;
}

function displayAnswer(correctAnswer) {
  return splitAlternatives(correctAnswer)[0] || String(correctAnswer || "").trim();
}

function makeHistoryStore(filePath, max, label) {
  const set = new Set();
  const queue = [];
  function key(s) { return String(s || "").replace(/\s+/g, " ").trim().toLowerCase(); }
  try {
    ensureFileSync(filePath);
    const data = readJSONSync(filePath, { throws: false }) || [];
    for (const q of data.slice(-max)) { const k = key(q); if (!set.has(k)) { set.add(k); queue.push(k); } }
    console.log(`[${label}] Loaded ${set.size} items from history.`);
  } catch (e) {
    console.error(`[${label}] Load error:`, e.message);
  }
  function save() {
    try { writeJSONSync(filePath, queue.slice(-max)); }
    catch (e) { console.error(`[${label}] Save error:`, e.message); }
  }
  return {
    has: (s) => set.has(key(s)),
    add: (s) => {
      const k = key(s);
      if (set.has(k)) return;
      set.add(k); queue.push(k);
      if (queue.length > max) { const old = queue.shift(); set.delete(old); }
      save();
    },
    recent: (n) => queue.slice(-n),
    size: () => set.size,
  };
}

module.exports = {
  ai,
  normalizeAnswer,
  isCorrect,
  displayAnswer,
  splitAlternatives,
  makeHistoryStore,
};
