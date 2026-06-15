const fs = require("fs-extra");
const path = require("path");
const { QUEEN_ID, isQueen, isThreadSilent } = require("../utils/queenOrders");

const DATA_FILE = path.join(__dirname, "tmp", "warnings.json");
const SETTINGS_FILE = path.join(__dirname, "tmp", "ehtiram_settings.json");

const MAX_WARNINGS = 3;
const RESET_AFTER_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 5000;

let state = {};
let settings = { enabled: true, whitelist: [] };
const lastWarnTime = new Map();

function load() {
  try {
    fs.ensureFileSync(DATA_FILE);
    state = fs.readJSONSync(DATA_FILE, { throws: false }) || {};
  } catch (e) { state = {}; }
  try {
    fs.ensureFileSync(SETTINGS_FILE);
    settings = fs.readJSONSync(SETTINGS_FILE, { throws: false }) || { enabled: true, whitelist: [] };
    if (!Array.isArray(settings.whitelist)) settings.whitelist = [];
    if (typeof settings.enabled !== "boolean") settings.enabled = true;
  } catch (e) { settings = { enabled: true, whitelist: [] }; }
  console.log(`[EHTIRAM] Loaded — enabled: ${settings.enabled}, whitelist: ${settings.whitelist.length}`);
}

function save() {
  try { fs.writeJSONSync(DATA_FILE, state); } catch (e) { console.error("[EHTIRAM] save state:", e.message); }
}
function saveSettings() {
  try { fs.writeJSONSync(SETTINGS_FILE, settings); } catch (e) { console.error("[EHTIRAM] save settings:", e.message); }
}

load();

function normalize(text) {
  return String(text || "")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ؤئ]/g, "ء")
    .replace(/[^\u0600-\u06FF\sa-zA-Z0-9]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const BAD_PATTERNS = [
  "نيك", "نايك", "ينيك", "نيكا", "نيكامك", "نيكوك", "fuck",
  "قحب", "كحب", "شرموط", "شرموت", "زرموط",
  "زمل", "زامل", "زواملي", "خنيت",
  "قواد", "قوادة", "قحبه",
  "زبي", "زب ", "زبر", "صبي ال",
  "طبون", "تبون", "tabon",
  "مك ال", "مكنتك", "ختك ال", "ميمتك ال", "خوك ال",
  "حمار", "بهيم", "كلب", "خنزير", "حلوف",
  "عرص", "عرس ا", "معرص",
  "مزيوني", "تافه", "غبي", "بليد",
  "حشاك", "تفو", "خرا",
  "putain", "merde", "salop", "connard", "batard",
  "shit", "bitch", "dick", "asshole", "bastard"
];

const BOT_TRIGGERS = ["نيرو", "nero", "البوت", "bot"];

function containsBadWord(text) {
  const t = " " + normalize(text) + " ";
  for (const pat of BAD_PATTERNS) {
    const p = normalize(pat);
    if (!p) continue;
    if (t.includes(" " + p + " ") || t.includes(" " + p) || t.includes(p + " ")) return pat;
    if (p.length >= 4 && t.includes(p)) return pat;
  }
  return null;
}

function targetsBot(text) {
  const t = normalize(text);
  return BOT_TRIGGERS.some(b => t.includes(normalize(b)));
}

function getEntry(threadID, userID) {
  if (!state[threadID]) state[threadID] = {};
  if (!state[threadID][userID]) state[threadID][userID] = { count: 0, lastWarn: 0 };
  return state[threadID][userID];
}

function isWhitelisted(userID) {
  return settings.whitelist.includes(String(userID));
}

module.exports = {
  config: {
    name: "احترام",
    aliases: ["ehtiram", "respect", "warn"],
    version: "1.0",
    author: "Nero",
    role: 0,
    shortDescription: "نظام الاحترام التلقائي",
    longDescription: "البوت كيحذر اللي قل الاحترام، وملي يوصل 3 تحذيرات كيطردو. الادمن يقدر يتحكم بالنظام.",
    category: "moderation",
    guide: "{p}احترام on/off — تشغيل/إيقاف\n{p}احترام list — لائحة التحذيرات\n{p}احترام clear (رد) — مسح تحذيرات عضو\n{p}احترام skip (رد) — استثناء عضو\n{p}احترام unskip (رد) — رجوع عضو للنظام",
  },

  onStart: async function ({ api, event, args, threadData, role, usersData }) {
    const { threadID, messageID, senderID } = event;
    const isAdmin = role >= 1 ||
      (threadData?.adminIDs || []).some(a => (a.id || a) === senderID);

    if (!isAdmin) {
      return api.sendMessage("راك ماشي ادمن باش تتحكم فهاد النظام 🚫", threadID, () => {}, messageID);
    }

    const sub = (args[0] || "").toLowerCase();

    if (sub === "on") {
      settings.enabled = true; saveSettings();
      return api.sendMessage("✅ نظام الاحترام مشتغل دابا. غادي نحذر اللي قل الاحترام و7من 3 تحذيرات كنطردو.", threadID, () => {}, messageID);
    }
    if (sub === "off") {
      settings.enabled = false; saveSettings();
      return api.sendMessage("⛔ نظام الاحترام واقف دابا.", threadID, () => {}, messageID);
    }

    if (sub === "list") {
      const t = state[threadID] || {};
      const entries = Object.entries(t).filter(([_, v]) => v.count > 0);
      if (!entries.length) {
        return api.sendMessage("🌸 ماكاينش حتى تحذير فهاد المجموعة. كاع لمحترمين 👌", threadID, () => {}, messageID);
      }
      const lines = ["📋 لائحة التحذيرات:\n"];
      for (const [uid, data] of entries) {
        let name = uid; try { name = (await usersData.get(uid, "name")) || uid; } catch(e){}
        lines.push(`• ${name}: ${data.count}/${MAX_WARNINGS} تحذيرات`);
      }
      return api.sendMessage(lines.join("\n"), threadID, () => {}, messageID);
    }

    if (sub === "clear") {
      if (!event.messageReply) {
        return api.sendMessage("رد على رسالة العضو اللي بغيت تمسح تحذيراتو ↩️", threadID, () => {}, messageID);
      }
      const tid = event.messageReply.senderID;
      if (state[threadID]?.[tid]) {
        delete state[threadID][tid]; save();
      }
      let name = "العضو"; try { name = (await usersData.get(tid, "name")) || name; } catch(e){}
      return api.sendMessage(`✅ تحذيرات ${name} تمسحات.`, threadID, () => {}, messageID);
    }

    if (sub === "skip") {
      if (!event.messageReply) {
        return api.sendMessage("رد على رسالة العضو اللي بغيت تستثنيه ↩️", threadID, () => {}, messageID);
      }
      const tid = String(event.messageReply.senderID);
      if (!settings.whitelist.includes(tid)) settings.whitelist.push(tid);
      saveSettings();
      let name = "العضو"; try { name = (await usersData.get(tid, "name")) || name; } catch(e){}
      return api.sendMessage(`✅ ${name} ولا مستثنى من نظام الاحترام.`, threadID, () => {}, messageID);
    }

    if (sub === "unskip") {
      if (!event.messageReply) {
        return api.sendMessage("رد على رسالة العضو ↩️", threadID, () => {}, messageID);
      }
      const tid = String(event.messageReply.senderID);
      settings.whitelist = settings.whitelist.filter(x => x !== tid);
      saveSettings();
      let name = "العضو"; try { name = (await usersData.get(tid, "name")) || name; } catch(e){}
      return api.sendMessage(`↩️ ${name} رجع للنظام.`, threadID, () => {}, messageID);
    }

    return api.sendMessage(
      `📋 نظام الاحترام:\n\n• الحالة: ${settings.enabled ? "✅ مشتغل" : "⛔ واقف"}\n• الحد الأقصى: ${MAX_WARNINGS} تحذيرات قبل الطرد\n• إعادة الضبط: بعد 24 ساعة بلا تحذير\n• المستثنيين: ${settings.whitelist.length}\n\n📝 الأوامر:\n/احترام on — تشغيل\n/احترام off — إيقاف\n/احترام list — لائحة التحذيرات\n/احترام clear (رد) — مسح تحذيرات عضو\n/احترام skip (رد) — استثناء عضو\n/احترام unskip (رد) — رجوع للنظام`,
      threadID, () => {}, messageID
    );
  },

  onChat: async function ({ api, event, usersData, threadData }) {
    if (!settings.enabled) return;
    if (!event.isGroup) return;
    const { threadID, senderID, body, messageID, messageReply } = event;
    if (!body || typeof body !== "string") return;

    const botID = api.getCurrentUserID();
    if (senderID === botID) return;
    if (isQueen(senderID)) return;
    if (isWhitelisted(senderID)) return;
    if (isThreadSilent(threadID)) return;

    const cooldownKey = `${threadID}:${senderID}`;
    const now = Date.now();
    const last = lastWarnTime.get(cooldownKey) || 0;
    if (now - last < COOLDOWN_MS) return;

    const adminIDs = (threadData?.adminIDs || []).map(a => String(a.id || a));
    const senderIsAdmin = adminIDs.includes(String(senderID));
    if (senderIsAdmin) return;

    const isReplyToBot = messageReply && String(messageReply.senderID) === String(botID);
    const mentionsBot = targetsBot(body);
    if (!isReplyToBot && !mentionsBot) return;

    const matched = containsBadWord(body);
    if (!matched) return;

    return async function () {
      lastWarnTime.set(cooldownKey, now);

      const entry = getEntry(threadID, senderID);
      if (entry.lastWarn && (now - entry.lastWarn) > RESET_AFTER_MS) {
        entry.count = 0;
      }
      entry.count += 1;
      entry.lastWarn = now;
      save();

      let name = "صاحبنا"; try { name = (await usersData.get(senderID, "name")) || name; } catch(e){}

      if (entry.count >= MAX_WARNINGS) {
        const finalMsg = `⛔ ${name}، وصلتي ${MAX_WARNINGS} تحذيرات!\nقلة احترام معايا ما كنقبلهاش 🚪\n\nأي ادمن إلا بغا يرجعك يقدر يكتب /back فالرد على رسالتك.`;
        api.sendMessage(finalMsg, threadID, async () => {
          try {
            await api.removeUserFromGroup(senderID, threadID);
            console.log(`[EHTIRAM] Kicked ${senderID} from ${threadID} after ${MAX_WARNINGS} warnings.`);
            entry.count = 0;
            entry.lastKick = now;
            save();
          } catch (err) {
            console.error("[EHTIRAM] Kick failed:", err?.message || err);
            api.sendMessage("⚠️ ما قدرتش نطردو — البوت خاصو يكون ادمن فالمجموعة.", threadID);
          }
        }, messageID);
      } else {
        const warnText = `⚠️ ${name}، تحذير ${entry.count}/${MAX_WARNINGS}!\n🤖 احترمني آنا أوخويا، وإلا فـ ${MAX_WARNINGS} تحذيرات غادي تخرج من المجموعة 🚪`;
        api.sendMessage(warnText, threadID, () => {}, messageID);
      }
    };
  },
};
